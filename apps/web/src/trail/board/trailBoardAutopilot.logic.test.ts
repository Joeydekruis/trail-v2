import { DEFAULT_SERVER_SETTINGS } from "@t3tools/contracts";
import { ProjectId } from "@t3tools/contracts";
import { describe, expect, it } from "vitest";

import { resolveTrailBoardAutopilotEnabled } from "./trailBoardAutopilot.logic";

describe("resolveTrailBoardAutopilotEnabled", () => {
  it("is off by default", () => {
    expect(
      resolveTrailBoardAutopilotEnabled(DEFAULT_SERVER_SETTINGS, ProjectId.make("project-a")),
    ).toBe(false);
  });

  it("reads project overrides", () => {
    const projectId = ProjectId.make("project-a");
    expect(
      resolveTrailBoardAutopilotEnabled(
        {
          ...DEFAULT_SERVER_SETTINGS,
          projectSettingsOverrides: {
            [projectId]: { trailBoardAutopilotEnabled: true },
          },
        },
        projectId,
      ),
    ).toBe(true);
  });
});
