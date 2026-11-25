import { describe, expect, it } from "vitest";

import { designSelectionKey } from "./trailDesignPreview.logic";

describe("designSelectionKey", () => {
  it("keys folder and page", () => {
    expect(designSelectionKey({ folder: "homepage", page: "desktop" })).toBe("homepage/desktop");
    expect(designSelectionKey(null)).toBeNull();
  });
});