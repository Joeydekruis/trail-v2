import type { EnvironmentId, ProjectId } from "@t3tools/contracts";
import { useEffect } from "react";

import { useSidebarProjectGroups } from "~/hooks/useSidebarProjectGroups";
import { getThemeSnapshot, refreshTheme, subscribeRenderedAppearance } from "~/hooks/useTheme";
import { useEnvironments } from "~/state/environments";
import { useUiStateStore } from "~/uiStateStore";
import {
  applyTrailProjectThemeOverlay,
  clearTrailProjectThemeOverlay,
  getTrailProjectThemeOverlay,
  resolveThemeAppearance,
} from "~/themePalette";

import { TRAIL_STRICT_PROJECT_SCOPE } from "../projectScope.logic";
import { resolveTrailProjectThemeId } from "./trailProjectTheme.logic";

function activeTrailProjectRef(
  scopeKeys: ReadonlyArray<string>,
  groups: ReturnType<typeof useSidebarProjectGroups>,
): { readonly environmentId: EnvironmentId; readonly projectId: ProjectId } | null {
  if (!TRAIL_STRICT_PROJECT_SCOPE || scopeKeys.length !== 1) return null;
  const group = groups.find((entry) => entry.projectKey === scopeKeys[0]);
  const member = group?.memberProjects[0];
  return member === undefined ? null : { environmentId: member.environmentId, projectId: member.id };
}

export function useTrailProjectThemeSync(): void {
  const groups = useSidebarProjectGroups();
  const scopeKeys = useUiStateStore((store) => store.sidebarProjectScopeKeys);
  const { environments } = useEnvironments();

  useEffect(() => {
  const sync = () => {
    const ref = activeTrailProjectRef(scopeKeys, groups);
    if (ref === null) {
      if (getTrailProjectThemeOverlay() !== null) {
        clearTrailProjectThemeOverlay();
        refreshTheme({ preservePreview: false });
      }
      return;
    }
    const environment = environments.find((entry) => entry.environmentId === ref.environmentId);
    const settings = environment?.serverConfig?.settings;
    const themeId =
      settings === undefined ? null : resolveTrailProjectThemeId(settings, ref.projectId);
    if (themeId === null) {
      if (getTrailProjectThemeOverlay() !== null) {
        clearTrailProjectThemeOverlay();
        refreshTheme({ preservePreview: false });
      }
      return;
    }
    const snapshot = getThemeSnapshot();
    const appearance = resolveThemeAppearance(
      snapshot.theme,
      snapshot.systemDark,
      snapshot.followSystem,
      snapshot.appearanceMode,
      snapshot.themeHalves,
    );
    applyTrailProjectThemeOverlay(themeId, appearance);
  };
    sync();
    return subscribeRenderedAppearance(sync);
  }, [environments, groups, scopeKeys]);
}