import { resolveProjectSettings } from "@t3tools/shared/projectSettings";
import type { ProjectId, ServerSettings } from "@t3tools/contracts";

export function resolveTrailBoardAutopilotEnabled(
  settings: ServerSettings,
  projectId: ProjectId,
): boolean {
  return resolveProjectSettings(settings, projectId, null).settings.trailBoardAutopilotEnabled;
}
