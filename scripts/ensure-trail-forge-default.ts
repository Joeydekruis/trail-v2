// @effect-diagnostics nodeBuiltinImport:off
/**
 * Trail fork only: pin `gh` and git forge resolution to origin so PR tools do not
 * default to pingdotgg/t3code when an `upstream` remote exists. Installs pre-push guard.
 */
import * as NodeChildProcess from "node:child_process";
import * as NodeFS from "node:fs";
import * as NodePath from "node:path";

const TRAIL_REPO = "Joeydekruis/trail-v2";
const UPSTREAM_HOST_PATH = "github.com/pingdotgg/t3code";
const BLOCKED_PUSH_HOST_PATH = "pingdotgg/t3code";

function run(command: string, args: readonly string[], cwd: string): { ok: boolean; out: string } {
  const result = NodeChildProcess.spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const out = `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();
  return { ok: result.status === 0, out };
}

function setLocalConfig(cwd: string, key: string, value: string): void {
  run("git", ["config", key, value], cwd);
}

const worktree = process.cwd();
const remotes = run("git", ["remote", "-v"], worktree);
if (!remotes.ok) {
  process.stderr.write("ensure-trail-forge-default: not a git repo, skipping.\n");
  process.exit(0);
}

const hasUpstream = remotes.out.includes(UPSTREAM_HOST_PATH);
const originIsTrail =
  remotes.out.includes("Joeydekruis/trail-v2") || remotes.out.includes("trail-v2");

if (!hasUpstream || !originIsTrail) {
  process.exit(0);
}

const pushUpstream = run("git", ["remote", "get-url", "--push", "upstream"], worktree);
if (pushUpstream.ok && pushUpstream.out !== "DISABLE") {
  const set = run("git", ["remote", "set-url", "--push", "upstream", "DISABLE"], worktree);
  if (!set.ok) {
    process.stderr.write(`ensure-trail-forge-default: could not disable upstream push: ${set.out}\n`);
  }
}

// Without remote.origin.gh-resolved=base, T3/gh rank "upstream" above "origin" for PR tools.
setLocalConfig(worktree, "remote.pushDefault", "origin");
setLocalConfig(worktree, "push.remote", "origin");
setLocalConfig(worktree, "push.default", "current");
run("git", ["config", "--unset-all", "remote.upstream.gh-resolved"], worktree);
run("git", ["config", "--unset-all", "remote.github.gh-resolved"], worktree);

const hooksDir = NodePath.join(worktree, "scripts", "hooks");
const prePush = NodePath.join(hooksDir, "pre-push");
if (NodeFS.existsSync(prePush)) {
  try {
    NodeFS.chmodSync(prePush, 0o755);
  } catch {
    // best-effort on platforms that restrict chmod
  }
  const hooksPath = run("git", ["config", "--get", "core.hooksPath"], worktree);
  const relativeHooks = "scripts/hooks";
  if (!hooksPath.ok || !hooksPath.out.endsWith(relativeHooks)) {
    setLocalConfig(worktree, "core.hooksPath", relativeHooks);
  }
}

const originPush = run("git", ["remote", "get-url", "--push", "origin"], worktree);
if (originPush.ok && originPush.out.includes(BLOCKED_PUSH_HOST_PATH)) {
  process.stderr.write(
    "ensure-trail-forge-default: ERROR — origin push URL points at pingdotgg/t3code. Fix before pushing or opening PRs.\n",
  );
  process.exit(1);
}

if (!run("gh", ["--version"], worktree).ok) {
  process.exit(0);
}

const current = run("gh", ["repo", "set-default", "-v"], worktree);
if (!current.ok || !current.out.includes(TRAIL_REPO)) {
  const pin = run("gh", ["repo", "set-default", TRAIL_REPO], worktree);
  if (!pin.ok) {
    process.stderr.write(
      `ensure-trail-forge-default: run manually: gh repo set-default ${TRAIL_REPO}\n${pin.out}\n`,
    );
    process.exit(0);
  }
}

const ghResolved = run("git", ["config", "--get", "remote.origin.gh-resolved"], worktree);
if (!ghResolved.ok || ghResolved.out !== "base") {
  process.stderr.write(
    `ensure-trail-forge-default: expected remote.origin.gh-resolved=base after gh set-default (got ${JSON.stringify(ghResolved.out)}).\n`,
  );
}

const upstreamResolved = run("git", ["config", "--get", "remote.upstream.gh-resolved"], worktree);
if (upstreamResolved.ok) {
  process.stderr.write(
    "ensure-trail-forge-default: removed remote.upstream.gh-resolved (must not steal PR base from origin).\n",
  );
}

process.stdout.write(
  `Trail forge: ${TRAIL_REPO} only — no push/PR to pingdotgg/t3code (pre-push hook on scripts/hooks).\n`,
);