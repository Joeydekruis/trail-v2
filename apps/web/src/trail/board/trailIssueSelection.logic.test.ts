import { describe, expect, it } from "vitest";

import {
  trailIssueSelectionFromSearch,
  trailSelectedIssueEntry,
} from "./trailIssueSelection.logic";

describe("trailIssueSelectionFromSearch", () => {
  it("returns null until an issue is selected", () => {
    expect(trailIssueSelectionFromSearch({ status: "open", who: "all" })).toBeNull();
  });
});
