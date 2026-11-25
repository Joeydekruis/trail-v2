import {
  DesignFailure,
  DesignFolderManifest,
  DesignPageManifest,
  type DesignForIssueInput,
  type DesignForIssueResult,
  type DesignGetInput,
  type DesignGetResult,
  type DesignListPageSummary,
  type DesignListResult,
  type DesignRenameInput,
  type DesignRenameResult,
  type DesignSaveInput,
  type DesignSaveResult,
  TRAIL_DESIGN_MAX_PAGE_BYTES,
  TRAIL_DESIGN_ROOT,
} from "@t3tools/trail-contracts";
import type { ProjectId } from "@t3tools/contracts";
import {
  applySavePage,
  contentHashFromString,
  currentVersion,
  defaultPageFile,
  emptyFolderManifest,
  pageHashMatchesFile,
  queueDesignPreviews,
  recordManualDrift,
  validateDesignHtml,
} from "@t3tools/trail-server";
import * as Cause from "effect/Cause";
import * as Context from "effect/Context";
import * as DateTime from "effect/DateTime";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Path from "effect/Path";
import * as Schema from "effect/Schema";
import * as SecureRandom from "effect/crypto/SecureRandom";
import * as Semaphore from "effect/Semaphore";

import * as GitWorkflowService from "../../git/GitWorkflowService.ts";
import * as ProjectService from "../../project/ProjectService.ts";
import * as GitVcsDriver from "../../vcs/GitVcsDriver.ts";

export class DesignService extends Context.Service<
  DesignService,
  {
    readonly save: (input: DesignSaveInput) => Effect.Effect<DesignSaveResult, DesignFailure>;
    readonly list: (projectId: ProjectId) => Effect.Effect<DesignListResult, DesignFailure>;
    readonly get: (input: DesignGetInput) => Effect.Effect<DesignGetResult, DesignFailure>;
    readonly getForIssue: (
      input: DesignForIssueInput,
    ) => Effect.Effect<DesignForIssueResult, DesignFailure>;
    readonly rename: (input: DesignRenameInput) => Effect.Effect<DesignRenameResult, DesignFailure>;
  }
>()("t3/trail/design/DesignService") {}

const decodeFolderManifest = Schema.decodeUnknownEffect(Schema.fromJsonString(DesignFolderManifest));
const decodePageManifest = Schema.decodeUnknownEffect(DesignPageManifest);

const fail = (code: DesignFailure["code"], message: string) =>
  Effect.fail(new DesignFailure({ code, message }));

const shortSha = (sha: string) => (sha.length > 7 ? sha.slice(0, 7) : sha);

const make = Effect.gen(function* () {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const random = yield* SecureRandom.SecureRandom;
  const projects = yield* ProjectService.ProjectService;
  const gitWorkflow = yield* GitWorkflowService.GitWorkflowService;
  const git = yield* GitVcsDriver.GitVcsDriver;
  const saveLocks = yield* Effect.sync(() => new Map<string, Semaphore.Semaphore>());

  const lockForProject = (projectId: string) =>
    Effect.gen(function* () {
      const existing = saveLocks.get(projectId);
      if (existing !== undefined) return existing;
      const lock = yield* Semaphore.make(1);
      saveLocks.set(projectId, lock);
      return lock;
    });

  const resolveProjectRoot = (projectId: ProjectId) =>
    projects.getById(projectId).pipe(
      Effect.mapError(
        () => new DesignFailure({ code: "project_not_found", message: "Project not found." }),
      ),
      Effect.flatMap((project) =>
        Option.isNone(project)
          ? fail("project_not_found", "Project not found.")
          : Effect.succeed(project.value.workspaceRoot),
      ),
    );

  const designRoot = (workspaceRoot: string) => path.join(workspaceRoot, TRAIL_DESIGN_ROOT);
  const folderDir = (root: string, folder: string) => path.join(designRoot(root), folder);
  const manifestPath = (root: string, folder: string) => path.join(folderDir(root, folder), "design.json");
  const htmlPath = (root: string, folder: string, file: string) => path.join(folderDir(root, folder), file);

  const gitObjectPath = (folder: string, file: string) =>
    [TRAIL_DESIGN_ROOT, folder, file].join("/");

  const resolveDefaultBranch = Effect.fn("DesignService.resolveDefaultBranch")(function* (
    workspaceRoot: string,
  ) {
    const remote = yield* gitWorkflow.resolvePrimaryRemoteName(workspaceRoot).pipe(Effect.option);
    if (Option.isSome(remote)) {
      const branch = yield* gitWorkflow.resolveDefaultBranchName(workspaceRoot, remote.value);
      if (branch === null) {
        return yield* fail("save_failed", "Could not resolve the default branch.");
      }
      return branch;
    }
    const branch = yield* gitWorkflow.currentBranch(workspaceRoot);
    if (branch === null) {
      return yield* fail("save_failed", "Could not resolve the default branch.");
    }
    return branch;
  });

  const optionalDefaultBranch = (workspaceRoot: string) =>
    resolveDefaultBranch(workspaceRoot).pipe(
      Effect.match({
        onFailure: () => Option.none<string>(),
        onSuccess: (branch) => Option.some(branch),
      }),
    );

  const readPageHtml = Effect.fn("DesignService.readPageHtml")(function* (
    workspaceRoot: string,
    folder: string,
    file: string,
    page: DesignPageManifest,
    versionEntry: DesignPageManifest["versions"][number],
    requestedVersion: number | undefined,
  ) {
    const current = currentVersion(page);
    if (
      requestedVersion === undefined ||
      (current !== undefined && versionEntry.n === current.n)
    ) {
      const absolute = htmlPath(workspaceRoot, folder, file);
      if (yield* fileSystem.exists(absolute)) {
        return yield* fileSystem.readFileString(absolute);
      }
      const branch = yield* optionalDefaultBranch(workspaceRoot);
      if (Option.isSome(branch)) {
        const headObject = `${branch.value}:${gitObjectPath(folder, file)}`;
        const headShown = yield* gitShowText(workspaceRoot, headObject);
        if (headShown !== null && headShown.exitCode === 0) {
          return headShown.stdout;
        }
      }
    }
    const gitPath = gitObjectPath(folder, file);
    const result = yield* git
      .execute({
        operation: "DesignService.readPageHtml",
        cwd: workspaceRoot,
        args: ["show", "--end-of-options", `${versionEntry.commit}:${gitPath}`],
        maxOutputBytes: TRAIL_DESIGN_MAX_PAGE_BYTES + 4096,
      })
      .pipe(
        Effect.mapError(
          (error) =>
            new DesignFailure({
              code: "not_found",
              message: `Could not load HTML for version ${versionEntry.n}: ${error.message ?? String(error)}`,
            }),
        ),
      );
    if (result.exitCode !== 0) {
      return yield* fail(
        "not_found",
        `Version ${versionEntry.n} (${versionEntry.commit}) is not available in git.`,
      );
    }
    return result.stdout;
  });

  const gitShowText = (workspaceRoot: string, objectRef: string) =>
    git
      .execute({
        operation: "DesignService.gitShowText",
        cwd: workspaceRoot,
        args: ["show", "--end-of-options", objectRef],
        maxOutputBytes: TRAIL_DESIGN_MAX_PAGE_BYTES + 65_536,
      })
      .pipe(Effect.catch(() => Effect.succeed(null)));

  const readManifestAt = (root: string, folder: string) =>
    Effect.gen(function* () {
      const absolute = manifestPath(root, folder);
      if (yield* fileSystem.exists(absolute)) {
        return yield* fileSystem.readFileString(absolute).pipe(
          Effect.flatMap(decodeFolderManifest),
          Effect.catch(() => Effect.succeed(emptyFolderManifest(folder))),
        );
      }
      const branch = yield* optionalDefaultBranch(root);
      if (Option.isNone(branch)) return emptyFolderManifest(folder);
      const objectRef = `${branch.value}:${gitObjectPath(folder, "design.json")}`;
      const shown = yield* gitShowText(root, objectRef);
      if (shown === null || shown.exitCode !== 0) return emptyFolderManifest(folder);
      return yield* decodeFolderManifest(shown.stdout).pipe(
        Effect.catch(() => Effect.succeed(emptyFolderManifest(folder))),
      );
    });

  const writeJson = (absolutePath: string, value: unknown) =>
    fileSystem
      .makeDirectory(path.dirname(absolutePath), { recursive: true })
      .pipe(
        Effect.andThen(
          fileSystem.writeFileString(absolutePath, `${JSON.stringify(value, null, 2)}\n`),
        ),
      );

  const summaryFromPage = (
    folder: string,
    pageKey: string,
    page: DesignPageManifest,
  ): DesignListPageSummary | null => {
    const version = currentVersion(page);
    if (version === undefined) return null;
    return {
      folder,
      page: pageKey,
      title: page.title,
      kind: page.kind,
      version: version.n,
      hash: version.hash,
      covers: page.covers,
      linkedIssues: page.links?.issues,
    };
  };

  const list = (projectId: ProjectId) =>
    Effect.gen(function* () {
      const workspaceRoot = yield* resolveProjectRoot(projectId);
      const root = designRoot(workspaceRoot);
      const folderNames = new Set<string>();
      if (yield* fileSystem.exists(root)) {
        const entries = yield* fileSystem.readDirectory(root);
        for (const entry of entries) {
          const folderPath = path.join(root, entry);
          if ((yield* fileSystem.stat(folderPath)).type === "Directory") folderNames.add(entry);
        }
      }
      const branch = yield* optionalDefaultBranch(workspaceRoot);
      if (Option.isSome(branch)) {
        const tree = yield* git
          .execute({
            operation: "DesignService.list.git",
            cwd: workspaceRoot,
            args: ["ls-tree", "-d", "--name-only", `${branch.value}:${TRAIL_DESIGN_ROOT}`],
          })
          .pipe(Effect.catch(() => Effect.succeed(null)));
        if (tree !== null && tree.exitCode === 0) {
          for (const entry of tree.stdout.split("\n")) {
            const name = entry.trim();
            if (name.length > 0) folderNames.add(name);
          }
        }
      }
      if (folderNames.size === 0) return { folders: [] };
      const folders: Array<DesignListResult["folders"][number]> = [];
      for (const entry of [...folderNames].sort()) {
        const manifest = yield* readManifestAt(workspaceRoot, entry);
        const pages: DesignListPageSummary[] = [];
        for (const [pageKey, raw] of Object.entries(manifest.pages)) {
          const page = yield* decodePageManifest(raw);
          const summary = summaryFromPage(entry, pageKey, page);
          if (summary !== null) pages.push(summary);
        }
        folders.push({ folder: entry, title: manifest.title, pages });
      }
      return { folders };
    });

  const get = (input: DesignGetInput) =>
    Effect.gen(function* () {
      const workspaceRoot = yield* resolveProjectRoot(input.projectId);
      const manifest = yield* readManifestAt(workspaceRoot, input.folder);
      const raw = manifest.pages[input.page];
      if (raw === undefined) {
        return yield* fail("not_found", `Page ${input.folder}/${input.page} was not found.`);
      }
      const page = yield* decodePageManifest(raw);
      const versionEntry =
        input.version === undefined
          ? currentVersion(page)
          : page.versions.find((entry) => entry.n === input.version);
      if (versionEntry === undefined) {
        return yield* fail("not_found", `Version ${input.version ?? "current"} was not found.`);
      }
      const relative = path.join(TRAIL_DESIGN_ROOT, input.folder, page.file);
      const html = yield* readPageHtml(
        workspaceRoot,
        input.folder,
        page.file,
        page,
        versionEntry,
        input.version,
      );
      return {
        folder: input.folder,
        page: input.page,
        version: versionEntry.n,
        hash: versionEntry.hash,
        commit: versionEntry.commit,
        path: relative,
        html,
        versions: page.versions.map((entry) => ({
          n: entry.n,
          commit: entry.commit,
          note: entry.note,
          at: entry.at,
          by: entry.by,
        })),
      } satisfies DesignGetResult;
    });

  const getForIssue = (input: DesignForIssueInput) =>
    Effect.gen(function* () {
      const listed = yield* list(input.projectId);
      const pages: DesignListPageSummary[] = [];
      const componentKeys = new Set<string>();
      for (const folder of listed.folders) {
        for (const page of folder.pages) {
          if (page.linkedIssues?.includes(input.issue)) {
            pages.push(page);
            for (const cover of page.covers ?? []) componentKeys.add(cover);
          }
        }
      }
      const components: DesignListPageSummary[] = [];
      for (const folder of listed.folders) {
        for (const page of folder.pages) {
          if (componentKeys.has(`${page.folder}/${page.page}`)) components.push(page);
        }
      }
      return { pages, components };
    });

  const withDesignWorktree = <A, E, R>(
    workspaceRoot: string,
    refName: string,
    use: (worktreePath: string) => Effect.Effect<A, E, R>,
  ) =>
    Effect.gen(function* () {
      const worktreeId = (yield* random.uuidV4()).slice(0, 8);
      const worktreePath = path.join(
        path.dirname(workspaceRoot),
        `.trail-design-${path.basename(workspaceRoot)}-${worktreeId}`,
      );
      const created = yield* gitWorkflow
        .createWorktree({ cwd: workspaceRoot, refName, path: worktreePath })
        .pipe(
          Effect.mapError((error) =>
            new DesignFailure({
              code: "save_failed",
              message: `Could not create design worktree: ${error.message ?? String(error)}`,
            }),
          ),
        );
      const cleanup = gitWorkflow.removeWorktree({
        cwd: workspaceRoot,
        path: created.worktree.path,
        force: true,
      });
      return yield* use(created.worktree.path).pipe(Effect.ensuring(Effect.ignore(cleanup)));
    });

  const save = (input: DesignSaveInput) =>
    Effect.gen(function* () {
      const workspaceRoot = yield* resolveProjectRoot(input.projectId);
      if ((yield* gitWorkflow.repositoryRoot(workspaceRoot)) === null) {
        return yield* fail("not_a_git_repo", "This project is not a git repository.");
      }
      for (const page of input.pages) {
        const validation = validateDesignHtml(page.html);
        if (validation !== null) {
          return yield* fail("validation_failed", `${page.page}: ${validation.message}`);
        }
      }
      const defaultBranch = yield* resolveDefaultBranch(workspaceRoot);
      const lock = yield* lockForProject(input.projectId);
      const result = yield* lock.withPermits(1)(
        withDesignWorktree(workspaceRoot, defaultBranch, (worktreePath) =>
          runSave(worktreePath, input, defaultBranch),
        ),
      );
      if (result.changed.length > 0) {
        yield* queueDesignPreviews({
          projectId: input.projectId,
          folder: input.folder,
          pages: result.changed.map((entry) => entry.page),
        });
      }
      return result;
    });

  const runSave = (worktreePath: string, input: DesignSaveInput, defaultBranch: string) =>
    Effect.gen(function* () {
      let manifest = yield* readManifestAt(worktreePath, input.folder);
      manifest = { ...manifest, folder: input.folder };
      if (input.source !== undefined) manifest = { ...manifest, source: input.source };

      const changed: Array<DesignSaveResult["changed"][number]> = [];
      const unchanged: string[] = [];
      const stagedPaths: string[] = [];
      const now = yield* DateTime.now;
      const at = DateTime.formatIso(now);
      const author = input.by ?? "claude";

      for (const entry of input.pages) {
        const rawExisting = manifest.pages[entry.page];
        const existing =
          rawExisting === undefined
            ? undefined
            : yield* decodePageManifest(rawExisting).pipe(Effect.option).pipe(
                Effect.map(Option.getOrUndefined),
              );

        if (existing !== undefined && pageHashMatchesFile(existing, entry.html)) {
          unchanged.push(entry.page);
          continue;
        }

        const htmlFile = defaultPageFile(entry.page);
        const absoluteHtml = htmlPath(worktreePath, input.folder, htmlFile);
        let pageExisting = existing;

        if (existing !== undefined && (yield* fileSystem.exists(absoluteHtml))) {
          const onDisk = yield* fileSystem.readFileString(absoluteHtml);
          const drifted = recordManualDrift(existing, contentHashFromString(onDisk), at);
          if (drifted.versions.length !== existing.versions.length) {
            manifest = { ...manifest, pages: { ...manifest.pages, [entry.page]: drifted } };
            pageExisting = drifted;
          }
        }

        const hash = contentHashFromString(entry.html);
        yield* fileSystem.makeDirectory(path.dirname(absoluteHtml), { recursive: true });
        yield* fileSystem.writeFileString(absoluteHtml, entry.html);
        stagedPaths.push(path.relative(worktreePath, absoluteHtml));

        const updated = applySavePage({
          existing: pageExisting,
          entry,
          commitSha: "pending",
          hash,
          at,
          by: author,
          issue: input.issue,
        });
        manifest = { ...manifest, pages: { ...manifest.pages, [entry.page]: updated } };
        changed.push({
          folder: input.folder,
          page: entry.page,
          n: updated.versions.at(-1)!.n,
          commit: "",
        });
      }

      if (changed.length === 0) return { changed: [], unchanged };

      const manifestAbs = manifestPath(worktreePath, input.folder);
      yield* writeJson(manifestAbs, manifest);
      const manifestRel = path.relative(worktreePath, manifestAbs);
      stagedPaths.push(manifestRel);

      const note =
        input.note ?? input.pages[0]?.note ?? `update ${changed.map((page) => page.page).join(", ")}`;
      const commit = yield* git
        .commit(worktreePath, `design(${input.folder}): ${note}`, "", {
          stage: { filePaths: stagedPaths, unverified: true },
        })
        .pipe(
          Effect.mapError((error) =>
            error instanceof GitVcsDriver.GitNothingToCommitError
              ? new DesignFailure({ code: "save_failed", message: "Nothing to commit." })
              : new DesignFailure({
                  code: "save_failed",
                  message: `Commit failed: ${error.message ?? String(error)}`,
                }),
          ),
        );

      const short = shortSha(commit.commitSha);
      for (const pageKey of changed.map((c) => c.page)) {
        const page = manifest.pages[pageKey] as DesignPageManifest;
        manifest = {
          ...manifest,
          pages: {
            ...manifest.pages,
            [pageKey]: {
              ...page,
              versions: page.versions.map((version) =>
                version.commit === "pending" ? { ...version, commit: short } : version,
              ),
            },
          },
        };
      }
      yield* writeJson(manifestAbs, manifest);
      yield* git
        .commit(worktreePath, `design(${input.folder}): record version commits`, "", {
          stage: { filePaths: [manifestRel], unverified: true },
        })
        .pipe(Effect.ignore);

      const firstPush = yield* Effect.exit(git.pushCurrentBranch(worktreePath, defaultBranch));
      if (Exit.isFailure(firstPush)) {
        const squashed = Cause.squash(firstPush.cause);
        const detail = squashed instanceof Error ? squashed.message : String(squashed);
        if (detail.includes("no git remote")) {
          return {
            changed: changed.map((entry) => ({ ...entry, commit: short })),
            unchanged,
          } satisfies DesignSaveResult;
        }
        yield* git.pullCurrentBranch(worktreePath).pipe(Effect.ignore);
        yield* git.pushCurrentBranch(worktreePath, defaultBranch).pipe(
          Effect.mapError((error) =>
            new DesignFailure({
              code: "save_failed",
              message: `Push rejected after retry: ${error.message ?? String(error)}`,
            }),
          ),
        );
      }

      return {
        changed: changed.map((entry) => ({ ...entry, commit: short })),
        unchanged,
      } satisfies DesignSaveResult;
    });

  const rename = (input: DesignRenameInput) =>
    Effect.gen(function* () {
      const workspaceRoot = yield* resolveProjectRoot(input.projectId);
      const defaultBranch = yield* resolveDefaultBranch(workspaceRoot);
      return yield* withDesignWorktree(workspaceRoot, defaultBranch, (worktreePath) =>
        Effect.gen(function* () {
          const manifest = yield* readManifestAt(worktreePath, input.folder);
          const raw = manifest.pages[input.page];
          if (raw === undefined) {
            return yield* fail("not_found", `Page ${input.folder}/${input.page} was not found.`);
          }
          const page = yield* decodePageManifest(raw);
          if (manifest.pages[input.newPage] !== undefined) {
            return yield* fail("rename_failed", `Page slug ${input.newPage} already exists.`);
          }
          const oldPath = htmlPath(worktreePath, input.folder, page.file);
          const newPath = htmlPath(worktreePath, input.folder, defaultPageFile(input.newPage));
          yield* fileSystem.rename(oldPath, newPath);
          const { [input.page]: moved, ...rest } = manifest.pages;
          const next: DesignFolderManifest = {
            ...manifest,
            pages: {
              ...rest,
              [input.newPage]: { ...(yield* decodePageManifest(moved)), file: defaultPageFile(input.newPage) },
            },
          };
          const manifestAbs = manifestPath(worktreePath, input.folder);
          yield* writeJson(manifestAbs, next);
          const commit = yield* git
            .commit(
              worktreePath,
              `design(${input.folder}): rename ${input.page} → ${input.newPage}`,
              "",
              {
                stage: {
                  filePaths: [
                    path.relative(worktreePath, oldPath),
                    path.relative(worktreePath, newPath),
                    path.relative(worktreePath, manifestAbs),
                  ].filter(Boolean),
                  unverified: true,
                },
              },
            )
            .pipe(
              Effect.mapError((error) =>
                new DesignFailure({ code: "rename_failed", message: error.message ?? String(error) }),
              ),
            );
          yield* git.pushCurrentBranch(worktreePath, defaultBranch).pipe(Effect.ignore);
          return {
            folder: input.folder,
            from: input.page,
            to: input.newPage,
            commit: shortSha(commit.commitSha),
          } satisfies DesignRenameResult;
        }),
      );
    });

  return DesignService.of({ save, list, get, getForIssue, rename });
});

export const layer = Layer.effect(DesignService, make);