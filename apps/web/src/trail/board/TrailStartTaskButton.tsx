import type { EnvironmentIssueEntry } from "@t3tools/client-runtime/issue-list";
import type { IssueRef } from "@t3tools/contracts";
import { T } from "gt-react";

import { Button } from "~/components/ui/button";
import { issueEnvironment } from "~/state/issues";
import { useEnvironmentQuery } from "~/state/query";

import type { TrailIssueWorkActions } from "./useTrailIssueWork";

export function TrailStartTaskButton({
  entry,
  startIssueWork,
  size = "sm",
}: {
  readonly entry: EnvironmentIssueEntry | null;
  readonly startIssueWork: TrailIssueWorkActions["startIssueWork"];
  readonly size?: "xs" | "sm";
}) {
  const open = entry !== null && entry.state.category === "open";
  const reference: IssueRef | null =
    entry === null
      ? null
      : {
          projectId: entry.projectId,
          tracker: entry.tracker,
          ...(entry.host ? { host: entry.host } : {}),
          scope: entry.scope,
          key: entry.key,
        };
  const detailQuery = useEnvironmentQuery(
    open && reference && entry
      ? issueEnvironment.detail({ environmentId: entry.environmentId, input: reference })
      : null,
  );

  return (
    <Button
      size={size}
      variant="default"
      disabled={!open}
      onClick={() => {
        if (!open || entry === null) return;
        const body = detailQuery.data?.body;
        void startIssueWork(entry, body === undefined || body === null ? {} : { body });
      }}
    >
      <T context="start agent on issue">Start task</T>
    </Button>
  );
}
