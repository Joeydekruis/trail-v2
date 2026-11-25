import { issueEntryKey } from "@t3tools/client-runtime/state/issues";
import type { EnvironmentIssueEntry } from "@t3tools/client-runtime/issue-list";
import { useDraggable } from "@dnd-kit/core";

import { cn } from "~/lib/utils";

import { TrailBoardCard } from "./TrailBoardCard";

export function trailKanbanCardId(entry: EnvironmentIssueEntry): string {
  return `${entry.environmentId}:${issueEntryKey(entry)}`;
}

export function TrailKanbanCard({
  entry,
  selected,
  onSelect,
}: {
  readonly entry: EnvironmentIssueEntry;
  readonly selected: boolean;
  readonly onSelect: (entry: EnvironmentIssueEntry) => void;
}) {
  const id = trailKanbanCardId(entry);
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id,
    data: { entry },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn("cursor-pointer", isDragging && "cursor-grabbing opacity-40")}
      {...listeners}
      {...attributes}
    >
      <TrailBoardCard entry={entry} selected={selected} onSelect={onSelect} />
    </div>
  );
}
