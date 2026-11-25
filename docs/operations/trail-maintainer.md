# Trail maintainer runbook

Procedures for this fork only. Upstream T3’s full release train lives in [release.md](./release.md). Fork strategy lives in [FORK_PLAN.md](../FORK_PLAN.md).

## Calendar

| When                                       | What                                                                                            |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| **Weekly** (pick a fixed day, e.g. Monday) | [Sync `upstream/main`](#weekly-upstream-sync) into `main`                                       |
| **When you want a new installable build**  | [Unsigned desktop release](#unsigned-desktop-releases-mac-and-windows) on each platform you use |

Track the last successful upstream sync in [sync-log.md](./trail-sync-log.md).

---

## Weekly upstream sync

Stay mergeable with [pingdotgg/t3code](https://github.com/pingdotgg/t3code) by **merging** `upstream/main` into **this repo’s `main`**. Do **not** rebase Trail onto upstream.

### Before you start

- `upstream` remote points at `https://github.com/pingdotgg/t3code.git` (**fetch only**; never push).
- Trail-only seams are listed in [PATCHES.md](../../PATCHES.md); new UI lives under `apps/web/src/trail/` and new routes under `apps/web/src/routes/`.
- Enable reusable conflict resolutions once per machine: `git config rerere.enabled true`.
- Pull requests must target **this fork only** ([Joeydekruis/trail-v2](https://github.com/Joeydekruis/trail-v2)). See [Pull requests stay on Trail](#pull-requests-stay-on-trail).

---

## Pull requests stay on Trail

T3 (and `gh`) treat a clone that has both `origin` and `upstream` as a **contributor fork**: without an explicit default they prefer `upstream`, so `pull_request_create` / `gh pr create` can open PRs against [pingdotgg/t3code](https://github.com/pingdotgg/t3code). Trail is not that workflow. PRs always go to **`Joeydekruis/trail-v2`**.

### One-time setup (each machine / fresh clone)

```sh
# 1. Pin the PR / forge base to origin (sets remote.origin.gh-resolved=base).
#    T3's RepositoryIdentityResolver honors this mark over the upstream-first default.
gh repo set-default Joeydekruis/trail-v2

# 2. Disable pushes to upstream (fetch still works).
git remote set-url --push upstream DISABLE
```

Verify:

```sh
gh repo set-default -v
# → Joeydekruis/trail-v2

git config --get remote.origin.gh-resolved
# → base

git remote -v
# upstream … (fetch) and upstream DISABLE (push)
```

Worktrees share this local git config with the main checkout.

### Agents and humans

- **Never open a PR on `pingdotgg/t3code`.** If one was created by mistake, close it on GitHub immediately and reopen on Trail only.
- Open PRs with base **`Joeydekruis/trail-v2`** (`origin`) only. From the CLI use `vp run trail:pr:create` or `gh pr create --repo Joeydekruis/trail-v2` (never bare `gh pr create`).
- Prefer T3 `pull_request_create` only after the mark above is set; if a tool still targets upstream, stop and run `vp run trail:forge:ensure`.
- Do **not** run `gh repo set-default` against `pingdotgg/t3code` in this clone.

### Enforcement (automatic)

`vp i` and worktree setup run `scripts/ensure-trail-forge-default.ts`, which:

- Pins `gh repo set-default` to `Joeydekruis/trail-v2` and `remote.origin.gh-resolved=base`
- Clears `remote.upstream.gh-resolved` (otherwise PR tools prefer upstream)
- Sets `remote.pushDefault` / `push.remote` to `origin` and disables `upstream` push
- Installs **`scripts/hooks/pre-push`** via `core.hooksPath` — **`git push upstream` and any push URL containing `pingdotgg/t3code` are rejected**

Re-run anytime: `vp run trail:forge:ensure`.

### Checklist

1. **See how far behind you are**

   ```sh
   git fetch upstream
   git rev-list --left-right --count main...upstream/main
   ```

   Output is `A	B`: **A** = Trail-only commits on `main`, **B** = commits on `upstream/main` you do not have yet.

2. **Merge**

   ```sh
   git checkout main
   git merge upstream/main -m "merge: sync t3code main"
   ```

3. **Resolve conflicts**

   | Kind                                                  | Rule                                                                                                                            |
   | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
   | `pnpm-lock.yaml`, workspace lockfiles                 | Take **upstream**, then `vp i`                                                                                                  |
   | `apps/web/src/routeTree.gen.ts`                       | Take **upstream**, regenerate if your routes changed (`vp run --filter @t3tools/web dev` once or the repo’s route codegen task) |
   | `TRAIL-PATCH` files in [PATCHES.md](../../PATCHES.md) | Resolve by hand; keep Trail behaviour                                                                                           |
   | New Trail-only files                                  | Keep yours                                                                                                                      |

4. **Verify**

   ```sh
   vp run check:changed
   ```

   At minimum after a large merge: `vp run typecheck` and `vp run dev:desktop` or `vp run dev`.

5. **Record and publish**
   - Append a row to [trail-sync-log.md](./trail-sync-log.md) (date, upstream SHA, notes).
   - `git push origin main`

### If you skip a week

Do the checklist as soon as you can. The **B** count in step 1 grows quickly; merges stay easier below ~30 commits of drift.

### Urgent upstream fix (between weekly merges)

```sh
git fetch upstream
git cherry-pick <upstream-commit-sha>
git push origin main
```

---

## Unsigned desktop releases (Mac and Windows)

Trail does **not** run upstream’s [release.yml](../../.github/workflows/release.yml) (repo gate on `pingdotgg/t3code`). For now, **build on real hardware** per platform and install from the repo’s `release/` folder (or attach artifacts to a [GitHub Release](https://github.com/Joeydekruis/trail-v2/releases) by hand).

Unsigned builds are **free** (no Apple/Azure signing required). SmartScreen / Gatekeeper warnings are expected.

### Shared prerequisites

```sh
source ~/.config/vite-plus/env   # or add to ~/.zshrc / PowerShell profile
cd /path/to/trail-v2
vp i
```

Install details: [development.md](./development.md#first-checkout) and [desktop artifacts](./development.md#desktop-artifacts).

### macOS (DMG)

**Host must be macOS.**

```sh
vp run dist:desktop:dmg          # default arch (Apple Silicon → arm64)
# or
vp run dist:desktop:dmg:arm64
```

- **Output:** `release/` (`.dmg` and staging files).
- **Install:** open DMG → drag app to Applications. If blocked: right-click → Open, or `xattr -cr "/Applications/T3 Code.app"` (name may include “Beta”).
- **Extra:** Xcode Command Line Tools, Rust (resource monitor). See [macOS DMG prerequisites](./development.md#macos-dmg-prerequisites).

### Windows (NSIS installer)

**Host must be Windows** (you cannot produce a Windows installer from macOS).

```powershell
vp run dist:desktop:win          # host arch
vp run dist:desktop:win:x64      # explicit x64
```

- **Output:** `release/` (`.exe` installer).
- **Install:** run installer; on SmartScreen choose **More info** → **Run anyway**.
- **Extra:** Rust, Python 3, VS Build Tools with C++. See [Windows installer prerequisites](./development.md#windows-installer-prerequisites).
- **WSL remotes:** full T3 releases bundle a Linux CLI archive. Local builds can pass `--wsl-runtime` when needed; see [release.md — Windows payload](./release.md#windows-payload-topology-and-update-validation).

### After building

Optional smoke (on the machine that built it):

```sh
# macOS / Linux CI pattern — unpackaged dev binary
electron=$(node -p "require('./apps/desktop/node_modules/electron')")
node scripts/smoke-desktop-app.ts --executable "$electron" --app apps/desktop
```

For a packaged build, point `--executable` at the built `.app` / installer output (see [README](../../README.md#desktop-how-we-test)).

### Versioning and GitHub Releases (manual)

1. Tag on `main`, e.g. `git tag v0.0.1-trail.1`.
2. Upload `release/*` assets to a new GitHub Release for that tag.
3. **Auto-update** will not point at Trail until build-time repo slug and `latest-*.yml` manifests exist ([FORK_PLAN](../FORK_PLAN.md#deployment)). Until then, reinstall when you ship a new build.

### Planned automation

- `trail-release.yml`: macOS arm64 + Windows x64 on GitHub Actions, unsigned, upload to Releases.
- Repoint updater + Trail app IDs so installs do not collide with stock T3 Code.

---

## Quick links

| Doc                                      | Purpose                                 |
| ---------------------------------------- | --------------------------------------- |
| [FORK_PLAN.md](../FORK_PLAN.md)          | Why we fork, phases, deployment backlog |
| [PATCHES.md](../../PATCHES.md)           | Seams in upstream files                 |
| [trail-sync-log.md](./trail-sync-log.md) | Weekly merge history                    |
| [development.md](./development.md)       | Dev setup and artifact prerequisites    |
| [release.md](./release.md)               | How T3 upstream ships (reference)       |
