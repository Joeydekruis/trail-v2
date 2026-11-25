import { describe, expect, it } from "@effect/vitest";

import { validateDesignHtml } from "./validation.ts";

describe("validateDesignHtml", () => {
  it("rejects non-html payloads", () => {
    expect(validateDesignHtml("<div>only a fragment</div>")?.field).toBe("html");
  });

  it("accepts standalone documents", () => {
    expect(
      validateDesignHtml("<!DOCTYPE html><html><head></head><body></body></html>"),
    ).toBeNull();
  });
});