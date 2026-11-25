import { issueEntryKey } from "@t3tools/client-runtime/state/issues";
import type { EnvironmentIssueEntry } from "@t3tools/client-runtime/issue-list";
import type { IssueTrackerKind } from "@t3tools/contracts";

import type { IssuesSearch } from "~/components/issue/IssuesPage";

import type { TrailIssueSelection } from "./TrailIssueDrawer";

export function trailIssueSelectionFromSearch(search: IssuesSearch): TrailIssueSelection | null {
  if (
    !search.tracker ||
    !search.scope ||
    !search.key ||
    !search.selectedProjectId ||
    !search.selectedEnvironmentId
  ) {
    return null;
  }
  return {
    environmentId: search.selectedEnvironmentId,
    projectId: search.selectedProjectId,
    tracker: search.tracker as IssueTrackerKind,
    host: search.selectedHost ?? search.host ?? "",
    scope: search.scope,
    key: search.key,
  };
}

export function trailSelectedIssueEntry(
  rows: readonly EnvironmentIssueEntry[],
  selection: TrailIssueSelection | null,
): EnvironmentIssueEntry | null {
  if (selection === null) return null;
  return (
    rows.find(
      (row) =>
        row.environmentId === selection.environmentId &&
        issueEntryKey(row) ===
          issueEntryKey({
            projectId: selection.projectId,
            host: selection.host || row.host,
            scope: selection.scope,
            key: selection.key,
          }),
    ) ?? null
  );
}
