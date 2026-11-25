import { describe, expect, it } from "@effect/vitest";

import {
  applySavePage,
  currentVersionNumber,
  pageHashMatchesFile,
  recordManualDrift,
} from "./manifest.ts";
import { contentHashFromString } from "./hash.ts";

describe("design manifest", () => {
  it("skips unchanged hash comparison", () => {
    const html = "<!DOCTYPE html><html><body>x</body></html>";
    const hash = contentHashFromString(html);
    const page = applySavePage({
      existing: undefined,
      entry: { page: "list", title: "List", kind: "screen", html },
      commitSha: "abcdef1234567890",
      hash,
      at: "2026-11-25T10:00:00.000Z",
      by: "claude",
    });
    expect(pageHashMatchesFile(page, html)).toBe(true);
    expect(currentVersionNumber(page)).toBe(1);
  });

  it("records manual drift before a new save", () => {
    const html = "<!DOCTYPE html><html><body>a</body></html>";
    const hash = contentHashFromString(html);
    let page = applySavePage({
      existing: undefined,
      entry: { page: "list", title: "List", kind: "screen", html },
      commitSha: "aaa1111",
      hash,
      at: "2026-11-25T10:00:00.000Z",
      by: "claude",
    });
    const edited = "<!DOCTYPE html><html><body>b</body></html>";
    page = recordManualDrift(page, contentHashFromString(edited), "2026-11-26T10:00:00.000Z");
    expect(page.versions).toHaveLength(2);
    expect(page.versions[1]?.by).toBe("manual");
  });
});