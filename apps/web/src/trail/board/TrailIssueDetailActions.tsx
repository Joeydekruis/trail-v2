import type { EnvironmentIssueEntry } from "@t3tools/client-runtime/issue-list";

import { TrailMarkForReviewButton } from "./TrailMarkForReviewButton";
import { TrailStartTaskButton } from "./TrailStartTaskButton";
import type { TrailIssueWorkActions } from "./useTrailIssueWork";

export function TrailIssueDetailActions({
  entry,
  work,
}: {
  readonly entry: EnvironmentIssueEntry;
  readonly work: TrailIssueWorkActions;
}) {
  return (
    <>
      <TrailStartTaskButton
        size="xs"
        entry={entry}
        startIssueWork={work.startIssueWork}
      />
      <TrailMarkForReviewButton
        size="xs"
        entry={entry}
        markForReview={work.markForReview}
      />
    </>
  );
}