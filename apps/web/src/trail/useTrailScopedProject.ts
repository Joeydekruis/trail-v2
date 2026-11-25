import { scopedProjectKey, scopeProjectRef } from "@t3tools/client-runtime/environment";
import type { EnvironmentId, ProjectId } from "@t3tools/contracts";

import { useSidebarProjectGroups } from "~/hooks/useSidebarProjectGroups";
import { useUiStateStore } from "~/uiStateStore";

import {
  resolveTrailSidebarProjectScopeKeys,
  trailScopedEnvironmentProjectKeys,
} from "./projectScope.logic";

export function useTrailScopedProject(
  projects: ReadonlyArray<{ readonly id: ProjectId; readonly environmentId: EnvironmentId }>,
): { readonly environmentId: EnvironmentId; readonly projectId: ProjectId } | null {
  const projectGroups = useSidebarProjectGroups();
  const persistedKeys = useUiStateStore((store) => store.sidebarProjectScopeKeys);
  const scopeKeys = resolveTrailSidebarProjectScopeKeys({
    groups: projectGroups,
    persistedKeys,
    canClearMissingScope: true,
  });
  const included = trailScopedEnvironmentProjectKeys(projectGroups, scopeKeys);
  if (included === null || included.size === 0) {
    return null;
  }
  const match = projects.find((project) => included.has(`${project.environmentId}:${project.id}`));
  return match === undefined ? null : { environmentId: match.environmentId, projectId: match.id };
}

export function trailScopedProjectKey(
  ref: { readonly environmentId: EnvironmentId; readonly projectId: ProjectId } | null,
): string | null {
  return ref === null ? null : scopedProjectKey(scopeProjectRef(ref.environmentId, ref.projectId));
}
