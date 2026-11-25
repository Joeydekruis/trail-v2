import type { EnvironmentId, ProjectId } from "@t3tools/contracts";

import { useEnvironments } from "~/state/environments";
import { serverEnvironment } from "~/state/server";
import { useAtomCommand } from "~/state/use-atom-command";

import { resolveTrailBoardAutopilotEnabled } from "./trailBoardAutopilot.logic";
import { trailProjectSettingsPatch } from "./trailPersistProjectSetting";

export function useTrailBoardAutopilot(
  environmentId: EnvironmentId | null,
  projectId: ProjectId | null,
) {
  const { environments } = useEnvironments();
  const persist = useAtomCommand(serverEnvironment.updateSettings, { reportFailure: true });

  const environment =
    environmentId === null
      ? undefined
      : environments.find((entry) => entry.environmentId === environmentId);
  const settings = environment?.serverConfig?.settings;
  const enabled =
    settings !== undefined && projectId !== null
      ? resolveTrailBoardAutopilotEnabled(settings, projectId)
      : false;

  const setEnabled = (next: boolean) => {
    if (environmentId === null || projectId === null || settings === undefined) return;
    void persist({
      environmentId,
      input: {
        patch: trailProjectSettingsPatch(settings, projectId, {
          trailBoardAutopilotEnabled: next,
        }),
      },
    });
  };

  return {
    enabled,
    setEnabled,
    canPersist: settings !== undefined,
  };
}
