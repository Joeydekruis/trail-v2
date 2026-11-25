import {
  DEFAULT_PROVIDER_INTERACTION_MODE,
  DEFAULT_RUNTIME_MODE,
  type ModelSelection,
  type ProjectId,
  type ProviderInteractionMode,
  type RuntimeMode,
} from "@t3tools/contracts";
import { resolveProjectSettings } from "@t3tools/shared/projectSettings";
import { resolveNewThreadModelSelection } from "@t3tools/shared/usageLimits";
import type { ThreadLaunchWorkspaceStrategy } from "../../orchestration-v2/ThreadLaunchService.ts";
import * as Option from "effect/Option";
import * as Effect from "effect/Effect";

import * as ProjectService from "../../project/ProjectService.ts";
import * as ProviderRegistry from "../../provider/ProviderRegistry.ts";
import * as ServerSettings from "../../serverSettings.ts";
import { TrailFeedbackAccessError } from "@t3tools/trail-contracts";

export interface FeedbackThreadLaunchDefaults {
  readonly modelSelection: ModelSelection;
  readonly runtimeMode: RuntimeMode;
  readonly interactionMode: ProviderInteractionMode;
  readonly workspaceStrategy: ThreadLaunchWorkspaceStrategy;
}

export const resolveFeedbackThreadLaunch = Effect.fn("trail.feedback.resolveThreadLaunch")(
  function* (projectId: ProjectId) {
    const projects = yield* ProjectService.ProjectService;
    const project = yield* projects.getById(projectId).pipe(
      Effect.flatMap(
        Option.match({
          onNone: () => Effect.fail(new TrailFeedbackAccessError({ reason: "project_not_found" })),
          onSome: Effect.succeed,
        }),
      ),
    );
    const settings = yield* ServerSettings.ServerSettingsService.pipe(
      Effect.flatMap((service) => service.getSettings),
    );
    const resolved = resolveProjectSettings(settings, projectId, project);
    const providers = yield* ProviderRegistry.ProviderRegistry.pipe(
      Effect.flatMap((registry) => registry.getProviders),
    );
    const picked = resolveNewThreadModelSelection({
      defaultSelection: resolved.settings.defaultModelSelection,
      fallbackSelection: resolved.settings.fallbackModelSelection,
      providers,
      settings: resolved.settings,
      projectId,
      now: Date.now(),
    });
    if (picked.selection === null) {
      return yield* new TrailFeedbackAccessError({ reason: "no_model" });
    }
    const runtimeMode = resolved.settings.defaultRuntimeMode ?? DEFAULT_RUNTIME_MODE;
    return {
      modelSelection: picked.selection,
      runtimeMode,
      interactionMode: DEFAULT_PROVIDER_INTERACTION_MODE,
      workspaceStrategy: { type: "root" } as const,
    } satisfies FeedbackThreadLaunchDefaults;
  },
);