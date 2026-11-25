# Trail patches in upstream (T3 Code) files

Trail keeps upstream mergeable by limiting edits to T3-owned files and marking each seam with `TRAIL-PATCH` in the source. New Trail UI lives under `apps/web/src/trail/` and new routes under `apps/web/src/routes/`.

When you add or change a seam, update this table in the same PR.

| File                                                                                                                           | What                                                                  | Issue / note                                           |
| ------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------- | ------------------------------------------------------ |
| [`apps/web/src/components/AppSidebarLayout.tsx`](apps/web/src/components/AppSidebarLayout.tsx)                                 | Wrap sidebar + main in `TrailShell` (project rail + primary nav)      | [#2](https://github.com/Joeydekruis/trail-v2/issues/2) |
| [`apps/web/src/components/sidebar/mainAppLocation.ts`](apps/web/src/components/sidebar/mainAppLocation.ts)                     | Treat `/board`, `/files`, `/dashboard` as sidebar utility pages       | [#2](https://github.com/Joeydekruis/trail-v2/issues/2) |
| [`apps/web/src/components/sidebar/SidebarChrome.tsx`](apps/web/src/components/sidebar/SidebarChrome.tsx)                       | Mobile-only Dashboard / Board / Files links (desktop uses TrailShell) | [#2](https://github.com/Joeydekruis/trail-v2/issues/2) |
| [`scripts/setup-worktree.ts`](scripts/setup-worktree.ts)                                                                       | After worktree setup, run `ensure-trail-forge-default.ts`             | Forge / PR base                                        |
| [`AGENTS.md`](AGENTS.md)                                                                                                       | Trail fork section + PR rules override upstream defaults              | Forge / PR base                                        |
| [`CONTRIBUTING.md`](CONTRIBUTING.md)                                                                                           | Banner: PRs only to `Joeydekruis/trail-v2`                            | Forge / PR base                                        |
| [`package.json`](package.json)                                                                                                 | `prepare` runs forge ensure; `trail:pr:create` / `trail:forge:ensure` | Forge / PR base                                        |
| [`scripts/hooks/pre-push`](scripts/hooks/pre-push)                                                                             | Blocks push to upstream / pingdotgg/t3code                            | Forge / PR base                                        |
| [`packages/contracts/src/settings.ts`](packages/contracts/src/settings.ts)                                                     | Project setting `trailBoardAutopilotEnabled` (board Todo autopilot)   | [#8](https://github.com/Joeydekruis/trail-v2/issues/8) |
| [`apps/web/src/components/settings/ProjectDefaultsSettings.tsx`](apps/web/src/components/settings/ProjectDefaultsSettings.tsx) | Import `TrailProjectBoardSettingsRow` in project defaults             | [#8](https://github.com/Joeydekruis/trail-v2/issues/8) |
| [`apps/web/src/components/issue/IssueDetailPanel.tsx`](apps/web/src/components/issue/IssueDetailPanel.tsx)                       | Optional `headerTrailingActions` after issue refresh (Start task)     | [#8](https://github.com/Joeydekruis/trail-v2/issues/8) |
| [`apps/web/src/components/settings/settingsSearch.ts`](apps/web/src/components/settings/settingsSearch.ts)                         | Settings search id `trail-board-autopilot`                            | [#8](https://github.com/Joeydekruis/trail-v2/issues/8) |
| [`apps/server/src/server.ts`](apps/server/src/server.ts)                                                                         | Mount `TrailFeedbackHttp` (`/api/trail/feedback/*`)                     | Trail Feedback extension |
| [`apps/server/src/orchestration-v2/runtimeLayer.ts`](apps/server/src/orchestration-v2/runtimeLayer.ts)                             | Register `TrailFeedbackService`                                       | Trail Feedback extension |
| [`apps/web/src/branding.ts`](apps/web/src/branding.ts), [`apps/web/vite.config.ts`](apps/web/vite.config.ts), [`apps/web/index.html`](apps/web/index.html) | Product name `TRAIL` + dev/prod splash via `apple-touch-icon` | Branding |
| [`apps/desktop/src/app/DesktopEnvironment.ts`](apps/desktop/src/app/DesktopEnvironment.ts), [`apps/desktop/scripts/electron-launcher.mjs`](apps/desktop/scripts/electron-launcher.mjs), [`apps/desktop/package.json`](apps/desktop/package.json) | Desktop shell name + dev (blueprint) vs packaged icon paths | Branding |
| [`scripts/build-desktop-artifact.ts`](scripts/build-desktop-artifact.ts)                                                         | Installer/product name uses `TRAIL`                                   | Branding |
| [`apps/web/src/components/sidebar/SidebarChrome.tsx`](apps/web/src/components/sidebar/SidebarChrome.tsx)                             | Sidebar home brand wordmark                                           | Branding |

## Related issues

1. [Read-only Kanban board](https://github.com/Joeydekruis/trail-v2/issues/1) — done; interim Board sidebar link removed when TrailShell landed
2. [TrailShell, project rail, primary nav](https://github.com/Joeydekruis/trail-v2/issues/2)
3. [`/files` view for repo `docs/`](https://github.com/Joeydekruis/trail-v2/issues/3)
