import {
  destinationNeedsProject,
  destinationNeedsThread,
  fetchFeedbackContext,
  LocalTrailError,
  type FeedbackContext,
} from "./api.js";
import { clearDebugLog, debugLog, isDebugEnabled, readDebugLog } from "./debug.js";
import { defaultLocalTrailOrigin, resolveLocalTrail, setOriginOverride } from "./localTrail.js";
import { type FeedbackDestinationMode, readSettings, writeSettings } from "./storage.js";

const destinationMode = document.getElementById("destinationMode") as HTMLSelectElement;
const projectId = document.getElementById("projectId") as HTMLSelectElement;
const threadId = document.getElementById("threadId") as HTMLSelectElement;
const issuePicker = document.getElementById("issuePicker") as HTMLSelectElement;
const newIssueTitle = document.getElementById("newIssueTitle") as HTMLInputElement;
const status = document.getElementById("status") as HTMLParagraphElement;
const connection = document.getElementById("connection") as HTMLParagraphElement;

const projectRow = document.getElementById("projectRow")!;
const threadRow = document.getElementById("threadRow")!;
const issueRow = document.getElementById("issueRow")!;
const newIssueRow = document.getElementById("newIssueRow")!;
const debugEnabled = document.getElementById("debugEnabled") as HTMLInputElement;
const originOverride = document.getElementById("originOverride") as HTMLInputElement;
const debugLogEl = document.getElementById("debugLog") as HTMLPreElement;

let lastContext: FeedbackContext | null = null;

const ALL_PROJECTS = "";

async function refreshDebugPanel() {
  const enabled = await isDebugEnabled();
  debugEnabled.checked = enabled;
  document.getElementById("debugBlock")!.classList.toggle("visible", enabled);
  if (!enabled) return;
  const lines = await readDebugLog();
  debugLogEl.textContent = lines.length > 0 ? lines.join("\n") : "(nog geen logregels)";
}

function setRowVisible(row: HTMLElement, visible: boolean) {
  row.classList.toggle("visible", visible);
}

function updateDestinationRows(mode: FeedbackDestinationMode) {
  setRowVisible(
    projectRow,
    destinationNeedsProject(mode) || destinationNeedsThread(mode),
  );
  setRowVisible(threadRow, destinationNeedsThread(mode));
  setRowVisible(issueRow, mode === "issue");
  setRowVisible(newIssueRow, mode === "new_issue");
}

function fillSelect(
  select: HTMLSelectElement,
  options: ReadonlyArray<{ value: string; label: string }>,
  selected: string,
) {
  select.replaceChildren();
  for (const option of options) {
    const element = document.createElement("option");
    element.value = option.value;
    element.textContent = option.label;
    select.appendChild(element);
  }
  if (selected && options.some((option) => option.value === selected)) {
    select.value = selected;
  } else if (options[0]) {
    select.value = options[0].value;
  }
}

function applyContext(
  context: FeedbackContext,
  settings: Awaited<ReturnType<typeof readSettings>>,
) {
  lastContext = context;
  const mode = destinationMode.value as FeedbackDestinationMode;
  const projectOptions =
    mode === "thread"
      ? [{ value: ALL_PROJECTS, label: "Alle projecten" }, ...context.projects.map((p) => ({ value: p.id, label: p.title }))]
      : context.projects.map((project) => ({
          value: project.id,
          label: project.title,
        }));
  const selectedProject =
    settings.projectId ||
    context.suggestedProjectId ||
    (mode === "thread"
      ? ALL_PROJECTS
      : projectOptions.find((p) => p.value !== ALL_PROJECTS)?.value || "");
  fillSelect(projectId, projectOptions, selectedProject);

  const projectFilter = projectId.value;
  const threads = context.threads
    .filter(
      (thread) =>
        !projectFilter ||
        projectFilter === ALL_PROJECTS ||
        thread.projectId === projectFilter,
    )
    .map((thread) => ({
      value: thread.id,
      label:
        projectFilter === ALL_PROJECTS || !projectFilter
          ? `${thread.title} (${context.projects.find((p) => p.id === thread.projectId)?.title ?? thread.projectId})`
          : thread.title,
    }));
  const selectedThread =
    settings.threadId || context.suggestedThreadId || threads[0]?.value || "";
  fillSelect(threadId, threads, selectedThread);

  const issues = context.issues
    .filter((issue) => issue.projectId === projectId.value)
    .map((issue) => ({
      value: `${issue.tracker}\t${issue.scope}\t${issue.key}\t${issue.host}`,
      label: `${issue.displayKey} — ${issue.title}`,
    }));
  fillSelect(issuePicker, issues, settings.issuePickerValue);

  if (context.projects.length === 0) {
    status.textContent =
      "Geen projecten — pair in Chrome op dezelfde poort als de dev-server (zie debug-log).";
  } else if (threads.length === 0 && destinationNeedsThread(mode)) {
    status.textContent = "Geen threads in dit filter. Kies «Alle projecten» of een ander project.";
  } else if (context.suggestedThreadId && destinationMode.value === "thread") {
    status.textContent = "Voorgestelde thread op basis van de dev-poort van dit tabblad.";
  }
}

async function refreshContext() {
  try {
    const trail = await resolveLocalTrail();
    connection.textContent = `Verbonden met ${trail.serverUrl}`;
    const settings = await readSettings();
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const pageUrl = tab?.url;
    const filterProject =
      projectId.value && projectId.value !== ALL_PROJECTS ? projectId.value : undefined;
    const context = await fetchFeedbackContext({
      pageUrl: pageUrl?.startsWith("http") ? pageUrl : undefined,
      projectId: filterProject,
    });
    applyContext(context, settings);
    if (!status.textContent) status.textContent = "Lijsten bijgewerkt.";
  } catch (error) {
    connection.textContent = "";
    void debugLog(
      "refreshContext failed",
      error instanceof Error ? error.message : String(error),
    );
    status.textContent =
      error instanceof LocalTrailError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Kon Trail niet bereiken.";
  } finally {
    await refreshDebugPanel();
  }
}

void readSettings().then((settings) => {
  destinationMode.value = settings.destinationMode;
  newIssueTitle.value = settings.newIssueTitle;
  updateDestinationRows(settings.destinationMode);
  void refreshContext();
});

destinationMode.addEventListener("change", () => {
  updateDestinationRows(destinationMode.value as FeedbackDestinationMode);
});

projectId.addEventListener("change", () => {
  if (lastContext === null) return;
  void readSettings().then((settings) => {
    if (lastContext) applyContext(lastContext, settings);
  });
});

document.getElementById("openTrail")?.addEventListener("click", () => {
  void (async () => {
    const override = originOverride.value.trim();
    const url = override.length > 0 ? override : defaultLocalTrailOrigin;
    await chrome.runtime.sendMessage({ type: "trail-feedback:open-trail", url });
    status.textContent =
      "Trail-tab geopend. Sluit pairing af in Chrome, kom terug en klik Vernieuwen.";
  })();
});

document.getElementById("refresh")?.addEventListener("click", () => {
  void refreshContext();
});

debugEnabled.addEventListener("change", () => {
  void (async () => {
    await chrome.storage.local.set({ trailFeedbackDebug: debugEnabled.checked });
    if (!debugEnabled.checked) await clearDebugLog();
    await refreshDebugPanel();
  })();
});

document.getElementById("clearDebug")?.addEventListener("click", () => {
  void (async () => {
    await clearDebugLog();
    await refreshDebugPanel();
  })();
});

document.getElementById("saveOrigin")?.addEventListener("click", () => {
  void (async () => {
    const value = originOverride.value.trim();
    await setOriginOverride(value.length > 0 ? value : null);
    void debugLog(value.length > 0 ? "Origin override set" : "Origin override cleared", value);
    await refreshContext();
  })();
});

void (async () => {
  const raw = await chrome.storage.local.get("trailFeedbackOriginOverride");
  if (typeof raw.trailFeedbackOriginOverride === "string") {
    originOverride.value = raw.trailFeedbackOriginOverride;
  }
  await refreshDebugPanel();
})();

document.getElementById("save")?.addEventListener("click", () => {
  void (async () => {
    const mode = destinationMode.value as FeedbackDestinationMode;
    const storedProject =
      projectId.value === ALL_PROJECTS ? "" : projectId.value;
    await writeSettings({
      destinationMode: mode,
      projectId: storedProject,
      threadId: threadId.value,
      issuePickerValue: issuePicker.value,
      newIssueTitle: newIssueTitle.value.trim(),
    });
    status.textContent = "Opgeslagen.";
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id !== undefined) {
      await chrome.tabs.sendMessage(tab.id, { type: "trail-feedback:show-hud" }).catch(() => null);
    }
  })();
});