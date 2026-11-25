import { useNavigate } from "@tanstack/react-router";
import { useGT } from "gt-react";
import { PlusIcon, SettingsIcon } from "lucide-react";
import type { CSSProperties } from "react";

import { openCommandPalette } from "../../commandPaletteBus";
import { TrailProjectRailFavicon } from "./TrailProjectRailFavicon";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../../components/ui/tooltip";
import { useSidebarProjectGroups } from "../../hooks/useSidebarProjectGroups";
import { useLocalStorage } from "../../hooks/useLocalStorage";
import { useUiStateStore } from "../../uiStateStore";

import { useTrailProjectScopeSync } from "../useTrailProjectScopeSync";

import {
  AccentsSchema,
  resolveProjectAccent,
  TRAIL_PROJECT_ACCENTS_STORAGE_KEY,
} from "./projectAccent";

function ProjectRailSettingsButton() {
  const gt = useGT();
  const navigate = useNavigate();

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            aria-label={gt("Settings")}
            data-trail-settings-chip=""
            onClick={() => void navigate({ to: "/settings" })}
          />
        }
      >
        <SettingsIcon aria-hidden className="size-4 stroke-[1.5]" />
      </TooltipTrigger>
      <TooltipPopup side="right">{gt("Settings")}</TooltipPopup>
    </Tooltip>
  );
}

export function ProjectRail() {
  useTrailProjectScopeSync();
  const gt = useGT();
  const groups = useSidebarProjectGroups().filter((group) => !group.archived);
  const scopeKeys = useUiStateStore((store) => store.sidebarProjectScopeKeys);
  const setScopeKeys = useUiStateStore((store) => store.setSidebarProjectScopeKeys);
  const [accentOverrides] = useLocalStorage(TRAIL_PROJECT_ACCENTS_STORAGE_KEY, {}, AccentsSchema);

  const activeKey = scopeKeys.length === 1 ? scopeKeys[0]! : null;

  return (
    <nav aria-label={gt("Projects", { $context: "Trail project rail" })} data-trail-project-rail="">
      <div data-trail-project-rail-projects="">
        {groups.map((group) => {
          const accent = resolveProjectAccent(group.projectKey, accentOverrides);
          const selected = activeKey === group.projectKey;
          return (
            <Tooltip key={group.projectKey}>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    aria-label={group.displayName}
                    aria-pressed={selected}
                    data-trail-project-chip=""
                    onClick={() => setScopeKeys([group.projectKey])}
                  />
                }
              >
                {selected ? (
                  <span
                    aria-hidden
                    data-trail-project-accent-dot=""
                    style={{ "--trail-project-accent": accent } as CSSProperties}
                  />
                ) : null}
                <TrailProjectRailFavicon
                  project={{
                    environmentId: group.environmentId,
                    workspaceRoot: group.workspaceRoot,
                    title: group.title,
                    faviconPath: group.faviconPath,
                    projectIcon: group.projectIcon,
                  }}
                />
              </TooltipTrigger>
              <TooltipPopup side="right">{group.displayName}</TooltipPopup>
            </Tooltip>
          );
        })}
        <Tooltip>
          <TooltipTrigger
            render={
              <button
                type="button"
                aria-label={gt("Add project", { $context: "Trail project rail" })}
                data-trail-project-add=""
                onClick={() => openCommandPalette({ open: "add-project" })}
              />
            }
          >
            <PlusIcon aria-hidden className="size-4 stroke-[1.5]" />
          </TooltipTrigger>
          <TooltipPopup side="right">
            {gt("Add project", { $context: "Trail project rail" })}
          </TooltipPopup>
        </Tooltip>
      </div>
      <div data-trail-project-rail-footer="">
        <ProjectRailSettingsButton />
      </div>
    </nav>
  );
}
