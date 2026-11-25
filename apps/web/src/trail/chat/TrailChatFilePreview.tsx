import type {
  EditorId,
  EnvironmentId,
  ProjectId,
  ResolvedKeybindingsConfig,
} from "@t3tools/contracts";
import type { ScopedThreadRef } from "@t3tools/contracts";
import { Suspense, lazy } from "react";

import type { DraftId } from "../../composerDraftStore";

const FilePreviewPanel = lazy(() => import("../../components/files/FilePreviewPanel"));

export function TrailChatFilePreview({
  environmentId,
  workspaceRoot,
  projectName,
  projectId,
  threadRef,
  composerDraftTarget,
  keybindings,
  availableEditors,
  relativePath,
  revealLine,
  revealRequestId,
  workspaceMutationId,
  onOpenFile,
  onPendingChange,
  selectedFilePending,
}: {
  readonly environmentId: EnvironmentId;
  readonly workspaceRoot: string;
  readonly projectName: string;
  readonly projectId: ProjectId | undefined;
  readonly threadRef: ScopedThreadRef;
  readonly composerDraftTarget: ScopedThreadRef | DraftId;
  readonly keybindings: ResolvedKeybindingsConfig;
  readonly availableEditors: readonly EditorId[];
  readonly relativePath: string;
  readonly revealLine: number | null;
  readonly revealRequestId: number;
  readonly workspaceMutationId: string | null;
  readonly onOpenFile: (relativePath: string) => void;
  readonly onPendingChange: (relativePath: string, pending: boolean) => void;
  readonly selectedFilePending: boolean;
}) {
  return (
    <div
      className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
      data-preview-panel-mode="inline"
      data-trail-chat-file-preview=""
    >
      <Suspense fallback={null}>
        <FilePreviewPanel
          key={`${environmentId}:${workspaceRoot}:${relativePath}`}
          environmentId={environmentId}
          cwd={workspaceRoot}
          projectName={projectName}
          projectId={projectId}
          threadRef={threadRef}
          composerDraftTarget={composerDraftTarget}
          keybindings={keybindings}
          availableEditors={availableEditors}
          openInShortcutEnabled
          relativePath={relativePath}
          revealLine={revealLine}
          revealRequestId={revealRequestId}
          folderTrail={undefined}
          selectedFilePending={selectedFilePending}
          workspaceMutationId={workspaceMutationId}
          onOpenFile={onOpenFile}
          onNavigateFolder={() => {}}
          onPendingChange={onPendingChange}
          fileExplorerInitiallyOpen={false}
        />
      </Suspense>
    </div>
  );
}
