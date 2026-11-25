import type {
  ProjectId,
  ProjectSettingsOverrides,
  ServerSettings,
  ServerSettingsPatch,
} from "@t3tools/contracts";

export function trailProjectSettingsPatch(
  settings: ServerSettings,
  projectId: ProjectId,
  patch: Partial<ProjectSettingsOverrides>,
): ServerSettingsPatch {
  const current = settings.projectSettingsOverrides[projectId] ?? {};
  return {
    projectSettingsOverrides: {
      [projectId]: { ...current, ...patch },
    },
  };
}
