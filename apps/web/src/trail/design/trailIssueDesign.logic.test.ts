import { describe, expect, it } from "vitest";

import { trailIssueNumberFromKey } from "./trailIssueDesign.logic";

describe("trailIssueNumberFromKey", () => {
  it("parses numeric issue keys", () => {
    expect(trailIssueNumberFromKey("42")).toBe(42);
    expect(trailIssueNumberFromKey("TRAIL-1")).toBeNull();
  });
});