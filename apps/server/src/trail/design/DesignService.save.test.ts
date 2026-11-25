import { ProjectId } from "@t3tools/contracts";
import { assert, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";
import * as NodeCrypto from "@effect/platform-node/NodeCrypto";
import * as NodeServices from "@effect/platform-node/NodeServices";
import * as ServerConfig from "../../config.ts";
import * as GitWorkflowService from "../../git/GitWorkflowService.ts";
import * as ProjectService from "../../project/ProjectService.ts";
import * as ProcessRunner from "../../processRunner.ts";
import * as GitVcsDriver from "../../vcs/GitVcsDriver.ts";
import * as VcsProcess from "../../vcs/VcsProcess.ts";
import * as DesignService from "./DesignService.ts";

const projectId = ProjectId.make("project-design-save-test");
const validHtml = "<!DOCTYPE html><html><body>hello</body></html>";

const layerGit = Layer.mergeAll(GitVcsDriver.layerVcs, GitVcsDriver.layer).pipe(
  Layer.provide(ServerConfig.layerTest(process.cwd(), { prefix: "trail-design-save-git-" })),
  Layer.provideMerge(VcsProcess.layer),
  Layer.provideMerge(
    ProcessRunner.layer.pipe(Layer.provide(Layer.mergeAll(NodeServices.layer, NodeCrypto.layer))),
  ),
  Layer.provideMerge(Layer.mergeAll(NodeServices.layer, NodeCrypto.layer)),
);

const initGitRepo = (cwd: string) =>
  Effect.gen(function* () {
    const git = yield* GitVcsDriver.GitVcsDriver;
    const run = (args: readonly string[]) =>
      git.execute({ operation: "DesignService.save.test", cwd, args, timeoutMs: 15_000 });
    yield* run(["init", "-b", "main"]);
    yield* run(["config", "user.email", "design@test.local"]);
    yield* run(["config", "user.name", "Trail Design Test"]);
    yield* run(["commit", "--allow-empty", "-m", "init"]);
  });

const layerSave = (workspaceRoot: string) =>
  DesignService.layer.pipe(
    Layer.provide(
      Layer.mock(ProjectService.ProjectService)({
        getById: () => Effect.succeedSome({ workspaceRoot } as never),
      }),
    ),
    Layer.provide(
      Layer.mock(GitWorkflowService.GitWorkflowService)({
        repositoryRoot: () => Effect.succeed(workspaceRoot),
        resolvePrimaryRemoteName: () => Effect.fail(new Error("no remote")),
        currentBranch: () => Effect.succeed("main"),
        createWorktree: (input) => Effect.succeed({ worktree: { path: input.cwd } } as never),
        removeWorktree: () => Effect.void,
      }),
    ),
    Layer.provide(layerGit),
    Layer.provide(Layer.mergeAll(NodeServices.layer, NodeCrypto.layer)),
  );

const withSaveLayer = (root: string) => <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  effect.pipe(Effect.provide(layerSave(root)));

const layerLiveTest = Layer.mergeAll(NodeServices.layer, NodeCrypto.layer);

it.live("DesignService.save commits new pages and skips unchanged saves", () =>
  Effect.scoped(
    Effect.gen(function* () {
      const fileSystem = yield* FileSystem.FileSystem;
      const root = yield* fileSystem.makeTempDirectoryScoped({ prefix: "trail-design-save-" });
      yield* initGitRepo(root).pipe(Effect.provide(layerGit));
      const saveInput = {
        projectId,
        folder: "homepage",
        pages: [
          {
            page: "desktop",
            title: "Desktop",
            kind: "screen" as const,
            html: validHtml,
          },
        ],
        note: "first pass",
      };
      const first = yield* withSaveLayer(root)(
        Effect.gen(function* () {
          const design = yield* DesignService.DesignService;
          return yield* design.save(saveInput);
        }),
      );

      assert.strictEqual(first.changed.length, 1);
      assert.strictEqual(first.changed[0]?.page, "desktop");
      assert.strictEqual(first.unchanged.length, 0);
      assert.strictEqual(yield* fileSystem.exists(`${root}/docs/design/homepage/desktop.html`), true);
      assert.strictEqual(yield* fileSystem.exists(`${root}/docs/design/homepage/design.json`), true);

      const second = yield* withSaveLayer(root)(
        Effect.gen(function* () {
          const design = yield* DesignService.DesignService;
          return yield* design.save(saveInput);
        }),
      );

      assert.deepEqual(second.changed, []);
      assert.deepEqual(second.unchanged, ["desktop"]);
    }),
  ).pipe(Effect.provide(layerLiveTest)),
);

it.live("DesignService.save records manual drift before a new agent version", () =>
  Effect.scoped(
    Effect.gen(function* () {
      const fileSystem = yield* FileSystem.FileSystem;
      const root = yield* fileSystem.makeTempDirectoryScoped({ prefix: "trail-design-drift-" });
      yield* initGitRepo(root).pipe(Effect.provide(layerGit));
      const base = {
        projectId,
        folder: "homepage",
        pages: [
          {
            page: "desktop",
            title: "Desktop",
            kind: "screen" as const,
            html: validHtml,
          },
        ],
      };
      yield* withSaveLayer(root)(
        Effect.gen(function* () {
          const design = yield* DesignService.DesignService;
          yield* design.save(base);
        }),
      );
      yield* fileSystem.writeFileString(
        `${root}/docs/design/homepage/desktop.html`,
        "<!DOCTYPE html><html><body>hand-edited</body></html>",
      );
      yield* withSaveLayer(root)(
        Effect.gen(function* () {
          const design = yield* DesignService.DesignService;
          return yield* design.save({
            ...base,
            pages: [{ ...base.pages[0]!, html: "<!DOCTYPE html><html><body>agent v2</body></html>" }],
          });
        }),
      );
      const manifest = JSON.parse(
        yield* fileSystem.readFileString(`${root}/docs/design/homepage/design.json`),
      ) as {
        pages: { desktop: { versions: Array<{ by: string; n: number }> } };
      };
      assert.strictEqual(manifest.pages.desktop.versions.length, 3);
      assert.strictEqual(manifest.pages.desktop.versions[1]?.by, "manual");
      assert.strictEqual(manifest.pages.desktop.versions[2]?.n, 3);
    }).pipe(Effect.provide(layerLiveTest)),
  ),
);

it.live("DesignService.save records a new version when html changes", () =>
  Effect.scoped(
    Effect.gen(function* () {
      const fileSystem = yield* FileSystem.FileSystem;
      const root = yield* fileSystem.makeTempDirectoryScoped({ prefix: "trail-design-save-" });
      yield* initGitRepo(root).pipe(Effect.provide(layerGit));
      const base = {
        projectId,
        folder: "homepage",
        pages: [
          {
            page: "desktop",
            title: "Desktop",
            kind: "screen" as const,
            html: validHtml,
          },
        ],
      };
      yield* withSaveLayer(root)(
        Effect.gen(function* () {
          const design = yield* DesignService.DesignService;
          yield* design.save(base);
        }),
      );

      const updated = yield* withSaveLayer(root)(
        Effect.gen(function* () {
          const design = yield* DesignService.DesignService;
          return yield* design.save({
            ...base,
            pages: [{ ...base.pages[0]!, html: "<!DOCTYPE html><html><body>v2</body></html>" }],
          });
        }),
      );

      assert.strictEqual(updated.changed.length, 1);
      assert.strictEqual(updated.changed[0]?.n, 2);
      const raw = yield* fileSystem.readFileString(`${root}/docs/design/homepage/design.json`);
      assert.ok(raw.includes('"n": 2'));
    }),
  ).pipe(Effect.provide(layerLiveTest)),
);