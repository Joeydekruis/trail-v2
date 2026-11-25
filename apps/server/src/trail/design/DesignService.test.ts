import { ProjectId } from "@t3tools/contracts";
import { assert, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as FileSystem from "effect/FileSystem";
import * as NodeCrypto from "@effect/platform-node/NodeCrypto";
import * as NodeServices from "@effect/platform-node/NodeServices";
import * as DesignService from "./DesignService.ts";
import * as GitWorkflowService from "../../git/GitWorkflowService.ts";
import * as ProjectService from "../../project/ProjectService.ts";
import * as GitVcsDriver from "../../vcs/GitVcsDriver.ts";

const projectId = ProjectId.make("project-design-test");

const layerTest = (
  workspaceRoot: string,
  git?: Partial<Layer.Layer.Success<typeof GitVcsDriver.GitVcsDriver>>,
) =>
  DesignService.layer.pipe(
    Layer.provide(
      Layer.mock(ProjectService.ProjectService)({
        getById: () => Effect.succeedSome({ workspaceRoot } as never),
      }),
    ),
    Layer.provide(
      Layer.mock(GitWorkflowService.GitWorkflowService)({
        repositoryRoot: () => Effect.succeed(workspaceRoot),
        resolvePrimaryRemoteName: () => Effect.fail("no remote" as never),
        currentBranch: () => Effect.succeed("main"),
      }),
    ),
    Layer.provide(
      Layer.mock(GitVcsDriver.GitVcsDriver)({
        execute: () =>
          Effect.succeed({
            exitCode: 1,
            stdout: "",
            stderr: "",
            stdoutTruncated: false,
            stderrTruncated: false,
          }),
        ...(git ?? {}),
      }),
    ),
    Layer.provide(Layer.mergeAll(NodeServices.layer, NodeCrypto.layer)),
  );

it.layer(NodeServices.layer)("DesignService.list", (it) => {
  it.effect("returns empty folders when docs/design is missing", () =>
    Effect.scoped(
      Effect.gen(function* () {
        const fileSystem = yield* FileSystem.FileSystem;
        const root = yield* fileSystem.makeTempDirectoryScoped({ prefix: "trail-design-list-" });
        return yield* Effect.gen(function* () {
          const design = yield* DesignService.DesignService;
          const result = yield* design.list(projectId);
          assert.deepEqual(result.folders, []);
          assert.strictEqual(yield* fileSystem.exists(`${root}/docs/design`), false);
        }).pipe(Effect.provide(layerTest(root)));
      }),
    ),
  );

  it.effect("lists folder manifests from docs/design", () =>
    Effect.scoped(
      Effect.gen(function* () {
        const fileSystem = yield* FileSystem.FileSystem;
        const root = yield* fileSystem.makeTempDirectoryScoped({ prefix: "trail-design-list-" });
        const manifestDir = `${root}/docs/design/homepage`;
        yield* fileSystem.makeDirectory(manifestDir, { recursive: true });
        yield* fileSystem.writeFileString(
          `${manifestDir}/design.json`,
          JSON.stringify({
            schema: 1,
            folder: "homepage",
            title: "Homepage",
            pages: {
              desktop: {
                file: "desktop.html",
                title: "Desktop",
                kind: "screen",
                versions: [
                  {
                    n: 1,
                    commit: "abc1234",
                    hash: "sha256:00",
                    at: "2026-11-25T10:00:00.000Z",
                    by: "claude",
                  },
                ],
              },
            },
          }),
        );
        return yield* Effect.gen(function* () {
          const design = yield* DesignService.DesignService;
          const result = yield* design.list(projectId);
          assert.strictEqual(result.folders.length, 1);
          assert.strictEqual(result.folders[0]?.folder, "homepage");
          assert.strictEqual(result.folders[0]?.pages[0]?.page, "desktop");
        }).pipe(Effect.provide(layerTest(root)));
      }),
    ),
  );

  it.effect("reads page html from disk", () =>
    Effect.scoped(
      Effect.gen(function* () {
        const fileSystem = yield* FileSystem.FileSystem;
        const root = yield* fileSystem.makeTempDirectoryScoped({ prefix: "trail-design-get-" });
        const manifestDir = `${root}/docs/design/homepage`;
        yield* fileSystem.makeDirectory(manifestDir, { recursive: true });
        yield* fileSystem.writeFileString(
          `${manifestDir}/desktop.html`,
          "<!DOCTYPE html><html><body>hello</body></html>",
        );
        yield* fileSystem.writeFileString(
          `${manifestDir}/design.json`,
          JSON.stringify({
            schema: 1,
            folder: "homepage",
            pages: {
              desktop: {
                file: "desktop.html",
                title: "Desktop",
                kind: "screen",
                versions: [
                  {
                    n: 1,
                    commit: "abc1234",
                    hash: "sha256:00",
                    at: "2026-11-25T10:00:00.000Z",
                    by: "claude",
                  },
                ],
              },
            },
          }),
        );
        return yield* Effect.gen(function* () {
          const design = yield* DesignService.DesignService;
          const result = yield* design.get({
            projectId,
            folder: "homepage",
            page: "desktop",
          });
          assert.strictEqual(result.html, "<!DOCTYPE html><html><body>hello</body></html>");
          assert.strictEqual(result.versions.length, 1);
        }).pipe(Effect.provide(layerTest(root)));
      }),
    ),
  );

  it.effect("rejects invalid html before git work", () =>
    Effect.gen(function* () {
      const design = yield* DesignService.DesignService;
      const failure = yield* design
        .save({
          projectId,
          folder: "homepage",
          pages: [
            {
              page: "desktop",
              title: "Desktop",
              kind: "screen",
              html: "plain text without html root",
            },
          ],
        })
        .pipe(Effect.flip);
      assert.strictEqual(failure.code, "validation_failed");
    }).pipe(Effect.provide(layerTest("/tmp/trail-design-validation"))),
  );

  it.effect("loads historical html from git show", () =>
    Effect.scoped(
      Effect.gen(function* () {
        const fileSystem = yield* FileSystem.FileSystem;
        const root = yield* fileSystem.makeTempDirectoryScoped({ prefix: "trail-design-git-" });
        const manifestDir = `${root}/docs/design/homepage`;
        yield* fileSystem.makeDirectory(manifestDir, { recursive: true });
        yield* fileSystem.writeFileString(
          `${manifestDir}/desktop.html`,
          "<!DOCTYPE html><html><body>v2</body></html>",
        );
        yield* fileSystem.writeFileString(
          `${manifestDir}/design.json`,
          JSON.stringify({
            schema: 1,
            folder: "homepage",
            pages: {
              desktop: {
                file: "desktop.html",
                title: "Desktop",
                kind: "screen",
                versions: [
                  {
                    n: 1,
                    commit: "aaaaaaa",
                    hash: "sha256:01",
                    at: "2026-11-25T10:00:00.000Z",
                    by: "claude",
                  },
                  {
                    n: 2,
                    commit: "bbbbbbb",
                    hash: "sha256:02",
                    at: "2026-11-25T11:00:00.000Z",
                    by: "claude",
                  },
                ],
              },
            },
          }),
        );
        return yield* Effect.gen(function* () {
          const design = yield* DesignService.DesignService;
          const result = yield* design.get({
            projectId,
            folder: "homepage",
            page: "desktop",
            version: 1,
          });
          assert.strictEqual(result.html, "<!DOCTYPE html><html><body>v1</body></html>");
        }).pipe(
          Effect.provide(
            layerTest(root, {
              execute: (input) => {
                const spec = String(input.args.at(-1) ?? "");
                return input.args[0] === "show" && spec.startsWith("aaaaaaa:")
                  ? Effect.succeed({
                      exitCode: 0,
                      stdout: "<!DOCTYPE html><html><body>v1</body></html>",
                      stderr: "",
                      stdoutTruncated: false,
                      stderrTruncated: false,
                    })
                  : Effect.die(new Error(`unexpected git call: ${input.args.join(" ")}`));
              },
            }),
          ),
        );
      }),
    ),
  );

  it.effect("getForIssue returns pages linked to issue and cover components", () =>
    Effect.scoped(
      Effect.gen(function* () {
        const fileSystem = yield* FileSystem.FileSystem;
        const root = yield* fileSystem.makeTempDirectoryScoped({ prefix: "trail-design-issue-" });
        const manifestDir = `${root}/docs/design/flow`;
        yield* fileSystem.makeDirectory(manifestDir, { recursive: true });
        yield* fileSystem.writeFileString(
          `${manifestDir}/design.json`,
          JSON.stringify({
            schema: 1,
            folder: "flow",
            pages: {
              checkout: {
                file: "checkout.html",
                title: "Checkout",
                kind: "screen",
                covers: ["flow/button-primary"],
                links: { issues: [42] },
                versions: [
                  {
                    n: 1,
                    commit: "abc1234",
                    hash: "sha256:00",
                    at: "2026-11-25T10:00:00.000Z",
                    by: "claude",
                  },
                ],
              },
              "button-primary": {
                file: "button-primary.html",
                title: "Button",
                kind: "component",
                versions: [
                  {
                    n: 1,
                    commit: "def5678",
                    hash: "sha256:11",
                    at: "2026-11-25T10:00:00.000Z",
                    by: "claude",
                  },
                ],
              },
            },
          }),
        );
        return yield* Effect.gen(function* () {
          const design = yield* DesignService.DesignService;
          const result = yield* design.getForIssue({ projectId, issue: 42 });
          assert.strictEqual(result.pages.length, 1);
          assert.strictEqual(result.pages[0]?.page, "checkout");
          assert.strictEqual(result.components.length, 1);
          assert.strictEqual(result.components[0]?.page, "button-primary");
        }).pipe(Effect.provide(layerTest(root)));
      }),
    ),
  );
});