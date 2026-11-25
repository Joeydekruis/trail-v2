import { scopeProjectRef } from "@t3tools/client-runtime/environment";
import type { EnvironmentIssueEntry } from "@t3tools/client-runtime/issue-list";
import type { EnvironmentId, ProjectId } from "@t3tools/contracts";
import { useEffect, useEffectEvent, useRef } from "react";

import { useThreadShellsForProjectRefs } from "~/state/entities";

import {
  inProgressIssueForThread,
  isTrailBoardAutopilotThreadActive,
  isTrailBoardAutopilotTurnComplete,
  threadAutopilotKey,
} from "./trailBoardAutopilotContinue.logic";
import { issueEntryIdentityKey, rowStillInProgress } from "./trailBoardQueue.logic";
import type { TrailIssueWorkActions } from "./useTrailIssueWork";

export function useTrailBoardAutopilotContinue({
  enabled,
  environmentId,
  projectId,
  rows,
  markForReview,
}: {
  readonly enabled: boolean;
  readonly environmentId: EnvironmentId | null;
  readonly projectId: ProjectId | null;
  readonly rows: readonly EnvironmentIssueEntry[];
  readonly markForReview: TrailIssueWorkActions["markForReview"];
}) {
  const projectRef =
    environmentId !== null && projectId !== null ? scopeProjectRef(environmentId, projectId) : null;
  const threads = useThreadShellsForProjectRefs(projectRef ? [projectRef] : []);
  const wasActiveRef = useRef(new Map<string, boolean>());
  const inFlightRef = useRef(new Set<string>());

  const onTurnComplete = useEffectEvent((entry: EnvironmentIssueEntry) => {
    const dedupe = issueEntryIdentityKey(entry);
    if (inFlightRef.current.has(dedupe)) return;
    inFlightRef.current.add(dedupe);
    void markForReview(entry).finally(() => {
      inFlightRef.current.delete(dedupe);
    });
  });

  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- chains Todo when a linked thread finishes a turn under board autopilot
  useEffect(() => {
    if (!enabled || projectRef === null) return;

    for (const thread of threads) {
      const key = threadAutopilotKey(thread);
      const active = isTrailBoardAutopilotThreadActive(thread);
      const wasActive = wasActiveRef.current.get(key) ?? false;
      wasActiveRef.current.set(key, active);

      if (!wasActive || active) continue;
      if (!isTrailBoardAutopilotTurnComplete(thread)) continue;

      const entry = inProgressIssueForThread(rows, thread);
      if (entry === null || !rowStillInProgress(rows, entry)) continue;
      onTurnComplete(entry);
    }
  }, [enabled, projectRef, rows, threads]);
}
