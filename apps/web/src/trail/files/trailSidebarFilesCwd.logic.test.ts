import { describe, expect, it } from "vitest";

import { resolveTrailSidebarFilesCwd } from "./trailSidebarFilesCwd.logic";

describe("resolveTrailSidebarFilesCwd", () => {
  it("prefers the thread worktree over the project root", () => {
    expect(
      resolveTrailSidebarFilesCwd({
        worktreePath: "/wt/task",
        projectWorkspaceRoot: "/repo",
      }),
    ).toBe("/wt/task");
  });

  it("falls back to the project workspace root", () => {
    expect(
      resolveTrailSidebarFilesCwd({
        worktreePath: null,
        projectWorkspaceRoot: "/Users/me/repo",
      }),
    ).toBe("/Users/me/repo");
  });

  it("returns null when neither path exists", () => {
    expect(
      resolveTrailSidebarFilesCwd({
        worktreePath: null,
        projectWorkspaceRoot: undefined,
      }),
    ).toBeNull();
  });
});
