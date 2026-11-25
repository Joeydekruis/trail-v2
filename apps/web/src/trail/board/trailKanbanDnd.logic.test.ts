import { describe, expect, it } from "vitest";

import { isBoardColumnId } from "./trailKanbanDnd.logic";

describe("isBoardColumnId", () => {
  it("accepts board columns", () => {
    expect(isBoardColumnId("todo")).toBe(true);
    expect(isBoardColumnId("in-progress")).toBe(true);
  });

  it("rejects unknown ids", () => {
    expect(isBoardColumnId("issue:1")).toBe(false);
  });
});
