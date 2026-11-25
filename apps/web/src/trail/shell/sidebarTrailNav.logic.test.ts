import { describe, expect, it } from "vite-plus/test";

import { resolveSidebarTrailNav } from "./sidebarTrailNav.logic";

describe("resolveSidebarTrailNav", () => {
  it("resolves dashboard and issues", () => {
    expect(resolveSidebarTrailNav("/dashboard")).toBe("dashboard");
    expect(resolveSidebarTrailNav("/issues")).toBe("issues");
    expect(resolveSidebarTrailNav("/board")).toBe("issues");
    expect(resolveSidebarTrailNav("/")).toBe(null);
  });
});
