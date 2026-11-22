import { useGT } from "gt-react";
import type { CSSProperties } from "react";

import { useSidebarProjectGroups } from "../../hooks/useSidebarProjectGroups";
import { useLocalStorage } from "../../hooks/useLocalStorage";
import { cn } from "../../lib/utils";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../../components/ui/tooltip";
import { useUiStateStore } from "../../uiStateStore";

import {
  AccentsSchema,
  projectInitial,
  resolveProjectAccent,
  TRAIL_PROJECT_ACCENTS_STORAGE_KEY,
} from "./projectAccent";

export function ProjectRail() {
  const gt = useGT();
  const groups = useSidebarProjectGroups().filter((group) => !group.archived);
  const scopeKeys = useUiStateStore((store) => store.sidebarProjectScopeKeys);
  const setScopeKeys = useUiStateStore((store) => store.setSidebarProjectScopeKeys);
  const [accentOverrides] = useLocalStorage(TRAIL_PROJECT_ACCENTS_STORAGE_KEY, {}, AccentsSchema);

  const activeKey = scopeKeys.length === 1 ? scopeKeys[0]! : null;

  return (
    <nav aria-label={gt("Projects", { $context: "Trail project rail" })} data-trail-project-rail="">
      {groups.map((group) => {
        const accent = resolveProjectAccent(group.projectKey, accentOverrides);
        const selected = activeKey === group.projectKey;
        const initial = projectInitial(group.displayName);
        return (
          <Tooltip key={group.projectKey}>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  aria-label={group.displayName}
                  aria-pressed={selected}
                  className={cn(
                    "flex size-9 items-center justify-center rounded-md text-xs font-semibold outline-hidden",
                  )}
                  onClick={() => setScopeKeys([group.projectKey])}
                />
              }
            >
              <span
                aria-hidden
                data-trail-project-accent=""
                style={{ "--trail-project-accent": accent } as CSSProperties}
              />
              <span aria-hidden>{initial}</span>
            </TooltipTrigger>
            <TooltipPopup side="right">{group.displayName}</TooltipPopup>
          </Tooltip>
        );
      })}
    </nav>
  );
}
