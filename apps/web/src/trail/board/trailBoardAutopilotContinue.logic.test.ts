import type { EnvironmentIssueEntry } from "@t3tools/client-runtime/issue-list";
import type { EnvironmentThreadShell } from "@t3tools/client-runtime/state/models";
import { RunId } from "@t3tools/contracts";
import { describe, expect, it } from "vite-plus/test";

import {
  inProgressIssueForThread,
  isTrailBoardAutopilotThreadActive,
  isTrailBoardAutopilotTurnComplete,
} from "./trailBoardAutopilotContinue.logic";

const open = { category: "open" as const };

function issueRow(): EnvironmentIssueEntry {
  return {
    environmentId: "env",
    projectId: "proj",
    tracker: "github",
    host: "",
    scope: "o/r",
    key: "42",
    displayKey: "#42",
    title: "Task",
    url: "",
    labels: [{ name: "status:in-progress" }],
    state: open,
  } as unknown as EnvironmentIssueEntry;
}

function threadShell(
  overrides: Partial<EnvironmentThreadShell> & Pick<EnvironmentThreadShell, "source">,
): EnvironmentThreadShell {
  return {
    environmentId: "env",
    id: "thread-1",
    projectId: "proj",
    title: "Thread",
    providerInstanceId: "prov",
    modelSelection: null,
    runtimeMode: "default",
    interactionMode: "default",
    branch: null,
    worktreePath: null,
    lineage: { sideChat: false },
    forkedFrom: null,
    linkOrigin: null,
    delegatedFrom: null,
    activeProviderThreadId: null,
    latestRun: {
      runId: RunId.make("run-1"),
      status: "completed",
      completedAt: null,
      startedAt: null,
    },
    runtime: { status: "idle" } as EnvironmentThreadShell["runtime"],
    latestUserMessageAt: null,
    hasPendingApprovals: false,
    hasPendingUserInput: false,
    pendingBackgroundTasks: [],
    providerInstanceHistory: [],
    goal: null,
    itemCount: 0,
    visibleItemCount: 0,
    createdAt: "",
    updatedAt: "",
    archivedAt: null,
    settledOverride: null,
    settledAt: null,
    unsettledAt: null,
    snoozedUntil: null,
    snoozedAt: null,
    pinnedAt: null,
    pinOrderKey: null,
    activeOrderKey: null,
    pullRequests: [],
    issues: [
      {
        projectId: "proj",
        tracker: "github",
        host: "",
        scope: "o/r",
        key: "42",
        url: "",
        displayKey: "#42",
        title: "Task",
        source: "manual",
      },
    ],
    deletedAt: null,
    ...overrides,
  } as EnvironmentThreadShell;
}

describe("trailBoardAutopilotContinue", () => {
  it("matches a linked in-progress issue on the thread", () => {
    const entry = issueRow();
    const thread = threadShell({ source: { status: "idle" } as EnvironmentThreadShell["source"] });
    expect(inProgressIssueForThread([entry], thread)?.key).toBe("42");
  });

  it("treats a completed idle run as turn complete", () => {
    const thread = threadShell({
      source: { status: "idle" } as EnvironmentThreadShell["source"],
      runtime: { status: "idle" } as EnvironmentThreadShell["runtime"],
      latestRun: {
        runId: "00000000-0000-4000-8000-000000000001",
        status: "completed",
        completedAt: null,
        startedAt: null,
      } as EnvironmentThreadShell["latestRun"],
    });
    expect(isTrailBoardAutopilotTurnComplete(thread)).toBe(true);
  });

  it("treats a running thread as active for the running-to-idle handoff", () => {
    const thread = threadShell({
      source: { status: "running" } as EnvironmentThreadShell["source"],
      runtime: { status: "running" } as EnvironmentThreadShell["runtime"],
    });
    expect(isTrailBoardAutopilotThreadActive(thread)).toBe(true);
    expect(isTrailBoardAutopilotTurnComplete(thread)).toBe(false);
  });

  it("waits when the thread needs user input", () => {
    const thread = threadShell({
      source: { status: "idle" } as EnvironmentThreadShell["source"],
      hasPendingUserInput: true,
    });
    expect(isTrailBoardAutopilotTurnComplete(thread)).toBe(false);
  });
});
