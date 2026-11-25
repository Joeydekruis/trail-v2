import { describe, expect, it } from "@effect/vitest";
import {
  ProjectId,
  ThreadId,
  type OrchestrationProjectShell,
  type OrchestrationV2ThreadShell,
} from "@t3tools/contracts";
import * as DateTime from "effect/DateTime";

import { projectIdsForPreviewPort, suggestThreadForPreviewPort } from "./portRouting.ts";

const projectId = ProjectId.make("project-1");

const baseProject = {
  id: projectId,
  title: "Trail",
  workspaceRoot: "/repo",
  defaultModelSelection: null,
  scripts: [
    {
      id: "dev",
      name: "Dev",
      command: "vp run dev",
      icon: "play" as const,
      runOnWorktreeCreate: false,
      previewUrl: "http://localhost:5733",
    },
  ],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
} satisfies OrchestrationProjectShell;

const threadShell = (
  id: ThreadId,
  updatedAt: string,
  settled: boolean,
): OrchestrationV2ThreadShell =>
  ({
    id,
    projectId,
    title: id,
    providerInstanceId: "prov",
    modelSelection: { instanceId: "prov", model: "m" },
    runtimeMode: "full-access",
    interactionMode: "default",
    branch: null,
    worktreePath: null,
    lineage: { root: true },
    forkedFrom: null,
    activeProviderThreadId: null,
    latestRunId: null,
    activeRunId: null,
    status: "idle",
    pendingRuntimeRequest: null,
    latestVisibleMessage: null,
    latestUserMessageAt: null,
    hasActionableProposedPlan: false,
    itemCount: 0,
    visibleItemCount: 0,
    createdAt: DateTime.makeUnsafe("2026-01-01T00:00:00.000Z"),
    updatedAt: DateTime.makeUnsafe(updatedAt),
    archivedAt: null,
    settledOverride: settled ? "settled" : null,
    settledAt: settled ? DateTime.makeUnsafe(updatedAt) : null,
    deletedAt: null,
  }) as unknown as OrchestrationV2ThreadShell;

describe("suggestThreadForPreviewPort", () => {
  it("picks an active unsettled thread for a project script port", () => {
    const threadA = ThreadId.make("thread-a");
    const threadB = ThreadId.make("thread-b");
    const suggestion = suggestThreadForPreviewPort({
      pageUrl: "http://127.0.0.1:5733/home",
      projects: [baseProject],
      threads: [
        threadShell(threadA, "2026-01-02T00:00:00.000Z", true),
        threadShell(threadB, "2026-01-03T00:00:00.000Z", false),
      ],
    });
    expect(suggestion?.threadId).toBe(threadB);
    expect(suggestion?.projectId).toBe(projectId);
  });

  it("maps preview script ports to projects", () => {
    const ids = projectIdsForPreviewPort([baseProject], 5733);
    expect(ids.has(projectId)).toBe(true);
  });
});