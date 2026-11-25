import { scopeThreadRef } from "@t3tools/client-runtime/environment";
import type { EnvironmentId, ThreadId } from "@t3tools/contracts";
import { describe, expect, it } from "vitest";

import { resolveTrailSidebarFilesOpenRef } from "./trailSidebarFilesOpenRef.logic";

const environmentId = "env_local" as EnvironmentId;
const threadId = "thread_1" as ThreadId;

describe("resolveTrailSidebarFilesOpenRef", () => {
  it("uses the committed route thread on server routes", () => {
    const threadRef = scopeThreadRef(environmentId, threadId);
    expect(
      resolveTrailSidebarFilesOpenRef({
        routeTarget: { kind: "server", threadRef },
        draftSession: null,
      }),
    ).toBe(threadRef);
  });

  it("uses the draft session thread id when no server thread is active", () => {
    expect(
      resolveTrailSidebarFilesOpenRef({
        routeTarget: { kind: "draft", draftId: "draft_1" },
        draftSession: { environmentId, threadId },
      }),
    ).toEqual(scopeThreadRef(environmentId, threadId));
  });
});
