import { useDroppable } from "@dnd-kit/core";
import type { ReactNode } from "react";

import type { BoardColumnId } from "./boardColumns.logic";

export function TrailKanbanColumn({
  columnId,
  children,
}: {
  readonly columnId: BoardColumnId;
  readonly children: ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: columnId });
  return (
    <div
      ref={setNodeRef}
      className={
        isOver
          ? "flex min-h-0 min-w-60 flex-1 flex-col ring-1 ring-ring/40 rounded-lg"
          : "flex min-h-0 min-w-60 flex-1 flex-col"
      }
    >
      {children}
    </div>
  );
}
