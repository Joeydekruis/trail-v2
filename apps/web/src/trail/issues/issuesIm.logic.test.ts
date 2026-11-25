import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { createMemoryStorage } from "~/lib/storage";

import {
  issuesNavSearch,
  readStoredIssuesIm,
  resolveIssuesIm,
  syncStoredIssuesIm,
  writeStoredIssuesIm,
} from "./issuesIm.logic";

describe("issuesIm.logic", () => {
  beforeEach(() => {
    const storage = createMemoryStorage();
    vi.stubGlobal("window", { localStorage: storage });
    vi.stubGlobal("localStorage", storage);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("resolveIssuesIm", () => {
    it("prefers explicit im over legacy view", () => {
      expect(resolveIssuesIm({ im: "list", view: "board" })).toBe("list");
      expect(resolveIssuesIm({ im: "board" })).toBe("board");
    });

    it("maps legacy view=board to board mode", () => {
      expect(resolveIssuesIm({ view: "board" })).toBe("board");
    });

    it("reads the stored mode when the URL omits im", () => {
      writeStoredIssuesIm("board");
      expect(resolveIssuesIm({})).toBe("board");
    });
  });

  describe("issuesNavSearch", () => {
    it("includes the stored list/board mode", () => {
      writeStoredIssuesIm("board");
      expect(issuesNavSearch()).toMatchObject({ im: "board" });
    });
  });

  describe("syncStoredIssuesIm", () => {
    it("writes only when the mode changed", () => {
      writeStoredIssuesIm("list");
      syncStoredIssuesIm("list");
      expect(readStoredIssuesIm()).toBe("list");
      syncStoredIssuesIm("board");
      expect(readStoredIssuesIm()).toBe("board");
    });
  });
});