# Upstream sync log

Record each merge of `upstream/main` into Trail `main`. Newest entries at the top.

| Date       | Upstream SHA (after merge) | Trail-only commits                           | Notes                                                          |
| ---------- | -------------------------- | -------------------------------------------- | -------------------------------------------------------------- |
| 2026-11-22 | `7e3a9ba1b9b`              | 2 on `main` (INIT + docs/seams before merge) | First documented weekly sync; clean merge, 25 upstream commits |

**How to fill a row:** after a successful merge, use `git rev-parse upstream/main` for the SHA and `git rev-list --count main ^upstream/main` (before merge) or your merge message for context.
