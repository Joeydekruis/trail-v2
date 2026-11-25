import { BUILT_IN_THEMES } from "@t3tools/shared/themePalettes";
import { useGT } from "gt-react";
import { useMemo } from "react";

import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "~/components/ui/select";
import { useCustomThemes } from "~/hooks/useCustomThemes";
import { useEnvironmentThemeDefinitions } from "~/hooks/useEnvironmentTheme";
import {
  SettingResetButton,
  SettingsRow,
  SETTINGS_PICKER_TRIGGER_CLASSNAME,
} from "~/components/settings/settingsLayout";
import {
  useClearProjectOverrides,
  useScopedSettings,
  useScopedSettingSource,
  useScopedSettingsMixed,
  useUpdateScopedSettings,
} from "~/components/settings/useScopedSettings";
import { useSettingsScope } from "~/components/settings/SettingsScopeContext";
import { isKnownThemePreference } from "~/themePalette";

const INHERIT_VALUE = "__inherit__";

export function TrailProjectThemeSettingsRow() {
  const gt = useGT();
  const settings = useScopedSettings();
  const updateSettings = useUpdateScopedSettings();
  const clearOverrides = useClearProjectOverrides();
  const mixed = useScopedSettingsMixed(["trailAppearanceThemeId"]);
  const source = useScopedSettingSource(["trailAppearanceThemeId"]);
  const { scope, targets } = useSettingsScope();
  const customThemes = useCustomThemes();
  const environmentThemes = useEnvironmentThemeDefinitions();

  const themeOptions = useMemo(() => {
    const seen = new Set<string>();
    const options: ReadonlyArray<{ readonly id: string; readonly label: string }> = [];
    const push = (id: string, label: string) => {
      if (seen.has(id)) return;
      seen.add(id);
      (options as { id: string; label: string }[]).push({ id, label });
    };
    for (const definition of [...BUILT_IN_THEMES, ...customThemes, ...environmentThemes]) {
      push(definition.id, definition.label);
    }
    return options;
  }, [customThemes, environmentThemes]);

  const projectThemeId =
    typeof settings.trailAppearanceThemeId === "string" && settings.trailAppearanceThemeId.length > 0
      ? settings.trailAppearanceThemeId
      : null;
  const selectValue = projectThemeId ?? INHERIT_VALUE;
  const hasProjectOverride = source === "project" && projectThemeId !== null;

  const resetOverride = () => {
    if (scope.kind !== "project" && scope.kind !== "checkout") {
      updateSettings({ trailAppearanceThemeId: "" });
      return;
    }
    clearOverrides(
      targets.flatMap((target) =>
        target.projectId === null
          ? []
          : [{ environmentId: target.environmentId, projectId: target.projectId }],
      ),
      ["trailAppearanceThemeId"],
    );
  };

  return (
    <SettingsRow
      serverScoped
      settingKeys={["trailAppearanceThemeId"]}
      mixed={mixed}
      id="trail-project-theme"
      title={gt("Theme")}
      description={gt("Colors for this project. Switching projects can switch the theme.")}
      resetAction={
        hasProjectOverride ? (
          <SettingResetButton
            ariaLabel={gt("Use global theme for this project")}
            tooltip={gt("Use global theme")}
            onClick={resetOverride}
          />
        ) : null
      }
      control={
        <Select
          value={selectValue}
          onValueChange={(value) => {
            if (value === null) return;
            if (value === INHERIT_VALUE) {
              resetOverride();
              return;
            }
            if (!isKnownThemePreference(value)) return;
            updateSettings({ trailAppearanceThemeId: value });
          }}
        >
          <SelectTrigger size="sm" className={SETTINGS_PICKER_TRIGGER_CLASSNAME}>
            <SelectValue>
              {selectValue === INHERIT_VALUE
                ? gt("Global default")
                : (themeOptions.find((option) => option.id === selectValue)?.label ??
                  selectValue)}
            </SelectValue>
          </SelectTrigger>
          <SelectPopup align="end" alignItemWithTrigger={false}>
            <SelectItem hideIndicator value={INHERIT_VALUE}>
              {gt("Global default")}
            </SelectItem>
            {themeOptions.map((option) => (
              <SelectItem hideIndicator key={option.id} value={option.id}>
                {option.label}
              </SelectItem>
            ))}
          </SelectPopup>
        </Select>
      }
    />
  );
}