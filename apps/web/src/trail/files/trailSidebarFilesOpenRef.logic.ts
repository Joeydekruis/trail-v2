import { scopeThreadRef } from "@t3tools/client-runtime/environment";
import type { EnvironmentId, ScopedThreadRef, ThreadId } from "@t3tools/contracts";

import type { ThreadRouteTarget } from "../../threadRoutes";

/** Thread key used for Trail center file tabs (server route or draft’s reserved thread id). */
export function resolveTrailSidebarFilesOpenRef(input: {
  readonly routeTarget: ThreadRouteTarget | null;
  readonly draftSession:
    | { readonly environmentId: EnvironmentId; readonly threadId: ThreadId }
    | null
    | undefined;
}): ScopedThreadRef | null {
  if (input.routeTarget?.kind === "server") {
    return input.routeTarget.threadRef;
  }
  if (input.draftSession) {
    return scopeThreadRef(input.draftSession.environmentId, input.draftSession.threadId);
  }
  return null;
}
