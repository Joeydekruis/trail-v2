import { pickableProjectGroups } from "@t3tools/client-runtime/state/project-grouping";
import type { EnvironmentId, ProjectId } from "@t3tools/contracts";
import type { ProjectGroupingSettings } from "@t3tools/client-runtime/state/project-grouping";

import {
  resolveSidebarProjectScopeKeys,
  type SidebarProjectSnapshot,
} from "../sidebarProjectGrouping";

/** Trail workspaces are rail-scoped to a single project group at a time. */
export const TRAIL_STRICT_PROJECT_SCOPE = true;

export function resolveTrailSidebarProjectScopeKeys(input: {
  readonly groups: ReadonlyArray<SidebarProjectSnapshot>;
  readonly persistedKeys: ReadonlyArray<string>;
  readonly settings?: ProjectGroupingSettings;
  readonly canClearMissingScope?: boolean;
}): ReadonlyArray<string> {
  const resolved = resolveSidebarProjectScopeKeys({
    groups: input.groups,
    keys: input.persistedKeys.slice(0, 1),
    settings: input.settings,
    canClearMissingScope: input.canClearMissingScope,
  }).filter((key) => {
    const group = input.groups.find((candidate) => candidate.projectKey === key);
    return group !== undefined && !group.archived;
  });
  if (resolved.length === 1) {
    return resolved;
  }
  const fallback = pickableProjectGroups(input.groups)[0]?.projectKey;
  return fallback ? [fallback] : [];
}

export function trailScopedEnvironmentProjectKeys(
  groups: ReadonlyArray<SidebarProjectSnapshot>,
  scopeKeys: ReadonlyArray<string>,
): ReadonlySet<string> | null {
  if (scopeKeys.length === 0) {
    return null;
  }
  const scopedGroups = groups.filter((group) => scopeKeys.includes(group.projectKey));
  if (scopedGroups.length === 0) {
    return null;
  }
  return new Set(
    scopedGroups.flatMap((group) =>
      group.memberProjectRefs.map((ref) => `${ref.environmentId}:${ref.projectId}`),
    ),
  );
}

/** `hideProjects` pairs for every project outside the active workspace. */
export function trailHideProjectsOutsideScope(
  groups: ReadonlyArray<SidebarProjectSnapshot>,
  scopeKeys: ReadonlyArray<string>,
  projects: ReadonlyArray<{ readonly id: ProjectId; readonly environmentId: EnvironmentId }>,
): ReadonlyArray<readonly [EnvironmentId, ProjectId]> {
  const included = trailScopedEnvironmentProjectKeys(groups, scopeKeys);
  if (included === null || included.size === 0) {
    return [];
  }
  return projects
    .filter((project) => !included.has(`${project.environmentId}:${project.id}`))
    .map((project) => [project.environmentId, project.id] as const);
}
