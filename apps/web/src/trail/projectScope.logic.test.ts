import { describe, expect, it } from "vite-plus/test";

import type { SidebarProjectSnapshot } from "../sidebarProjectGrouping";

import {
  resolveTrailSidebarProjectScopeKeys,
  trailHideProjectsOutsideScope,
  trailScopedEnvironmentProjectKeys,
} from "./projectScope.logic";

const group = (
  projectKey: string,
  members: ReadonlyArray<{ environmentId: string; projectId: string }>,
): SidebarProjectSnapshot =>
  ({
    projectKey,
    archived: false,
    memberProjectRefs: members.map((member) => ({
      environmentId: member.environmentId,
      projectId: member.projectId,
    })),
    memberProjects: members,
  }) as SidebarProjectSnapshot;

describe("trail project scope", () => {
  const groups = [
    group("acme", [{ environmentId: "env-a", projectId: "p1" }]),
    group("beta", [{ environmentId: "env-a", projectId: "p2" }]),
  ];

  it("falls back to the first pickable project when nothing is selected", () => {
    expect(resolveTrailSidebarProjectScopeKeys({ groups, persistedKeys: [] })).toEqual(["acme"]);
  });

  it("keeps a single resolved scope key", () => {
    expect(
      resolveTrailSidebarProjectScopeKeys({
        groups,
        persistedKeys: ["beta", "acme"],
      }),
    ).toEqual(["beta"]);
  });

  it("hides issues outside the active workspace", () => {
    const hidden = trailHideProjectsOutsideScope(
      groups,
      ["acme"],
      [
        { environmentId: "env-a" as never, id: "p1" as never },
        { environmentId: "env-a" as never, id: "p2" as never },
      ],
    );
    expect(hidden).toEqual([["env-a", "p2"]]);
    expect(trailScopedEnvironmentProjectKeys(groups, ["acme"])).toEqual(new Set(["env-a:p1"]));
  });
});
