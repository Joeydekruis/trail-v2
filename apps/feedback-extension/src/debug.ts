const LOG_KEY = "trailFeedbackDebugLog";
const MAX_LINES = 80;

export async function isDebugEnabled(): Promise<boolean> {
  const raw = await chrome.storage.local.get("trailFeedbackDebug");
  return raw.trailFeedbackDebug === true;
}

async function appendLog(line: string): Promise<void> {
  const ts = new Date().toISOString().slice(11, 23);
  const entry = `${ts} ${line}`;
  console.info(`[Trail Feedback] ${entry}`);
  if (!(await isDebugEnabled())) return;
  const raw = await chrome.storage.local.get(LOG_KEY);
  const prev = Array.isArray(raw[LOG_KEY]) ? (raw[LOG_KEY] as string[]) : [];
  const next = [...prev, entry].slice(-MAX_LINES);
  await chrome.storage.local.set({ [LOG_KEY]: next });
}

export async function debugLog(message: string, detail?: unknown): Promise<void> {
  const suffix =
    detail === undefined
      ? ""
      : ` ${typeof detail === "string" ? detail : JSON.stringify(detail, null, 0).slice(0, 800)}`;
  await appendLog(`${message}${suffix}`);
}

export async function readDebugLog(): Promise<readonly string[]> {
  const raw = await chrome.storage.local.get(LOG_KEY);
  return Array.isArray(raw[LOG_KEY]) ? (raw[LOG_KEY] as string[]) : [];
}

export async function clearDebugLog(): Promise<void> {
  await chrome.storage.local.set({ [LOG_KEY]: [] });
}