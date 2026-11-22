import { describe, expect, it } from "vite-plus/test";

import { isTrailUtilityPage, resolveTrailPrimaryNav } from "./trailPrimaryNav.logic";

describe("trailPrimaryNav", () => {
  it("maps pathnames to primary nav ids", () => {
    expect(resolveTrailPrimaryNav("/")).toBe("chat");
    expect(resolveTrailPrimaryNav("/env/thread")).toBe("chat");
    expect(resolveTrailPrimaryNav("/board")).toBe("board");
    expect(resolveTrailPrimaryNav("/files")).toBe("files");
    expect(resolveTrailPrimaryNav("/dashboard")).toBe("dashboard");
  });

  it("flags Trail utility pages", () => {
    expect(isTrailUtilityPage("/board")).toBe(true);
    expect(isTrailUtilityPage("/files")).toBe(true);
    expect(isTrailUtilityPage("/dashboard")).toBe(true);
    expect(isTrailUtilityPage("/issues")).toBe(false);
  });
});
