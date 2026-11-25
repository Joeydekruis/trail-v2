import { debugLog } from "./debug.js";
import { LocalTrailError, resolveLocalTrail } from "./localTrail.js";
import type { FeedbackDestinationMode, TrailFeedbackSettings } from "./storage.js";
import type { PendingComment } from "./types.js";

export { LocalTrailError } from "./localTrail.js";

export interface SubmitResult {
  readonly threadId: string;
  readonly messageId: string;
  readonly createdThread?: boolean;
  readonly issue?: { readonly key: string; readonly displayKey: string; readonly url: string };
}

export interface FeedbackContext {
  readonly projects: ReadonlyArray<{ readonly id: string; readonly title: string }>;
  readonly threads: ReadonlyArray<{
    readonly id: string;
    readonly projectId: string;
    readonly title: string;
  }>;
  readonly issues: ReadonlyArray<{
    readonly projectId: string;
    readonly tracker: string;
    readonly host: string;
    readonly scope: string;
    readonly key: string;
    readonly displayKey: string;
    readonly title: string;
  }>;
  readonly suggestedThreadId: string | null;
  readonly suggestedProjectId: string | null;
}

export async function fetchFeedbackContext(input: {
  readonly pageUrl?: string;
  readonly projectId?: string;
}): Promise<FeedbackContext> {
  const { serverUrl, accessToken } = await resolveLocalTrail();
  const base = serverUrl.replace(/\/$/, "");
  const params = new URLSearchParams();
  if (input.pageUrl) params.set("pageUrl", input.pageUrl);
  if (input.projectId) params.set("projectId", input.projectId);
  const suffix = params.size > 0 ? `?${params.toString()}` : "";
  const url = `${base}/api/trail/feedback/context${suffix}`;
  void debugLog("GET context", { url, pageUrl: input.pageUrl, projectId: input.projectId });
  const response = await fetch(url, {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  const raw = await response.text();
  if (!response.ok) {
    void debugLog("Context failed", { status: response.status, body: raw.slice(0, 400) });
    const body = (() => {
      try {
        return JSON.parse(raw) as { message?: string };
      } catch {
        return null;
      }
    })();
    throw new Error(body?.message ?? `Context failed (${response.status})`);
  }
  const context = JSON.parse(raw) as FeedbackContext;
  void debugLog("Context OK", {
    projects: context.projects.length,
    threads: context.threads.length,
    issues: context.issues.length,
    suggestedThreadId: context.suggestedThreadId,
  });
  return context;
}

function buildDestination(settings: TrailFeedbackSettings) {
  const mode = settings.destinationMode;
  if (mode === "thread") {
    return { mode: "thread" as const, threadId: settings.threadId };
  }
  if (mode === "new_thread") {
    return { mode: "new_thread" as const, projectId: settings.projectId };
  }
  if (mode === "new_issue") {
    return {
      mode: "new_issue" as const,
      projectId: settings.projectId,
      title:
        settings.newIssueTitle.trim() ||
        `Preview feedback ${new Date().toISOString().slice(0, 10)}`,
    };
  }
  const [tracker, scope, key, host = ""] = settings.issuePickerValue.split("\t");
  return {
    mode: "issue" as const,
    projectId: settings.projectId,
    tracker,
    scope,
    key,
    ...(host.length > 0 ? { host } : {}),
  };
}

export function destinationNeedsProject(mode: FeedbackDestinationMode): boolean {
  return mode !== "thread";
}

export function destinationNeedsThread(mode: FeedbackDestinationMode): boolean {
  return mode === "thread";
}

export async function submitFeedbackBatch(input: {
  readonly settings: TrailFeedbackSettings;
  readonly comments: ReadonlyArray<PendingComment>;
}): Promise<SubmitResult> {
  const { serverUrl, accessToken } = await resolveLocalTrail();
  const manifest = {
    destination: buildDestination(input.settings),
    annotations: input.comments.map((comment) => ({
      id: comment.id,
      pageUrl: comment.pageUrl,
      pageTitle: comment.pageTitle,
      comment: comment.comment,
      ...(comment.element ? { element: comment.element } : {}),
      ...(comment.screenshotPart ? { screenshotPart: comment.screenshotPart } : {}),
    })),
  };

  const form = new FormData();
  form.append("manifest", JSON.stringify(manifest));
  for (const comment of input.comments) {
    if (comment.screenshotBlob && comment.screenshotPart) {
      form.append(
        "file",
        new File([comment.screenshotBlob], comment.screenshotPart, { type: "image/png" }),
      );
    }
  }

  const base = serverUrl.replace(/\/$/, "");
  const url = `${base}/api/trail/feedback/submit`;
  void debugLog("POST submit", { url, annotations: manifest.annotations.length });
  const response = await fetch(url, {
    method: "POST",
    headers: { authorization: `Bearer ${accessToken}` },
    body: form,
  });
  const raw = await response.text();
  if (!response.ok) {
    void debugLog("Submit failed", { status: response.status, body: raw.slice(0, 400) });
    const body = (() => {
      try {
        return JSON.parse(raw) as { message?: string };
      } catch {
        return null;
      }
    })();
    throw new Error(body?.message ?? `Submit failed (${response.status})`);
  }
  return JSON.parse(raw) as SubmitResult;
}