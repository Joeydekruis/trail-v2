import { issueEntryKey } from "@t3tools/client-runtime/state/issues";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { BotIcon, Columns3Icon } from "lucide-react";
import { T, useGT } from "gt-react";
import { useState, type ReactNode } from "react";

import type { IssuesSearch } from "~/components/issue/IssuesPage";
import type { EnvironmentIssueEntry } from "@t3tools/client-runtime/issue-list";
import { IssueGlyph } from "~/components/issue/issuePresentation";
import {
  anyIssueHasStatusLabel,
  BOARD_COLUMN_IDS,
  type BoardColumnId,
  filterIssuesByLabelNames,
  groupIssuesByBoardColumn,
} from "~/trail/board/boardColumns.logic";
import { TrailIssueDrawer, type TrailIssueSelection } from "~/trail/board/TrailIssueDrawer";
import { TrailBoardCard } from "~/trail/board/TrailBoardCard";
import { TrailKanbanCard } from "~/trail/board/TrailKanbanCard";
import { TrailKanbanColumn } from "~/trail/board/TrailKanbanColumn";
import { isBoardColumnId } from "~/trail/board/trailKanbanDnd.logic";
import {
  trailIssueSelectionFromSearch,
  trailSelectedIssueEntry,
} from "~/trail/board/trailIssueSelection.logic";
import type { TrailIssueWork } from "~/trail/board/useTrailIssueWork";

type IssueEntry = EnvironmentIssueEntry;

function boardColumnTitle(gt: ReturnType<typeof useGT>, columnId: BoardColumnId): string {
  switch (columnId) {
    case "backlog":
      return gt("Backlog", { $context: "kanban column" });
    case "todo":
      return gt("Todo", { $context: "kanban column" });
    case "in-progress":
      return gt("In progress", { $context: "kanban column" });
    case "review":
      return gt("Review", { $context: "kanban column" });
    case "done":
      return gt("Done", { $context: "kanban column" });
  }
}

const clearedSelection = {
  selectedEnvironmentId: undefined,
  selectedProjectId: undefined,
  selectedHost: undefined,
  tracker: undefined,
  scope: undefined,
  key: undefined,
} as const;

export function IssuesKanbanPanel({
  rows,
  search,
  updateSearch,
  work,
  autopilotEnabled,
  emptyState,
}: {
  readonly rows: readonly IssueEntry[];
  readonly search: IssuesSearch;
  readonly updateSearch: (patch: Partial<IssuesSearch>) => void;
  readonly work: TrailIssueWork;
  readonly autopilotEnabled: boolean;
  readonly emptyState: ReactNode;
}) {
  const gt = useGT();
  const filteredRows = filterIssuesByLabelNames(rows, search.label ?? []);
  const columns = groupIssuesByBoardColumn(filteredRows);
  const hasStatusLabels = anyIssueHasStatusLabel(rows);

  const selection: TrailIssueSelection | null = trailIssueSelectionFromSearch(search);
  const selectedEntry = trailSelectedIssueEntry(rows, selection);

  const selectEntry = (entry: IssueEntry) => {
    updateSearch({
      selectedEnvironmentId: entry.environmentId,
      selectedProjectId: entry.projectId,
      selectedHost: entry.host,
      tracker: entry.tracker,
      scope: entry.scope,
      key: entry.key,
    });
  };

  const resolveDraggedEntry = (activeId: string): IssueEntry | null => {
    const hit = filteredRows.find(
      (row) => `${row.environmentId}:${issueEntryKey(row)}` === activeId,
    );
    return hit ?? null;
  };

  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const activeDragEntry = activeDragId === null ? null : resolveDraggedEntry(activeDragId);

  const onDragStart = (event: DragStartEvent) => {
    setActiveDragId(String(event.active.id));
  };

  const onDragEnd = (event: DragEndEvent) => {
    setActiveDragId(null);
    const { active, over } = event;
    if (!over) return;
    const overId = String(over.id);
    if (!isBoardColumnId(overId)) return;
    const entry = resolveDraggedEntry(String(active.id));
    if (entry === null) return;
    void work.moveToColumn(entry, overId);
  };

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  if (rows.length === 0) {
    return <>{emptyState}</>;
  }

  if (filteredRows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-center text-sm text-muted-foreground">
        <Columns3Icon className="size-8 opacity-40" />
        <T>No issues under these filters.</T>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {!hasStatusLabels ? (
        <div className="shrink-0 rounded-lg border border-border/60 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          <T>
            No status:* labels yet. Every issue sits in Backlog until you add status:todo,
            status:in-progress, status:review, or status:done.
          </T>
        </div>
      ) : null}
      <DndContext
        sensors={sensors}
        onDragStart={onDragStart}
        onDragCancel={() => setActiveDragId(null)}
        onDragEnd={onDragEnd}
      >
        <div className="flex min-h-0 flex-1 gap-3 overflow-x-auto overflow-y-hidden pb-2">
          {BOARD_COLUMN_IDS.map((columnId) => {
            const cards = columns[columnId];
            const title = boardColumnTitle(gt, columnId);
            return (
              <TrailKanbanColumn key={columnId} columnId={columnId}>
                <section
                  className="flex min-h-0 min-w-60 flex-1 flex-col gap-2 rounded-lg bg-muted/30 p-2"
                  aria-label={title}
                >
                  <header className="flex shrink-0 items-center justify-between gap-2 px-1 pt-0.5">
                    <h2 className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                      {title}
                      {columnId === "todo" && autopilotEnabled ? (
                        <BotIcon aria-hidden className="size-3 text-muted-foreground" />
                      ) : null}
                    </h2>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {cards.length}
                    </span>
                  </header>
                  <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
                    {cards.map((entry) => {
                      const selected =
                        selection !== null &&
                        entry.environmentId === selection.environmentId &&
                        entry.projectId === selection.projectId &&
                        entry.tracker === selection.tracker &&
                        entry.scope === selection.scope &&
                        entry.key === selection.key;
                      return (
                        <TrailKanbanCard
                          key={`${entry.environmentId}:${issueEntryKey(entry)}`}
                          entry={entry}
                          selected={selected}
                          onSelect={selectEntry}
                        />
                      );
                    })}
                  </div>
                </section>
              </TrailKanbanColumn>
            );
          })}
        </div>
        <DragOverlay dropAnimation={null}>
          {activeDragEntry ? (
            <div className="w-[min(100%,16rem)] cursor-grabbing shadow-lg">
              <TrailBoardCard entry={activeDragEntry} selected={false} onSelect={() => {}} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
      <TrailIssueDrawer
        open={selection !== null}
        listEntry={selectedEntry}
        work={{
          startIssueWork: work.startIssueWork,
          markForReview: work.markForReview,
          moveToColumn: work.moveToColumn,
        }}
        onOpenChange={(open) => {
          if (!open) updateSearch(clearedSelection);
        }}
        selection={selection}
      />
    </div>
  );
}

export function IssuesKanbanEmptyTrackers() {
  return (
    <div className="flex flex-col items-center gap-2 py-12 text-center text-sm text-muted-foreground">
      <span className="text-muted-foreground opacity-40">
        <IssueGlyph.issue className="size-8" />
      </span>
      <T>No trackers to read.</T>
    </div>
  );
}
