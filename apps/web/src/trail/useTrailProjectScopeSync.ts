import { selectProjectGroupingSettings } from "@t3tools/client-runtime/state/project-grouping";
import { useEffect } from "react";

import { useSidebarProjectGroups } from "../hooks/useSidebarProjectGroups";
import { useClientSettings } from "../hooks/useSettings";
import { useUiStateStore } from "../uiStateStore";

import {
  resolveTrailSidebarProjectScopeKeys,
  TRAIL_STRICT_PROJECT_SCOPE,
} from "./projectScope.logic";

/** Persists a single rail scope key so the sidebar never reads as “all projects”. */
export function useTrailProjectScopeSync() {
  const projectGroups = useSidebarProjectGroups();
  const persistedKeys = useUiStateStore((store) => store.sidebarProjectScopeKeys);
  const setPersistedKeys = useUiStateStore((store) => store.setSidebarProjectScopeKeys);
  const settings = useClientSettings(selectProjectGroupingSettings);

  useEffect(() => {
    if (!TRAIL_STRICT_PROJECT_SCOPE) {
      return;
    }
    const nextKeys = [
      ...resolveTrailSidebarProjectScopeKeys({
        groups: projectGroups,
        persistedKeys,
        settings,
        canClearMissingScope: true,
      }),
    ];
    const unchanged =
      nextKeys.length === persistedKeys.length &&
      nextKeys.every((key, index) => key === persistedKeys[index]);
    if (!unchanged) {
      setPersistedKeys(nextKeys);
    }
  }, [persistedKeys, projectGroups, setPersistedKeys, settings]);
}
