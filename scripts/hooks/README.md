# Git hooks (Trail fork)

Installed locally by `scripts/ensure-trail-forge-default.ts` (`core.hooksPath = scripts/hooks`).

**`pre-push`** blocks any push to `upstream` or any URL containing `pingdotgg/t3code`, and refuses pushes when `origin` was repointed at upstream by mistake.

This does not intercept `gh pr create`; pair it with `gh repo set-default Joeydekruis/trail-v2` and `--repo Joeydekruis/trail-v2` when using the CLI.