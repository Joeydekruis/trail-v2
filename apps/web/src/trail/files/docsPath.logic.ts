import { joinPath } from "@t3tools/shared/fileLinks";
import { isHostPath, isWindowsAbsolutePath } from "@t3tools/shared/path";

export const DOCS_DIRECTORY_NAME = "docs";

/** Absolute cwd for listEntries / file reads scoped to the project's docs/ folder. */
export function docsDirectoryCwd(workspaceRoot: string): string {
  const separator: "/" | "\\" = isWindowsAbsolutePath(workspaceRoot) ? "\\" : "/";
  return joinPath(workspaceRoot, DOCS_DIRECTORY_NAME, separator);
}

/**
 * Normalize a path that should stay under docs/ (relative to the docs cwd).
 * Returns null when the path escapes docs via `..`, absolute/host forms, or empty junk.
 */
export function normalizeDocsRelativePath(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  let path = raw.trim().replaceAll("\\", "/");
  if (!path || path === "." || path === "./") return null;
  if (isHostPath(path) || isWindowsAbsolutePath(raw.trim()) || path.startsWith("/")) {
    return null;
  }

  path = path.replace(/^\.\//, "");
  // Breadcrumbs that start at the project root may still include a docs/ prefix.
  if (path === DOCS_DIRECTORY_NAME || path === `${DOCS_DIRECTORY_NAME}/`) return null;
  if (path.startsWith(`${DOCS_DIRECTORY_NAME}/`)) {
    path = path.slice(DOCS_DIRECTORY_NAME.length + 1);
  }

  const segments = path.split("/").filter((segment) => segment.length > 0 && segment !== ".");
  if (segments.length === 0) return null;
  if (segments.some((segment) => segment === "..")) return null;

  return segments.join("/");
}

/** Breadcrumb segments after the project name: always starts with `docs`. */
export function docsBreadcrumbSegments(relativePath: string | null): readonly string[] {
  const normalized = normalizeDocsRelativePath(relativePath);
  if (normalized === null) return [DOCS_DIRECTORY_NAME];
  return [DOCS_DIRECTORY_NAME, ...normalized.split("/")];
}
