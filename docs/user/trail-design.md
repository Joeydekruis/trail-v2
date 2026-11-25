# Design library (Trail)

Trail stores Claude Design HTML in your product repo under `docs/design/`. Versions live in git; each folder has a `design.json` manifest.

## Browse designs

Open **Design library** from the palette icon when browsing `docs/` in Files, or go to `/design` in the app. Pick a folder and page to preview HTML in a sandboxed iframe. Use the version list when a page has more than one saved version.

## Save from an agent

Agents use the T3 MCP tools (`trail_save_design`, `trail_list_designs`, `trail_get_design`, and related tools). Trail validates HTML, commits only changed pages, and pushes when a remote is configured. You do not need to run git yourself.

## Issues and components

Board issues can show **Linked designs** when a manifest lists the issue under `links.issues`. Component pages show **Used by** when screens reference them in `covers`.