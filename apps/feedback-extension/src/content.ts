/** Content scripts are classic scripts (not ES modules); keep types local. */
interface PickedElementWire {
  readonly pageUrl: string;
  readonly pageTitle: string | null;
  readonly tagName: string;
  readonly selector: string | null;
  readonly htmlPreview: string;
  readonly componentName: string | null;
  readonly styles: string;
  readonly stack: ReadonlyArray<{
    readonly functionName: string | null;
    readonly fileName: string | null;
    readonly lineNumber: number | null;
    readonly columnNumber: number | null;
  }>;
  readonly pickedAt: string;
}

interface PendingComment {
  readonly id: string;
  readonly pageUrl: string;
  readonly pageTitle: string | null;
  readonly comment: string;
  readonly element: PickedElementWire | null;
  readonly screenshotBlob: Blob | null;
  readonly screenshotPart: string | null;
}

const HUD_ID = "trail-feedback-hud";

function syncLocalTrailSession(): void {
  if (!/^(localhost|127\.0\.0\.1)$/i.test(location.hostname)) return;
  void chrome.runtime.sendMessage({ type: "trail-feedback:sync-sessions" }).catch(() => null);
  const token = new URLSearchParams(location.hash.slice(1)).get("token");
  if (token) {
    void chrome.runtime
      .sendMessage({
        type: "trail-feedback:pairing-token",
        origin: location.origin,
        token,
      })
      .catch(() => null);
  }
}

function uniqueId(): string {
  return `fb_${crypto.randomUUID().replaceAll("-", "").slice(0, 16)}`;
}

function buildSelector(element: Element): string | null {
  if (element.id) return `#${CSS.escape(element.id)}`;
  const tag = element.tagName.toLowerCase();
  if (element.classList.length > 0) {
    return `${tag}.${Array.from(element.classList).slice(0, 3).map(CSS.escape).join(".")}`;
  }
  return tag;
}

function pickElementWire(target: Element): PickedElementWire {
  const pageUrl = location.href;
  const pageTitle = document.title || null;
  const htmlPreview = (target as HTMLElement).outerHTML?.slice(0, 4000) ?? "";
  let styles = "";
  try {
    const computed = getComputedStyle(target);
    styles = [
      `display: ${computed.display}`,
      `color: ${computed.color}`,
      `font-size: ${computed.fontSize}`,
      `padding: ${computed.padding}`,
      `margin: ${computed.margin}`,
    ].join("; ");
  } catch {
    styles = "";
  }
  return {
    pageUrl,
    pageTitle,
    tagName: target.tagName.toLowerCase(),
    selector: buildSelector(target),
    htmlPreview,
    componentName: (target as HTMLElement).dataset?.reactComponent ?? null,
    styles,
    stack: [],
    pickedAt: new Date().toISOString(),
  };
}

async function cropScreenshot(element: Element): Promise<{ blob: Blob; part: string } | null> {
  const rect = element.getBoundingClientRect();
  const dataUrl = (await chrome.runtime.sendMessage({
    type: "trail-feedback:capture-tab",
  })) as string | null;
  if (typeof dataUrl !== "string") return null;
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Screenshot decode failed"));
    img.src = dataUrl;
  });
  const dpr = window.devicePixelRatio || 1;
  const canvas = document.createElement("canvas");
  const padding = 8;
  const sx = Math.max(0, (rect.left - padding) * dpr);
  const sy = Math.max(0, (rect.top - padding) * dpr);
  const sw = Math.min(image.width - sx, (rect.width + padding * 2) * dpr);
  const sh = Math.min(image.height - sy, (rect.height + padding * 2) * dpr);
  canvas.width = Math.max(1, Math.round(sw));
  canvas.height = Math.max(1, Math.round(sh));
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(image, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((value) => resolve(value), "image/png"),
  );
  if (!blob) return null;
  const part = `${uniqueId()}.png`;
  return { blob, part };
}

function ensureHud(): HTMLElement {
  let hud = document.getElementById(HUD_ID);
  if (hud) return hud;
  hud = document.createElement("div");
  hud.id = HUD_ID;
  hud.innerHTML = `
    <button type="button" class="trail-feedback-ghost" data-action="comment">Comment</button>
    <button type="button" class="trail-feedback-primary" data-action="send">Send to Trail</button>
  `;
  document.documentElement.appendChild(hud);
  hud.querySelector('[data-action="comment"]')?.addEventListener("click", () => startPick());
  hud.querySelector('[data-action="send"]')?.addEventListener("click", () => void sendBatch());
  return hud;
}

async function sendBatch(): Promise<void> {
  const response = await chrome.runtime.sendMessage({ type: "trail-feedback:submit-current" });
  if (response?.ok) {
    alert("Sent to Trail.");
  } else {
    alert(response?.error ?? "Could not send.");
  }
}

function startPick(): void {
  const overlay = document.createElement("div");
  overlay.id = "trail-feedback-picker-overlay";
  const highlight = document.createElement("div");
  highlight.id = "trail-feedback-picker-highlight";
  highlight.hidden = true;
  document.documentElement.append(overlay, highlight);

  const move = (event: MouseEvent) => {
    const target = document.elementFromPoint(event.clientX, event.clientY);
    if (!target || target === overlay || target === highlight) {
      highlight.hidden = true;
      return;
    }
    const rect = target.getBoundingClientRect();
    highlight.hidden = false;
    highlight.style.left = `${rect.left}px`;
    highlight.style.top = `${rect.top}px`;
    highlight.style.width = `${rect.width}px`;
    highlight.style.height = `${rect.height}px`;
  };

  const cancel = () => {
    overlay.remove();
    highlight.remove();
    window.removeEventListener("keydown", onKey);
  };

  const onKey = (event: KeyboardEvent) => {
    if (event.key === "Escape") cancel();
  };

  overlay.addEventListener("mousemove", move);
  overlay.addEventListener("click", (event) => {
    const target = document.elementFromPoint(event.clientX, event.clientY);
    if (!target || target === overlay) return;
    event.preventDefault();
    event.stopPropagation();
    cancel();
    void openCommentPanel(target);
  });
  window.addEventListener("keydown", onKey);
}

async function openCommentPanel(target: Element): Promise<void> {
  const panel = document.createElement("div");
  panel.id = "trail-feedback-comment-panel";
  panel.style.left = "16px";
  panel.style.top = "16px";
  panel.innerHTML = `
    <strong>Trail comment</strong>
    <textarea placeholder="What should change?"></textarea>
    <div class="trail-feedback-actions">
      <button type="button" class="trail-feedback-ghost" data-action="cancel">Cancel</button>
      <button type="button" class="trail-feedback-primary" data-action="save">Add</button>
    </div>
  `;
  document.documentElement.appendChild(panel);
  const textarea = panel.querySelector("textarea") as HTMLTextAreaElement;
  textarea.focus();

  const close = () => panel.remove();

  panel.querySelector('[data-action="cancel"]')?.addEventListener("click", close);
  panel.querySelector('[data-action="save"]')?.addEventListener("click", () => {
    void (async () => {
      const comment = textarea.value.trim();
      if (!comment) {
        alert("Enter a comment.");
        return;
      }
      const id = uniqueId();
      const screenshot = await cropScreenshot(target).catch(() => null);
      const pending: PendingComment = {
        id,
        pageUrl: location.href,
        pageTitle: document.title || null,
        comment,
        element: pickElementWire(target),
        screenshotBlob: screenshot?.blob ?? null,
        screenshotPart: screenshot?.part ?? null,
      };
      const response = await chrome.runtime.sendMessage({
        type: "trail-feedback:queue-comment",
        comment: pending,
      });
      if (!response?.ok) {
        alert("Could not queue comment.");
        return;
      }
      close();
    })();
  });
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "trail-feedback:show-hud") {
    ensureHud();
    sendResponse({ ok: true });
  }
});

syncLocalTrailSession();