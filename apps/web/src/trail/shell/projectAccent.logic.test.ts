import { describe, expect, it } from "vite-plus/test";

import {
  defaultAccentForProject,
  hashProjectKey,
  projectInitial,
  resolveProjectAccent,
  TRAIL_ACCENT_PALETTE,
} from "./projectAccent";

describe("projectAccent", () => {
  it("hashes project keys stably", () => {
    expect(hashProjectKey("github.com/acme/app")).toBe(hashProjectKey("github.com/acme/app"));
    expect(hashProjectKey("a")).not.toBe(hashProjectKey("b"));
  });

  it("picks a palette color from the key", () => {
    const accent = defaultAccentForProject("github.com/acme/app");
    expect(TRAIL_ACCENT_PALETTE).toContain(accent);
  });

  it("prefers stored overrides", () => {
    expect(resolveProjectAccent("github.com/acme/app", { "github.com/acme/app": "#112233" })).toBe(
      "#112233",
    );
  });

  it("derives a single initial from the display name", () => {
    expect(projectInitial("trail-v2")).toBe("T");
    expect(projectInitial("  ")).toBe("?");
  });
});
