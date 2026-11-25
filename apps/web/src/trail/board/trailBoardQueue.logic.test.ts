import type { EnvironmentIssueEntry } from "@t3tools/client-runtime/issue-list";
import { describe, expect, it } from "vite-plus/test";

import {
  hasInProgressMutex,
  pickNextOpenTodo,
  projectIssueBoardRows,
} from "./trailBoardQueue.logic";

const open = { category: "open" as const };

function row(
  key: string,
  labels: ReadonlyArray<string>,
  environmentId = "env",
): EnvironmentIssueEntry {
  return {
    environmentId,
    projectId: "proj",
    tracker: "github",
    host: "",
    scope: "o/r",
    key,
    displayKey: key,
    title: key,
    url: "",
    labels: labels.map((name) => ({ name })),
    state: open,
  } as unknown as EnvironmentIssueEntry;
}

describe("trailBoardQueue", () => {
  it("picks the next Todo using projected review state before GitHub refresh", () => {
    const first = row("1", ["status:in-progress"]);
    const second = row("2", ["status:todo"]);
    const projected = projectIssueBoardRows([first, second], first, "review");
    expect(hasInProgressMutex(projected)).toBe(false);
    expect(pickNextOpenTodo(projected)?.key).toBe("2");
  });

  it("keeps the mutex while in-progress is not released", () => {
    const first = row("1", ["status:in-progress"]);
    const second = row("2", ["status:todo"]);
    expect(hasInProgressMutex([first, second])).toBe(true);
    expect(hasInProgressMutex([first, second], first)).toBe(false);
  });
});
