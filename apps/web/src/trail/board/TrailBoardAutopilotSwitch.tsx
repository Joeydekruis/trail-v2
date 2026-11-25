import type { EnvironmentId, ProjectId } from "@t3tools/contracts";
import { BotIcon } from "lucide-react";
import { T, useGT } from "gt-react";

import { Switch } from "~/components/ui/switch";

import { useTrailBoardAutopilot } from "./useTrailBoardAutopilot";

export function TrailBoardAutopilotSwitch({
  environmentId,
  projectId,
}: {
  readonly environmentId: EnvironmentId;
  readonly projectId: ProjectId;
}) {
  const gt = useGT();
  const autopilot = useTrailBoardAutopilot(environmentId, projectId);

  return (
    <label className="flex items-center gap-2 text-sm">
      <Switch
        size="sm"
        checked={autopilot.enabled}
        disabled={!autopilot.canPersist}
        onCheckedChange={(checked) => autopilot.setEnabled(checked)}
        aria-label={gt("Autopilot", { $context: "board picks up Todo automatically" })}
      />
      <BotIcon aria-hidden className="size-3.5 text-muted-foreground" />
      <span>
        <T context="board setting">Autopilot</T>
      </span>
    </label>
  );
}
