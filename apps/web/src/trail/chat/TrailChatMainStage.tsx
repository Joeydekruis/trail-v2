import { scopedThreadKey } from "@t3tools/client-runtime/environment";
import type {
  EditorId,
  EnvironmentId,
  ProjectId,
  ResolvedKeybindingsConfig,
  ScopedThreadRef,
} from "@t3tools/contracts";
import type { ReactNode } from "react";

import type { DraftId } from "../../composerDraftStore";

import { TrailChatFilePreview } from "./TrailChatFilePreview";
import { TrailChatFileTabBar } from "./TrailChatFileTabBar";
import {
  TRAIL_CENTER_CHAT_FILE_TABS,
  openTrailChatFile,
  useTrailChatFileTabsStore,
} from "./trailChatFileTabsStore";

export function TrailChatMainStage({
  threadRef,
  environmentId,
  workspaceRoot,
  projectName,
  projectId,
  composerDraftTarget,
  keybindings,
  availableEditors,
  workspaceMutationId,
  onPendingChange,
  pendingRelativePaths,
  children,
}: {
  readonly threadRef: ScopedThreadRef;
  readonly environmentId: EnvironmentId;
  readonly workspaceRoot: string;
  readonly projectName: string;
  readonly projectId: ProjectId | undefined;
  readonly composerDraftTarget: ScopedThreadRef | DraftId;
  readonly keybindings: ResolvedKeybindingsConfig;
  readonly availableEditors: readonly EditorId[];
  readonly workspaceMutationId: string | null;
  readonly onPendingChange: (relativePath: string, pending: boolean) => void;
  readonly pendingRelativePaths: ReadonlySet<string>;
  readonly children: ReactNode;
}) {
  if (!TRAIL_CENTER_CHAT_FILE_TABS || !workspaceRoot) {
    return children;
  }

  const fileState = useTrailChatFileTabsStore(
    (store) => store.byThreadKey[scopedThreadKey(threadRef)],
  );
  const active = fileState?.active ?? "chat";
  const activeTab = fileState?.tabs.find((tab) => tab.relativePath === active);

  return (
    <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <TrailChatFileTabBar threadRef={threadRef} />
      {active === "chat" || !activeTab ? (
        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {children}
        </div>
      ) : (
        <TrailChatFilePreview
          availableEditors={availableEditors}
          composerDraftTarget={composerDraftTarget}
          environmentId={environmentId}
          keybindings={keybindings}
          onOpenFile={(path) => openTrailChatFile(threadRef, path)}
          onPendingChange={onPendingChange}
          projectId={projectId}
          projectName={projectName}
          relativePath={activeTab.relativePath}
          revealLine={activeTab.revealLine}
          revealRequestId={activeTab.revealRequestId}
          selectedFilePending={pendingRelativePaths.has(activeTab.relativePath)}
          threadRef={threadRef}
          workspaceMutationId={workspaceMutationId}
          workspaceRoot={workspaceRoot}
        />
      )}
    </div>
  );
}
