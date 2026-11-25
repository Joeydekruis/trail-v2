import { useGT, T } from "gt-react";
import { CopyIcon, FolderGit2Icon, FolderIcon } from "lucide-react";

import { useCopyToClipboard } from "../../hooks/useCopyToClipboard";
import { MiddleTruncate } from "../../components/ui/middle-truncate";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../../components/ui/tooltip";

import { resolveTrailFilesScope, type TrailFilesScopeMode } from "./trailSidebarFilesScope.logic";

export function TrailFilesScopeBar({
  cwd,
  worktreePath,
  branch,
  projectName,
}: {
  readonly cwd: string;
  readonly worktreePath: string | null;
  readonly branch: string | null;
  readonly projectName: string;
}) {
  const gt = useGT();
  const scope = resolveTrailFilesScope({ cwd, worktreePath, branch, projectName });
  const { copyToClipboard, isCopied } = useCopyToClipboard<{ path: string }>();

  return (
    <div
      className="shrink-0 px-2 pb-1 pt-0.5"
      data-trail-files-scope=""
      data-trail-files-scope-mode={scope.mode}
    >
      <div className="flex items-start gap-2 rounded-md border border-[color:var(--trail-border)] bg-[color:var(--trail-card)] px-2 py-1.5">
        <ScopeIcon mode={scope.mode} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-foreground">{scope.headline}</p>
          <p className="text-2xs text-muted-foreground">
            {scope.mode === "worktree" ? (
              <T context="files sidebar scope label">Worktree folder</T>
            ) : (
              <T context="files sidebar scope label">Project root</T>
            )}
          </p>
          <MiddleTruncate
            className="mt-0.5 block font-mono text-2xs text-muted-foreground"
            value={scope.pathLabel}
          />
        </div>
        <Tooltip>
          <TooltipTrigger
            render={
              <button
                type="button"
                className="shrink-0 rounded p-1 text-muted-foreground transition-colors hover:bg-sidebar-row-hover hover:text-foreground"
                aria-label={gt("Copy folder path")}
                onClick={() => copyToClipboard(scope.pathLabel, { path: scope.pathLabel })}
              />
            }
          >
            <CopyIcon className="size-3.5" />
          </TooltipTrigger>
          <TooltipPopup side="right">
            {isCopied ? gt("Copied") : gt("Copy folder path")}
          </TooltipPopup>
        </Tooltip>
      </div>
    </div>
  );
}

function ScopeIcon({ mode }: { readonly mode: TrailFilesScopeMode }) {
  const className = "mt-0.5 size-3.5 shrink-0 text-muted-foreground";
  if (mode === "worktree") {
    return <FolderGit2Icon aria-hidden className={className} />;
  }
  return <FolderIcon aria-hidden className={className} />;
}
