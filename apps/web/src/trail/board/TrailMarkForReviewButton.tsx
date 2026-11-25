import type { EnvironmentIssueEntry } from "@t3tools/client-runtime/issue-list";
import { T } from "gt-react";

import { Button } from "~/components/ui/button";

import { assignBoardColumn } from "./boardColumns.logic";
import type { TrailIssueWorkActions } from "./useTrailIssueWork";

export function TrailMarkForReviewButton({
  entry,
  markForReview,
  size = "sm",
}: {
  readonly entry: EnvironmentIssueEntry | null;
  readonly markForReview: TrailIssueWorkActions["markForReview"];
  readonly size?: "xs" | "sm";
}) {
  const eligible =
    entry !== null &&
    entry.state.category === "open" &&
    assignBoardColumn(entry.labels, entry.state) === "in-progress";

  if (!eligible) {
    return null;
  }

  return (
    <Button size={size} variant="outline" onClick={() => void markForReview(entry)}>
      <T context="move issue to review column">Mark for review</T>
    </Button>
  );
}
