import { describe, expect, it } from "vitest";

import { filterDesignCatalog } from "./trailDesignCatalog.logic";

describe("trailDesignCatalog", () => {
  const folders = [
    {
      folder: "app",
      pages: [
        {
          folder: "app",
          page: "home",
          title: "Home",
          kind: "screen" as const,
          version: 1,
          hash: "a",
        },
      ],
    },
    {
      folder: "components",
      pages: [
        {
          folder: "components",
          page: "button",
          title: "Button",
          kind: "component" as const,
          version: 1,
          hash: "b",
        },
      ],
    },
  ];

  it("filters to components only", () => {
    expect(filterDesignCatalog(folders, "components")).toEqual([folders[1]]);
  });
});