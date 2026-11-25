# Briefing: Design store and versioning in Trail (docs/design in the repo)

Status: phases 1–3 implemented in Trail (Nov 2025); phases 4+ open · 25 November 2026
Audience: AI development agent working in `Joeydekruis/trail-v2` (additive fork of T3 Code). Follow the fork rules in `briefing-trail-v2-fork-plan.md`.
Related: `briefing-desktop-issues-board-and-files.md` (Files view), `briefing-opschonen-docs-sync.md` (old docs-sync, superseded by the fork).

## Goal

Claude Design (and other tools) produce HTML designs. Trail must store them in the product repo, version them per page, and make them available to people and agents. The app owns the logic. Claude should not do Git work.

## Decisions (settled in discussion)

1. **Storage: the product repo, under `docs/design/`.** Consistent with the fork plan: docs live in the repo's `docs/` folder for phase 1. Trail adds metadata and views on top.
2. **Structure by page and by component.** One folder per page (with its variants as files) and one `components/` folder. No separate "template" tree.
3. **Version per page, not per canvas.** Claude splits an export into pages. Changing one screen creates a new version of that page only.
4. **No draft or approval state.** Claude Design is the draft space. Nothing reaches the repo until the user says it is ready. Saving = committing.
5. **The default branch is the truth for design intent.** Code is the truth for what is built.
6. **Git history is the version history.** One file per page, no `v001.html` copies. The manifest maps version number to commit and hash so references stay stable.
7. **MCP does the write, the app also has a drop path.** Both end in the same `DesignService`. Claude never touches Git.

## Repo layout (in the product repo, for example Dockyrd)

```
docs/design/
  design.json                # optional root config (tokens file, conventions)
  _shared/tokens.css         # optional shared tokens
  homepage/
    design.json              # manifest for this folder
    desktop.html
    mobile.html
  invoices/
    design.json
    list.html
    detail.html
  components/
    design.json
    buttons.html
    data-table.html
    stat-card.html
```

Rules:
- Folder name = stable slug (`^[a-z0-9]+(-[a-z0-9]+)*$`). File name = stable slug of the page or variant. Renaming a slug is a deliberate operation (see `rename`), never a side effect of a save.
- One manifest per folder, so two folders never conflict on the same file. No committed global index. Trail derives the index from the manifests.
- A component exists once, in `components/`. Pages reference it via `covers`; they do not carry their own copy of the design.
- Pages are self-contained HTML (CSS inlined) by default, so they render anywhere. Shared styles may move to `_shared/` later.
- Previews (PNG) are generated and cached by Trail, not committed.

## Manifest: `docs/design/<folder>/design.json`

```json
{
  "schema": 1,
  "folder": "invoices",
  "title": "Invoices",
  "pages": {
    "list": {
      "file": "list.html",
      "title": "Invoices list",
      "kind": "screen",
      "covers": ["components/data-table", "components/filter-bar"],
      "versions": [
        { "n": 1, "commit": "a1b2c3d", "hash": "sha256:...", "note": "first pass", "at": "2026-11-25T10:00:00Z", "by": "claude" },
        { "n": 2, "commit": "e4f5a6b", "hash": "sha256:...", "note": "denser rows", "at": "2026-11-26T09:30:00Z", "by": "claude" }
      ],
      "links": { "issues": [42], "prs": [51] }
    }
  },
  "source": "Claude Design canvas: Dockyrd"
}
```

- `kind`: `screen` | `template` | `component` | `flow`.
- `covers`: references to other pages or components as `<folder>/<page>`. Used for "which pages use this component" and for returning related designs to agents.
- `versions[].commit` is filled after the commit exists (a follow-up commit or amend within the same save). The current version is the last entry. The file on the default branch always equals the last version's hash.
- Content hash is of the exact stored bytes. Identical hash = no new version.

## Save flow (`DesignService.save`)

Input: project, folder, pages `[{ page, title, kind, covers, html, note }]`, optional `issue`, optional `source`.

1. Validate: slugs, size limit (start at 2 MB per page), HTML parses, page renders standalone in a headless check. A page that fails validation rejects the whole save with a clear error. Do not store broken pages.
2. Compare each page hash with the current version. Skip unchanged pages. If nothing changed, return `{ changed: [] }`.
3. Write changed files and update the folder's `design.json` (append versions, update `covers` and `links`).
4. Commit all changed files in one commit: `design(<folder>): <note>`. This commit is the snapshot of which page versions belong together.
5. Push to the default branch. If the branch is protected or the push is rejected for policy reasons, push `design/<folder>` and open a PR instead.
6. If an `issue` is given, add a comment with permalinks (commit SHA based) and record it in `links.issues`.
7. Queue renders for previews of changed pages.
8. Return `{ changed: [{ folder, page, n, commit }], unchanged: [...] }`.

Implementation notes (verify against T3 code first):
- Do not touch the user's working checkout. Use a short-lived worktree off the default branch, or git plumbing, via `GitWorkflowService` / `GitVcsDriver`. Remove it afterwards.
- Serialize saves per project (a queue). On a rejected push: fetch, replay the design files onto the new head (paths are isolated, so this is trivial), push again. Retry a few times, then fail visibly.
- Writes by hand in the repo are allowed. The next save treats the file's current hash as the parent. If the on-disk hash differs from the manifest's last version, record an extra version with `by: "manual"` before adding the new one.

## Entry points

**A. MCP tools (agents and chat).** New Trail MCP service. Follow the pattern of the existing agent MCP in T3 (`mcp/WorktreeMcpService.ts`) and keep it in our own package.

| Tool | Purpose |
|---|---|
| `save_design` | Input as above. Only changed pages need to be sent. Returns changed/unchanged. |
| `list_designs` | Folders and pages with current version, kind, covers, linked issues. |
| `get_design` | Page content (or path and hash) at `current` or a given version `n`. |
| `get_design_for_issue` | Pages linked to an issue, plus the components they cover. This is what an implementing agent calls. |
| `rename_design` | Deliberate slug rename (moves files, updates `covers`, keeps history by recording the old slug). |

Tool description must tell the model: split an export into one page per screen/template/component sheet; reuse existing slugs (call `list_designs` first); send only changed pages; put new components in `components/`; do not invent a folder when one exists.

For claude.ai chat the MCP needs a reachable endpoint (hosted or tunnelled) with OAuth. Local agents (Cursor, Claude Code run from Trail) use the local server. Out of scope for phase 1: hosting; do the local MCP first.

**B. In-app drop (no MCP).** Drop or paste an exported HTML file in Trail, or point Trail at a watched folder. Trail asks (once, with a suggestion) which folder and page it belongs to. Matching suggestions: `<meta name="trail-design" content="folder/page">` if present, then filename and title similarity, then content similarity to existing pages. One drop = one `DesignService.save` call. A multi-page canvas export can be split in the app by the user (select sections) or by an agent through the same MCP tools.

**C. Agents in a worktree.** An agent that already works in the repo may write files to `docs/design/` itself. Trail's index picks them up on commit; the next `save` or a "Repair manifest" action records the version.

## UI (additive, under `apps/web/src/trail/`)

- **Design view** reachable from the Files area and the Dashboard. Folder list, page list per folder, preview image, current version, linked issues.
- **Page detail:** live preview (sandboxed iframe), version list with note, date, author, "Compare" between two versions (side by side and overlay on the PNG previews; Git diff of the HTML as fallback), "Open in Files".
- **Components view:** all components with a "used by" list from `covers`.
- **Issue drawer (board):** linked designs with a thumbnail and `folder/page@n`.
- Sandbox the preview iframe (no same-origin, no top navigation, scripts allowed only if needed for rendering). Designs are untrusted HTML.

## Where the code goes

- `packages/trail-contracts`: schemas for manifest, save input and results, RPC and MCP tool contracts.
- `packages/trail-server`: `DesignService`, manifest read/write, hashing, validation, preview rendering queue, MCP service.
- `apps/web/src/trail/design/`: routes, views, compare.
- T3 edits only at seams (registering RPC and MCP, mounting routes). Mark `TRAIL-PATCH` and list in `PATCHES.md`.
- Store derived data (preview cache, index) in our own tables or cache directory, not in T3 schemas.

## Phases

1. **Core:** manifest schema, `DesignService.save` with validation, hashing, one commit to the default branch, list/get. Tests with a temp git repo, including unchanged-page skip, failed validation, and push-rejected retry.
2. **MCP:** the five tools on the local server. Test with a Claude Code or Cursor agent saving a two-page design.
3. **UI:** Design view, page detail, version list, preview rendering.
4. **Drop and watch folder.**
5. **Compare, components "used by", issue drawer links.**
6. **Later, optional:** hosted MCP endpoint for claude.ai chat, shared `_shared/tokens.css` extraction, per-page screenshots in PR comments.

## Definition of done (phase 1 to 3)

- An agent can save a multi-page design through MCP, and only changed pages create a new version and a commit.
- Unchanged saves are no-ops. Broken HTML is rejected.
- `docs/design/<folder>/design.json` is consistent with files and Git history after every save, including after a manual edit followed by a save.
- The default branch holds the latest of every page. The user's working checkout is never modified by a save.
- The Design view shows folders, pages, current preview, version list and linked issues.
- `get_design_for_issue` returns the linked pages plus the components they cover.
- All Trail code lives in our own packages. `PATCHES.md` lists every upstream edit.

## Open points

- Do Claude Design exports come as self-contained single HTML files, or with external assets? If assets exist, add an `assets/` folder per page folder and a size policy (or Git LFS for large images).
- Can an export be fetched by URL (share link)? If so, `save_design` can accept `url` instead of `html`, which removes the payload through Claude. Check before building around it.
- Protected default branches: PR fallback is specified, but decide per repo whether auto-merge is wanted.
- Whether `covers` should also link to design tokens in `_shared/` (probably not in phase 1).
- Hosted MCP for claude.ai chat: where it runs, and how it reaches repos for a desktop-first app.