import { issueEntryKey } from "@t3tools/client-runtime/state/issues";
import type { EnvironmentId, IssueListResult } from "@t3tools/contracts";

export function countOpenIssuesFromListAnswers(
  answers: ReadonlyArray<readonly [EnvironmentId, IssueListResult]>,
): { readonly count: number; readonly hasMore: boolean } {
  const keys = new Set<string>();
  let hasMore = false;
  for (const [, result] of answers) {
    for (const entry of result.entries) {
      keys.add(issueEntryKey(entry));
    }
    if (Object.keys(result.nextCursors).length > 0) {
      hasMore = true;
    }
  }
  return { count: keys.size, hasMore };
}

/** `null` when nothing should be shown beside the Issues nav item. */
export function formatSidebarIssueCount(count: number, hasMore: boolean): string | null {
  if (count <= 0) {
    return null;
  }
  if (hasMore && count >= 99) {
    return "99+";
  }
  if (hasMore) {
    return `${count}+`;
  }
  return String(count);
}