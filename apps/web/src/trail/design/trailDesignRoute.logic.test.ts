import { describe, expect, it } from "vitest";

import { trailDesignDeepSelection, trailDesignSearchFromUrl } from "./trailDesignRoute.logic";

describe("trailDesignRoute", () => {
  it("parses search params", () => {
    expect(trailDesignSearchFromUrl({ folder: "home", page: "desktop" })).toEqual({
      folder: "home",
      page: "desktop",
    });
    expect(trailDesignDeepSelection({ folder: "a", page: "b" })).toEqual({ folder: "a", page: "b" });
  });
});