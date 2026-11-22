import { describe, expect, it } from "vite-plus/test";

import {
  DOCS_DIRECTORY_NAME,
  docsBreadcrumbSegments,
  docsDirectoryCwd,
  normalizeDocsRelativePath,
} from "./docsPath.logic";

describe("docsDirectoryCwd", () => {
  it("appends docs under a posix workspace root", () => {
    expect(docsDirectoryCwd("/Users/me/project")).toBe("/Users/me/project/docs");
  });

  it("appends docs under a Windows workspace root", () => {
    expect(docsDirectoryCwd("C:\\Users\\me\\project")).toBe("C:\\Users\\me\\project\\docs");
  });
});

describe("normalizeDocsRelativePath", () => {
  it("keeps simple relative files and nested paths", () => {
    expect(normalizeDocsRelativePath("README.md")).toBe("README.md");
    expect(normalizeDocsRelativePath("./guide/intro.md")).toBe("guide/intro.md");
    expect(normalizeDocsRelativePath("guide/intro.md")).toBe("guide/intro.md");
  });

  it("strips a leading docs/ prefix from project-root breadcrumbs", () => {
    expect(normalizeDocsRelativePath("docs/README.md")).toBe("README.md");
    expect(normalizeDocsRelativePath("docs/guide/a.md")).toBe("guide/a.md");
    expect(normalizeDocsRelativePath("docs")).toBeNull();
    expect(normalizeDocsRelativePath("docs/")).toBeNull();
  });

  it("rejects traversal and absolute or host paths", () => {
    expect(normalizeDocsRelativePath("../secret.md")).toBeNull();
    expect(normalizeDocsRelativePath("guide/../../secret.md")).toBeNull();
    expect(normalizeDocsRelativePath("/etc/passwd")).toBeNull();
    expect(normalizeDocsRelativePath("C:\\Windows\\system.ini")).toBeNull();
    expect(normalizeDocsRelativePath("~/notes.md")).toBeNull();
    expect(normalizeDocsRelativePath("")).toBeNull();
    expect(normalizeDocsRelativePath(".")).toBeNull();
    expect(normalizeDocsRelativePath(null)).toBeNull();
  });
});

describe("docsBreadcrumbSegments", () => {
  it("always starts with docs", () => {
    expect(docsBreadcrumbSegments(null)).toEqual([DOCS_DIRECTORY_NAME]);
    expect(docsBreadcrumbSegments("README.md")).toEqual([DOCS_DIRECTORY_NAME, "README.md"]);
    expect(docsBreadcrumbSegments("guide/intro.md")).toEqual([
      DOCS_DIRECTORY_NAME,
      "guide",
      "intro.md",
    ]);
  });
});
