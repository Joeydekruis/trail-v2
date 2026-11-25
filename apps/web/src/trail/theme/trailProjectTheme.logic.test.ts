import { DEFAULT_SERVER_SETTINGS, type ProjectId } from "@t3tools/contracts";
import { describe, expect, it } from "vitest";

import { resolveTrailProjectThemeId } from "./trailProjectTheme.logic";

const projectId = "p1" as ProjectId;

describe("resolveTrailProjectThemeId", () => {
  it("returns null when no override is stored", () => {
    expect(resolveTrailProjectThemeId(DEFAULT_SERVER_SETTINGS, projectId)).toBe(null);
  });

  it("returns the override theme id", () => {
    const settings = {
      ...DEFAULT_SERVER_SETTINGS,
      projectSettingsOverrides: {
        [projectId]: { trailAppearanceThemeId: "ocean" },
      },
    };
    expect(resolveTrailProjectThemeId(settings, projectId)).toBe("ocean");
  });
});