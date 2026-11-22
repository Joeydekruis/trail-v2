# Trail patches in upstream (T3 Code) files

Trail keeps upstream mergeable by limiting edits to T3-owned files and marking each seam with `TRAIL-PATCH` in the source. New Trail UI lives under `apps/web/src/trail/` and new routes under `apps/web/src/routes/`.

When you add or change a seam, update this table in the same PR.

| File                                                                                                       | What                                                                  | Issue / note                                           |
| ---------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------ |
| [`apps/web/src/components/AppSidebarLayout.tsx`](apps/web/src/components/AppSidebarLayout.tsx)             | Wrap sidebar + main in `TrailShell` (project rail + primary nav)      | [#2](https://github.com/Joeydekruis/trail-v2/issues/2) |
| [`apps/web/src/components/sidebar/mainAppLocation.ts`](apps/web/src/components/sidebar/mainAppLocation.ts) | Treat `/board`, `/files`, `/dashboard` as sidebar utility pages       | [#2](https://github.com/Joeydekruis/trail-v2/issues/2) |
| [`apps/web/src/components/sidebar/SidebarChrome.tsx`](apps/web/src/components/sidebar/SidebarChrome.tsx)   | Mobile-only Dashboard / Board / Files links (desktop uses TrailShell) | [#2](https://github.com/Joeydekruis/trail-v2/issues/2) |

## Related issues

1. [Read-only Kanban board](https://github.com/Joeydekruis/trail-v2/issues/1) — done; interim Board sidebar link removed when TrailShell landed
2. [TrailShell, project rail, primary nav](https://github.com/Joeydekruis/trail-v2/issues/2)
3. [`/files` view for repo `docs/`](https://github.com/Joeydekruis/trail-v2/issues/3) — page lives under `apps/web/src/trail/files/`; route `_chat.files` from #2 (no new TRAIL-PATCH)
