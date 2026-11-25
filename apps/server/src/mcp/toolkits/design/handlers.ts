import { DesignFailure } from "@t3tools/trail-contracts";
import type { ProjectId } from "@t3tools/contracts";
import * as Effect from "effect/Effect";

import * as DesignService from "../../../trail/design/DesignService.ts";
import { readThread } from "../../threadAccess.ts";
import * as McpInvocationContext from "../../McpInvocationContext.ts";
import * as McpToolAccess from "../../McpToolAccess.ts";
import { DesignToolkit } from "./tools.ts";

const projectRequired = new DesignFailure({
  code: "invalid_request",
  message: "Pass projectId when not running inside a T3 thread.",
});

const resolveProjectId = (explicit: ProjectId | undefined) =>
  Effect.gen(function* () {
    if (explicit !== undefined) return explicit;
    const scope = yield* McpInvocationContext.McpInvocationContext;
    if (scope.thread === undefined) return yield* Effect.fail(projectRequired);
    const { projection } = yield* readThread(scope.thread.threadId).pipe(
      Effect.mapError((error) =>
        new DesignFailure({
          code: "invalid_request",
          message: error.message,
        }),
      ),
    );
    return projection.thread.projectId;
  });

const handlers = {
  trail_save_design: McpToolAccess.actsAsCaller((input) =>
    Effect.gen(function* () {
      const projectId = yield* resolveProjectId(input.projectId);
      const service = yield* DesignService.DesignService;
      return yield* service.save({ ...input, projectId });
    }),
  ),
  trail_list_designs: McpToolAccess.reads((input) =>
    Effect.gen(function* () {
      const projectId = yield* resolveProjectId(input.projectId);
      const service = yield* DesignService.DesignService;
      return yield* service.list(projectId);
    }),
  ),
  trail_get_design: McpToolAccess.reads((input) =>
    Effect.gen(function* () {
      const projectId = yield* resolveProjectId(input.projectId);
      const service = yield* DesignService.DesignService;
      return yield* service.get({ ...input, projectId });
    }),
  ),
  trail_get_design_for_issue: McpToolAccess.reads((input) =>
    Effect.gen(function* () {
      const projectId = yield* resolveProjectId(input.projectId);
      const service = yield* DesignService.DesignService;
      return yield* service.getForIssue({ ...input, projectId });
    }),
  ),
  trail_rename_design: McpToolAccess.actsAsCaller((input) =>
    Effect.gen(function* () {
      const projectId = yield* resolveProjectId(input.projectId);
      const service = yield* DesignService.DesignService;
      return yield* service.rename({ ...input, projectId });
    }),
  ),
} satisfies McpToolAccess.Handlers<typeof DesignToolkit.tools>;

export const layer = McpToolAccess.toLayer(DesignToolkit, handlers);