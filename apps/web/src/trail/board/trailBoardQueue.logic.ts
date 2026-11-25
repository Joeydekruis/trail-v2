import type { EnvironmentIssueEntry } from "@t3tools/client-runtime/issue-list";

import {
  assignBoardColumn,
  groupIssuesByBoardColumn,
  hasOpenInProgressIssue,
  mergeIssueLabelsForColumn,
  type BoardColumnId,
} from "./boardColumns.logic";

export function issueEntryIdentityKey(entry: {
  readonly environmentId: string;
  readonly tracker: string;
  readonly scope: string;
  readonly key: string;
}): string {
  return `${entry.environmentId}\u0000${entry.tracker}\u0000${entry.scope}\u0000${entry.key}`;
}

export function issueEntriesEqual(
  left: Pick<EnvironmentIssueEntry, "environmentId" | "tracker" | "scope" | "key">,
  right: Pick<EnvironmentIssueEntry, "environmentId" | "tracker" | "scope" | "key">,
): boolean {
  return issueEntryIdentityKey(left) === issueEntryIdentityKey(right);
}

export function issueEntryWithColumn(
  entry: EnvironmentIssueEntry,
  column: Extract<BoardColumnId, "todo" | "in-progress" | "review">,
): EnvironmentIssueEntry {
  const labelNames = mergeIssueLabelsForColumn(
    entry.labels.map((label) => label.name),
    column,
  );
  return {
    ...entry,
    labels: labelNames.map((name) => ({ name, color: null })),
  };
}

/** Rows with `moved` already in `toColumn` for mutex / queue picks before GitHub refresh. */
export function projectIssueBoardRows(
  rows: readonly EnvironmentIssueEntry[],
  moved: EnvironmentIssueEntry,
  toColumn: Extract<BoardColumnId, "todo" | "in-progress" | "review">,
): readonly EnvironmentIssueEntry[] {
  return rows.map((row) =>
    issueEntriesEqual(row, moved) ? issueEntryWithColumn(row, toColumn) : row,
  );
}

export function pickNextOpenTodo(
  rows: readonly EnvironmentIssueEntry[],
): EnvironmentIssueEntry | undefined {
  const open = rows.filter((row) => row.state.category === "open");
  return groupIssuesByBoardColumn(open).todo[0];
}

export function hasInProgressMutex(
  rows: readonly EnvironmentIssueEntry[],
  released?: EnvironmentIssueEntry,
): boolean {
  if (released === undefined) {
    return hasOpenInProgressIssue(rows);
  }
  const projected = projectIssueBoardRows(rows, released, "review");
  return hasOpenInProgressIssue(projected);
}

/** Linked in-progress issue still in the list (column may be stale until refresh). */
export function rowStillInProgress(
  rows: readonly EnvironmentIssueEntry[],
  entry: EnvironmentIssueEntry,
): boolean {
  const row = rows.find((candidate) => issueEntriesEqual(candidate, entry));
  if (row === undefined) return false;
  return (
    row.state.category === "open" && assignBoardColumn(row.labels, row.state) === "in-progress"
  );
}
