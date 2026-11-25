import { describe, expect, it } from "vitest";

import {
  designPageSummary,
  designUsedByForSelection,
  designUsedByIndex,
} from "./trailDesignCovers.logic";

describe("trailDesignCovers", () => {
  const folders = [
    {
      folder: "invoices",
      pages: [
        {
          folder: "invoices",
          page: "list",
          title: "List",
          kind: "screen" as const,
          version: 1,
          hash: "sha256:0",
          covers: ["components/data-table"],
        },
      ],
    },
    {
      folder: "components",
      pages: [
        {
          folder: "components",
          page: "data-table",
          title: "Data table",
          kind: "component" as const,
          version: 1,
          hash: "sha256:1",
        },
      ],
    },
  ];

  it("inverts covers into a used-by index", () => {
    const index = designUsedByIndex(folders);
    expect(index.get("components/data-table")).toEqual([
      { folder: "invoices", page: "list", title: "List" },
    ]);
    expect(designUsedByForSelection(folders, { folder: "components", page: "data-table" })).toEqual([
      { folder: "invoices", page: "list", title: "List" },
    ]);
  });

  it("finds page summary for selection", () => {
    expect(designPageSummary(folders, { folder: "components", page: "data-table" })?.kind).toBe(
      "component",
    );
  });
});