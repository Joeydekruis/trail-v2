import { scopeProjectRef } from "@t3tools/client-runtime/environment";
import type { EnvironmentIssueEntry } from "@t3tools/client-runtime/issue-list";
import type { IssueRef } from "@t3tools/contracts";
import { msg } from "gt-react";
import { squashAtomCommandFailure } from "@t3tools/client-runtime/state/runtime";
import { readableFailure } from "~/components/pullRequest/pullRequestDetail.logic";
import { toastManager } from "~/components/ui/toast";
import { useNewThreadHandler } from "~/hooks/useHandleNewThread";
import { m } from "~/i18n/messages";
import { useAtomCommand } from "~/state/use-atom-command";
import { useOrchestrationCommand } from "~/state/use-orchestration-command";
import { issueEnvironment } from "~/state/issues";
import { threadEnvironment } from "~/state/threads";

import {
  assignBoardColumn,
  type BoardColumnId,
  mergeIssueLabelsForColumn,
} from "./boardColumns.logic";
import {
  hasInProgressMutex,
  pickNextOpenTodo,
  projectIssueBoardRows,
} from "./trailBoardQueue.logic";
import { buildTrailIssueStartPrompt } from "./trailIssueWorkPrompt.logic";
import { trailSendIssueDraftTurn } from "./trailSendIssueDraftTurn.logic";

export type TrailIssueWork = ReturnType<typeof useTrailIssueWork>;

export type TrailIssueWorkActions = {
  startIssueWork: (
    entry: EnvironmentIssueEntry,
    options?: { readonly body?: string | null },
  ) => Promise<void>;
  markForReview: (entry: EnvironmentIssueEntry) => Promise<void>;
  moveToColumn: (entry: EnvironmentIssueEntry, column: BoardColumnId) => Promise<void>;
};

function issueRefFromEntry(entry: EnvironmentIssueEntry): IssueRef {
  return {
    projectId: entry.projectId,
    tracker: entry.tracker,
    ...(entry.host ? { host: entry.host } : {}),
    scope: entry.scope,
    key: entry.key,
  };
}

export function useTrailIssueWork({
  rows,
  onListRefresh,
  autopilotEnabled,
}: {
  readonly rows: readonly EnvironmentIssueEntry[];
  readonly onListRefresh: () => void;
  readonly autopilotEnabled: boolean;
}) {
  const handleNewThread = useNewThreadHandler();
  const updateIssue = useAtomCommand(issueEnvironment.update, { reportFailure: false });
  const linkIssue = useAtomCommand(threadEnvironment.linkIssue, { reportFailure: false });
  const startThreadTurn = useOrchestrationCommand(threadEnvironment.startTurn, {
    reportFailure: false,
  });

  const applyColumnLabels = async (
    entry: EnvironmentIssueEntry,
    column: "todo" | "in-progress" | "review",
  ) => {
    const labels = mergeIssueLabelsForColumn(
      entry.labels.map((label) => label.name),
      column,
    );
    return updateIssue({
      environmentId: entry.environmentId,
      input: { ...issueRefFromEntry(entry), labels: [...labels] },
    });
  };

  const startIssueWork = async (
    entry: EnvironmentIssueEntry,
    options?: { readonly body?: string | null },
    mutexRows: readonly EnvironmentIssueEntry[] = rows,
  ) => {
    if (entry.state.category === "closed") return;
    const slotTaken = hasInProgressMutex(mutexRows);
    if (slotTaken) {
      const queued = await applyColumnLabels(entry, "todo");
      if (queued._tag === "Failure") {
        toastManager.add({
          type: "error",
          title: m(msg("Could not queue the issue")),
          description: readableFailure(
            squashAtomCommandFailure(queued),
            m(msg("The issue tracker refused the update.")),
          ),
        });
        return;
      }
      onListRefresh();
      toastManager.add({
        type: "info",
        title: m(msg("Queued for Todo")),
        description: m(msg("Finish or mark the in-progress issue for review first.")),
      });
      return;
    }

    const labeled = await applyColumnLabels(entry, "in-progress");
    if (labeled._tag === "Failure") {
      toastManager.add({
        type: "error",
        title: m(msg("Could not update the issue")),
        description: readableFailure(
          squashAtomCommandFailure(labeled),
          m(msg("The issue tracker refused the update.")),
        ),
      });
      return;
    }
    onListRefresh();

    const prompt = buildTrailIssueStartPrompt({
      displayKey: entry.displayKey,
      title: entry.title,
      ...(options?.body !== undefined && options?.body !== null ? { body: options.body } : {}),
    });
    const opened = await handleNewThread(scopeProjectRef(entry.environmentId, entry.projectId), {
      prompt,
      replace: false,
    });
    if (opened === null) {
      return;
    }

    const link = await linkIssue({
      environmentId: entry.environmentId,
      input: {
        threadId: opened.threadId,
        projectId: entry.projectId,
        tracker: entry.tracker,
        host: entry.host,
        scope: entry.scope,
        key: entry.key,
        url: entry.url,
        displayKey: entry.displayKey,
        title: entry.title,
        source: "manual",
      },
    });
    if (link._tag === "Failure") {
      toastManager.add({
        type: "warning",
        title: m(msg("Thread opened, but the issue link failed")),
        description: readableFailure(
          squashAtomCommandFailure(link),
          m(msg("The server refused the link.")),
        ),
      });
    }

    const projectRef = scopeProjectRef(entry.environmentId, entry.projectId);
    const sent = await trailSendIssueDraftTurn({
      projectRef,
      draftId: opened.draftId,
      threadId: opened.threadId,
      prompt,
      startThreadTurn,
    });
    if (!sent) {
      toastManager.add({
        type: "info",
        title: m(msg("Draft ready")),
        description: m(msg("The agent draft is open. Press Send if the turn did not start.")),
      });
    }
  };

  const moveToBacklog = async (entry: EnvironmentIssueEntry) => {
    const labels = mergeIssueLabelsForColumn(
      entry.labels.map((label) => label.name),
      "backlog",
    );
    const updated = await updateIssue({
      environmentId: entry.environmentId,
      input: { ...issueRefFromEntry(entry), labels: [...labels] },
    });
    if (updated._tag === "Failure") {
      toastManager.add({
        type: "error",
        title: m(msg("Could not update the issue")),
        description: readableFailure(
          squashAtomCommandFailure(updated),
          m(msg("The issue tracker refused the update.")),
        ),
      });
      return;
    }
    onListRefresh();
  };

  const markForReview = async (entry: EnvironmentIssueEntry) => {
    if (assignBoardColumn(entry.labels, entry.state) === "review") {
      return;
    }
    const result = await applyColumnLabels(entry, "review");
    if (result._tag === "Failure") {
      toastManager.add({
        type: "error",
        title: m(msg("Could not mark for review")),
        description: readableFailure(
          squashAtomCommandFailure(result),
          m(msg("The issue tracker refused the update.")),
        ),
      });
      return;
    }
    onListRefresh();

    if (!autopilotEnabled) {
      return;
    }

    const projectedRows = projectIssueBoardRows(rows, entry, "review");
    const nextTodo = pickNextOpenTodo(projectedRows);
    if (nextTodo === undefined) return;
    await startIssueWork(nextTodo, undefined, projectedRows);
  };

  const queueTodo = async (entry: EnvironmentIssueEntry) => {
    const result = await applyColumnLabels(entry, "todo");
    if (result._tag === "Failure") {
      toastManager.add({
        type: "error",
        title: m(msg("Could not move to Todo")),
        description: readableFailure(
          squashAtomCommandFailure(result),
          m(msg("The issue tracker refused the update.")),
        ),
      });
      return;
    }
    onListRefresh();
    if (autopilotEnabled && !hasInProgressMutex(rows)) {
      await startIssueWork(entry);
    }
  };

  const moveToColumn = async (entry: EnvironmentIssueEntry, column: BoardColumnId) => {
    if (column === "done") {
      toastManager.add({
        type: "info",
        title: m(msg("Close on GitHub")),
        description: m(msg("Done follows a closed issue on GitHub.")),
      });
      return;
    }
    if (column === "backlog") {
      await moveToBacklog(entry);
      return;
    }
    if (column === "todo") {
      await queueTodo(entry);
      return;
    }
    if (column === "in-progress") {
      await startIssueWork(entry);
      return;
    }
    if (column === "review") {
      await markForReview(entry);
    }
  };

  return {
    autopilotEnabled,
    startIssueWork,
    markForReview,
    queueTodo,
    moveToColumn,
  };
}
