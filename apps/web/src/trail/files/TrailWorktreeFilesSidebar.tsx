import type { EnvironmentId, ScopedThreadRef } from "@t3tools/contracts";
import { T } from "gt-react";
import { useRef, useState } from "react";

import FileBrowserPanel from "../../components/files/FileBrowserPanel";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "../../components/ui/empty";
import { openTrailChatFile } from "../chat/trailChatFileTabsStore";

import { TrailFilesScopeBar } from "./TrailFilesScopeBar";

export function TrailWorktreeFilesSidebar({
  cwd,
  environmentId,
  projectName,
  threadRef,
  worktreePath,
  branch,
}: {
  readonly cwd: string | null;
  readonly environmentId: EnvironmentId | null;
  readonly projectName: string;
  readonly threadRef: ScopedThreadRef | null;
  readonly worktreePath: string | null;
  readonly branch: string | null;
}) {
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const revealIdRef = useRef(0);

  if (cwd === null || environmentId === null) {
    return (
      <div className="px-3 py-6">
        <Empty>
          <EmptyHeader>
            <EmptyTitle>
              <T>No folder for this chat</T>
            </EmptyTitle>
            <EmptyDescription>
              <T>
                Open a chat in a project to browse its files here. Task worktrees use their own
                folder once the thread is attached to a worktree (Setup worktree or worktree
                handoff), not a separate folder the agent created on disk only.
              </T>
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden">
      <TrailFilesScopeBar
        branch={branch}
        cwd={cwd}
        projectName={projectName}
        worktreePath={worktreePath}
      />
      <FileBrowserPanel
        key={`${environmentId}:${cwd}`}
        environmentId={environmentId}
        cwd={cwd}
        projectName={projectName || cwd}
        embeddedInSidebar
        selectedPath={selectedPath}
        selectedPathRevealId={revealIdRef.current}
        workspaceMutationId={null}
        onOpenFile={(relativePath) => {
          if (threadRef === null) {
            setSelectedPath(relativePath);
            revealIdRef.current += 1;
            return;
          }
          openTrailChatFile(threadRef, relativePath);
        }}
      />
    </div>
  );
}
