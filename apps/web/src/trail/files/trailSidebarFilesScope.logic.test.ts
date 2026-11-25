import { describe, expect, it } from "vitest";

import { resolveTrailFilesScope } from "./trailSidebarFilesScope.logic";

describe("resolveTrailFilesScope", () => {
  it("labels a thread worktree with its branch", () => {
    expect(
      resolveTrailFilesScope({
        cwd: "/wt/feature",
        worktreePath: "/wt/feature",
        branch: "feature/ui",
        projectName: "dockyard",
      }),
    ).toEqual({
      mode: "worktree",
      headline: "feature/ui",
      pathLabel: "/wt/feature",
    });
  });

  it("falls back to project root when the thread has no worktree", () => {
    expect(
      resolveTrailFilesScope({
        cwd: "/repo",
        worktreePath: null,
        branch: null,
        projectName: "dockyard",
      }),
    ).toEqual({
      mode: "project",
      headline: "dockyard",
      pathLabel: "/repo",
    });
  });
});
