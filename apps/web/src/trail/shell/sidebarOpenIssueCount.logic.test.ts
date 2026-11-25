import type { EnvironmentId, IssueListEntry, IssueListResult } from "@t3tools/contracts";
import { describe, expect, it } from "vitest";

import {
  countOpenIssuesFromListAnswers,
  formatSidebarIssueCount,
} from "./sidebarOpenIssueCount.logic";

const env = "env-1" as EnvironmentId;

const entry = (key: string): IssueListEntry =>
  ({
    key,
    host: "github.com",
    scope: "acme/app",
    tracker: "github",
    projectId: "proj-1",
    title: key,
    labels: [],
    updatedAt: "2020-01-01T00:00:00.000Z",
  }) as IssueListEntry;

const answer = (overrides: Partial<IssueListResult> = {}): IssueListResult =>
  ({
    viewers: {},
    trackers: [],
    entries: [],
    errors: [],
    nextCursors: {},
    ...overrides,
  }) as IssueListResult;

describe("countOpenIssuesFromListAnswers", () => {
  it("dedupes the same issue across environments", () => {
    const shared = entry("42");
    const result = countOpenIssuesFromListAnswers([
      [env, answer({ entries: [shared] })],
      ["env-2" as EnvironmentId, answer({ entries: [shared] })],
    ]);
    expect(result).toEqual({ count: 1, hasMore: false });
  });

  it("marks hasMore when a scope still has a cursor", () => {
    const result = countOpenIssuesFromListAnswers([
      [env, answer({ entries: [entry("1")], nextCursors: { "github.com acme/app": "c1" } })],
    ]);
    expect(result).toEqual({ count: 1, hasMore: true });
  });
});

describe("formatSidebarIssueCount", () => {
  it("hides zero", () => {
    expect(formatSidebarIssueCount(0, false)).toBeNull();
  });

  it("shows an exact count", () => {
    expect(formatSidebarIssueCount(3, false)).toBe("3");
  });

  it("shows a plus when the list is truncated", () => {
    expect(formatSidebarIssueCount(12, true)).toBe("12+");
    expect(formatSidebarIssueCount(120, true)).toBe("99+");
  });
});