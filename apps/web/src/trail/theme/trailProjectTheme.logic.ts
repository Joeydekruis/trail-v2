import type { ProjectId, ServerSettings } from "@t3tools/contracts";
import { resolveProjectSettings } from "@t3tools/shared/projectSettings";

export function resolveTrailProjectThemeId(
  settings: ServerSettings,
  projectId: ProjectId,
): string | null {
  const { settings: resolved } = resolveProjectSettings(settings, projectId, null);
  const themeId = resolved.trailAppearanceThemeId;
  return typeof themeId === "string" && themeId.length > 0 ? themeId : null;
}