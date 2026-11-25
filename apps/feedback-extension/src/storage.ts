export type FeedbackDestinationMode = "thread" | "new_thread" | "new_issue" | "issue";

export interface TrailFeedbackSettings {
  readonly destinationMode: FeedbackDestinationMode;
  readonly projectId: string;
  readonly threadId: string;
  readonly issuePickerValue: string;
  readonly newIssueTitle: string;
}

const STORAGE_KEY = "trailFeedbackSettings";

const DEFAULT_SETTINGS: TrailFeedbackSettings = {
  destinationMode: "thread",
  projectId: "",
  threadId: "",
  issuePickerValue: "",
  newIssueTitle: "",
};

function isDestinationMode(value: unknown): value is FeedbackDestinationMode {
  return (
    value === "thread" ||
    value === "new_thread" ||
    value === "new_issue" ||
    value === "issue"
  );
}

export async function readSettings(): Promise<TrailFeedbackSettings> {
  const raw = await chrome.storage.local.get(STORAGE_KEY);
  const value = raw[STORAGE_KEY];
  if (typeof value !== "object" || value === null) {
    return DEFAULT_SETTINGS;
  }
  const record = value as Partial<TrailFeedbackSettings>;
  return {
    ...DEFAULT_SETTINGS,
    destinationMode: isDestinationMode(record.destinationMode)
      ? record.destinationMode
      : DEFAULT_SETTINGS.destinationMode,
    projectId: typeof record.projectId === "string" ? record.projectId : "",
    threadId: typeof record.threadId === "string" ? record.threadId : "",
    issuePickerValue: typeof record.issuePickerValue === "string" ? record.issuePickerValue : "",
    newIssueTitle: typeof record.newIssueTitle === "string" ? record.newIssueTitle : "",
  };
}

export async function writeSettings(settings: TrailFeedbackSettings): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: settings });
}