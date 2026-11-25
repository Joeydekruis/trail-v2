import { ProjectId } from "@t3tools/contracts";
import * as Schema from "effect/Schema";

export const TRAIL_DESIGN_ROUTE_PREFIX = "/api/trail/design";
export const TRAIL_DESIGN_ROOT = "docs/design";
export const TRAIL_DESIGN_MAX_PAGE_BYTES = 2 * 1024 * 1024;

const DesignSlug = Schema.String.check(Schema.isPattern(/^[a-z0-9]+(-[a-z0-9]+)*$/));

export const DesignPageKind = Schema.Literals(["screen", "template", "component", "flow"]);
export type DesignPageKind = typeof DesignPageKind.Type;

export const DesignPageCoverRef = Schema.String.check(
  Schema.isPattern(/^[a-z0-9]+(-[a-z0-9]+)*\/[a-z0-9]+(-[a-z0-9]+)*$/),
);
export type DesignPageCoverRef = typeof DesignPageCoverRef.Type;

export const DesignVersionEntry = Schema.Struct({
  n: Schema.Number,
  commit: Schema.String,
  hash: Schema.String,
  note: Schema.optional(Schema.String),
  at: Schema.String,
  by: Schema.Literals(["claude", "manual", "trail"]),
});
export type DesignVersionEntry = typeof DesignVersionEntry.Type;

export const DesignPageLinks = Schema.Struct({
  issues: Schema.optional(Schema.Array(Schema.Number)),
  prs: Schema.optional(Schema.Array(Schema.Number)),
});
export type DesignPageLinks = typeof DesignPageLinks.Type;

export const DesignPageManifest = Schema.Struct({
  file: Schema.String,
  title: Schema.String,
  kind: DesignPageKind,
  covers: Schema.optional(Schema.Array(DesignPageCoverRef)),
  versions: Schema.Array(DesignVersionEntry),
  links: Schema.optional(DesignPageLinks),
});
export type DesignPageManifest = typeof DesignPageManifest.Type;

export const DesignFolderManifest = Schema.Struct({
  schema: Schema.Literal(1),
  folder: DesignSlug,
  title: Schema.optional(Schema.String),
  pages: Schema.Record(Schema.String, DesignPageManifest),
  source: Schema.optional(Schema.String),
});
export type DesignFolderManifest = typeof DesignFolderManifest.Type;

export const DesignSavePageInput = Schema.Struct({
  page: DesignSlug,
  title: Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(200)),
  kind: DesignPageKind,
  covers: Schema.optional(Schema.Array(DesignPageCoverRef)),
  html: Schema.String,
  note: Schema.optional(Schema.String.check(Schema.isMaxLength(500))),
});
export type DesignSavePageInput = typeof DesignSavePageInput.Type;

export const DesignSaveInput = Schema.Struct({
  projectId: ProjectId,
  folder: DesignSlug,
  pages: Schema.Array(DesignSavePageInput).check(Schema.isMinLength(1)),
  note: Schema.optional(Schema.String.check(Schema.isMaxLength(500))),
  issue: Schema.optional(Schema.Number),
  source: Schema.optional(Schema.String.check(Schema.isMaxLength(500))),
  by: Schema.optional(Schema.Literals(["claude", "manual", "trail"])),
});
export type DesignSaveInput = typeof DesignSaveInput.Type;

export const DesignSaveChange = Schema.Struct({
  folder: Schema.String,
  page: Schema.String,
  n: Schema.Number,
  commit: Schema.String,
});
export type DesignSaveChange = typeof DesignSaveChange.Type;

export const DesignSaveResult = Schema.Struct({
  changed: Schema.Array(DesignSaveChange),
  unchanged: Schema.Array(Schema.String),
});
export type DesignSaveResult = typeof DesignSaveResult.Type;

export const DesignListPageSummary = Schema.Struct({
  folder: Schema.String,
  page: Schema.String,
  title: Schema.String,
  kind: DesignPageKind,
  version: Schema.Number,
  hash: Schema.String,
  covers: Schema.optional(Schema.Array(DesignPageCoverRef)),
  linkedIssues: Schema.optional(Schema.Array(Schema.Number)),
});
export type DesignListPageSummary = typeof DesignListPageSummary.Type;

export const DesignListResult = Schema.Struct({
  folders: Schema.Array(
    Schema.Struct({
      folder: Schema.String,
      title: Schema.optional(Schema.String),
      pages: Schema.Array(DesignListPageSummary),
    }),
  ),
});
export type DesignListResult = typeof DesignListResult.Type;

export const DesignGetInput = Schema.Struct({
  projectId: ProjectId,
  folder: DesignSlug,
  page: DesignSlug,
  version: Schema.optional(Schema.Number),
});
export type DesignGetInput = typeof DesignGetInput.Type;

export const DesignVersionSummary = Schema.Struct({
  n: Schema.Number,
  commit: Schema.String,
  note: Schema.optional(Schema.String),
  at: Schema.String,
  by: Schema.Literals(["claude", "manual", "trail"]),
});
export type DesignVersionSummary = typeof DesignVersionSummary.Type;

export const DesignGetResult = Schema.Struct({
  folder: Schema.String,
  page: Schema.String,
  version: Schema.Number,
  hash: Schema.String,
  commit: Schema.String,
  path: Schema.String,
  html: Schema.optional(Schema.String),
  versions: Schema.Array(DesignVersionSummary),
});
export type DesignGetResult = typeof DesignGetResult.Type;

export const DesignForIssueInput = Schema.Struct({
  projectId: ProjectId,
  issue: Schema.Number,
});
export type DesignForIssueInput = typeof DesignForIssueInput.Type;

export const DesignForIssueQuery = Schema.Struct({
  projectId: ProjectId,
  issue: Schema.NumberFromString,
});
export type DesignForIssueQuery = typeof DesignForIssueQuery.Type;

export const DesignForIssueResult = Schema.Struct({
  pages: Schema.Array(DesignListPageSummary),
  components: Schema.Array(DesignListPageSummary),
});
export type DesignForIssueResult = typeof DesignForIssueResult.Type;

export const DesignRenameInput = Schema.Struct({
  projectId: ProjectId,
  folder: DesignSlug,
  page: DesignSlug,
  newPage: DesignSlug,
});
export type DesignRenameInput = typeof DesignRenameInput.Type;

export const DesignRenameResult = Schema.Struct({
  folder: Schema.String,
  from: Schema.String,
  to: Schema.String,
  commit: Schema.String,
});
export type DesignRenameResult = typeof DesignRenameResult.Type;

export const DesignListQuery = Schema.Struct({
  projectId: ProjectId,
});
export type DesignListQuery = typeof DesignListQuery.Type;

export const DesignGetQuery = Schema.Struct({
  projectId: ProjectId,
  folder: DesignSlug,
  page: DesignSlug,
  version: Schema.optional(Schema.NumberFromString),
});
export type DesignGetQuery = typeof DesignGetQuery.Type;

export class DesignFailure extends Schema.TaggedError<DesignFailure>()("DesignFailure", {
  code: Schema.Literals([
    "invalid_request",
    "validation_failed",
    "project_not_found",
    "not_a_git_repo",
    "save_failed",
    "not_found",
    "rename_failed",
  ]),
  message: Schema.String,
}) {}