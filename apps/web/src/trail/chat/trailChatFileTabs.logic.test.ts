import { describe, expect, it } from "vitest";

import {
  closeTrailChatFileTab,
  openTrailChatFileTab,
  trailChatFileTabLabel,
} from "./trailChatFileTabs.logic";

describe("trailChatFileTabs.logic", () => {
  it("labels a tab from the final path segment", () => {
    expect(trailChatFileTabLabel("apps/web/src/main.ts")).toBe("main.ts");
  });

  it("opens a new file tab and focuses it", () => {
    const next = openTrailChatFileTab(undefined, "README.md");
    expect(next.active).toBe("README.md");
    expect(next.tabs).toHaveLength(1);
  });

  it("reuses an existing tab and bumps reveal when a line is given", () => {
    const first = openTrailChatFileTab(undefined, "src/a.ts", 10);
    const second = openTrailChatFileTab(first, "src/a.ts", 20);
    expect(second.tabs).toHaveLength(1);
    expect(second.tabs[0]?.revealRequestId).toBeGreaterThan(first.tabs[0]?.revealRequestId ?? 0);
    expect(second.tabs[0]?.revealLine).toBe(20);
  });

  it("returns to chat when the last file tab closes", () => {
    const open = openTrailChatFileTab(undefined, "a.ts");
    const closed = closeTrailChatFileTab(open, "a.ts");
    expect(closed.active).toBe("chat");
    expect(closed.tabs).toHaveLength(0);
  });
});
