import type { EnvironmentId, ProjectId } from "@t3tools/contracts";

import { useSidebarProjectGroups } from "../hooks/useSidebarProjectGroups";
import { useUiStateStore } from "../uiStateStore";

import {
  resolveTrailSidebarProjectScopeKeys,
  trailHideProjectsOutsideScope,
  TRAIL_STRICT_PROJECT_SCOPE,
} from "./projectScope.logic";

export function useTrailIssueProjectFilter(
  projects: ReadonlyArray<{ readonly id: ProjectId; readonly environmentId: EnvironmentId }>,
): ReadonlyArray<readonly [EnvironmentId, ProjectId]> | undefined {
  const projectGroups = useSidebarProjectGroups();
  const persistedKeys = useUiStateStore((store) => store.sidebarProjectScopeKeys);

  if (!TRAIL_STRICT_PROJECT_SCOPE) {
    return undefined;
  }

  const scopeKeys = resolveTrailSidebarProjectScopeKeys({
    groups: projectGroups,
    persistedKeys,
    canClearMissingScope: true,
  });
  const hidden = trailHideProjectsOutsideScope(projectGroups, scopeKeys, projects);
  return hidden.length > 0 ? hidden : undefined;
}
