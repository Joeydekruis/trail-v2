import { DEFAULT_SERVER_SETTINGS } from "@t3tools/contracts";
import { T, useGT } from "gt-react";

import { Switch } from "~/components/ui/switch";
import { SettingResetButton, SettingsRow } from "~/components/settings/settingsLayout";
import {
  useScopedSettings,
  useScopedSettingsMixed,
  useUpdateScopedSettings,
} from "~/components/settings/useScopedSettings";

export function TrailProjectBoardSettingsRow() {
  const gt = useGT();
  const settings = useScopedSettings();
  const updateSettings = useUpdateScopedSettings();
  const mixedAutopilot = useScopedSettingsMixed(["trailBoardAutopilotEnabled"]);

  return (
    <SettingsRow
      serverScoped
      settingKeys={["trailBoardAutopilotEnabled"]}
      mixed={mixedAutopilot}
      id="trail-board-autopilot"
      title={gt("Board autopilot")}
      description={
        <T>
          When a slot opens in In progress, automatically start the next Todo issue in this
          project&apos;s board.
        </T>
      }
      resetAction={
        settings.trailBoardAutopilotEnabled ? (
          <SettingResetButton
            ariaLabel={gt("Reset board autopilot to default")}
            tooltip={gt("Turn autopilot off")}
            onClick={() =>
              updateSettings({
                trailBoardAutopilotEnabled: DEFAULT_SERVER_SETTINGS.trailBoardAutopilotEnabled,
              })
            }
          />
        ) : null
      }
      control={
        <Switch
          aria-label={gt("Board autopilot")}
          mixed={mixedAutopilot}
          checked={mixedAutopilot ? false : settings.trailBoardAutopilotEnabled}
          onCheckedChange={(enabled) => updateSettings({ trailBoardAutopilotEnabled: enabled })}
        />
      }
    />
  );
}
