import { Columns3Icon, ListIcon } from "lucide-react";
import { T } from "gt-react";

import { TrailSegmentedToggle, TrailSegmentedToggleItem } from "../shell/TrailSegmentedToggle";

import type { IssuesIm } from "./issuesIm.logic";

export function IssuesIssueModeToggle({
  value,
  onChange,
}: {
  readonly value: IssuesIm;
  readonly onChange: (im: IssuesIm) => void;
}) {
  return (
    <div data-trail-issues-im-toggle="">
      <TrailSegmentedToggle
        layout="fit"
        aria-label="Issues view"
        onValueChange={(values) => {
          const next = values[0];
          if (next === "list" || next === "board") {
            onChange(next);
          }
        }}
        value={[value]}
      >
        <TrailSegmentedToggleItem aria-label="List" value="list">
          <ListIcon />
          <T context="issues view mode">List</T>
        </TrailSegmentedToggleItem>
        <TrailSegmentedToggleItem aria-label="Board" value="board">
          <Columns3Icon />
          <T context="issues view mode">Board</T>
        </TrailSegmentedToggleItem>
      </TrailSegmentedToggle>
    </div>
  );
}
