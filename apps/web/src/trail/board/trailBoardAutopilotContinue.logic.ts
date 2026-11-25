import type { EnvironmentIssueEntry } from "@t3tools/client-runtime/issue-list";
import type { EnvironmentThreadShell } from "@t3tools/client-runtime/state/models";
import { threadIssueKeysEqual } from "@t3tools/contracts";

import { assignBoardColumn } from "./boardColumns.logic";

const RUNNING_THREAD_STATUSES = new Set(["preparing", "queued", "starting", "running", "waiting"]);

export function isTrailBoardAutopilotThreadActive(thread: EnvironmentThreadShell): boolean {
  const status = thread.runtime?.status ?? thread.source.status;
  return RUNNING_THREAD_STATUSES.has(status);
}

export function isTrailBoardAutopilotTurnComplete(thread: EnvironmentThreadShell): boolean {
  if (isTrailBoardAutopilotThreadActive(thread)) return false;
  if (thread.hasPendingApprovals || thread.hasPendingUserInput) return false;
  return thread.latestRun?.status === "completed";
}

export function inProgressIssueForThread(
  rows: readonly EnvironmentIssueEntry[],
  thread: EnvironmentThreadShell,
): EnvironmentIssueEntry | null {
  const links = thread.issues ?? [];
  if (links.length === 0) return null;
  for (const link of links) {
    if (link.projectId !== thread.projectId) continue;
    const entry = rows.find(
      (row) =>
        row.environmentId === thread.environmentId &&
        threadIssueKeysEqual(row, link) &&
        row.state.category === "open" &&
        assignBoardColumn(row.labels, row.state) === "in-progress",
    );
    if (entry !== undefined) return entry;
  }
  return null;
}

export function threadAutopilotKey(thread: EnvironmentThreadShell): string {
  return `${thread.environmentId}:${thread.id}`;
}
