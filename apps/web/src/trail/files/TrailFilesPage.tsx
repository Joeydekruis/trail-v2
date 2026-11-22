import { useAtomValue } from "@effect/atom-react";
import { scopeThreadRef } from "@t3tools/client-runtime/environment";
import { EnvironmentId, ThreadId } from "@t3tools/contracts";
import { FolderOpenIcon, FolderTreeIcon } from "lucide-react";
import { Fragment, lazy, Suspense, useState, type CSSProperties, type ReactNode } from "react";
import { T, useGT, useMessages } from "gt-react";

import FileBrowserPanel from "~/components/files/FileBrowserPanel";
import { useProjectEntriesQuery } from "~/components/files/projectFilesQueryState";
import { RightPanelResizeHandle } from "~/components/preview/RightPanelResizeHandle";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/components/ui/empty";
import { SidebarInset } from "~/components/ui/sidebar";
import {
  WorkspaceBreadcrumb,
  WorkspaceBreadcrumbItem,
  WorkspaceBreadcrumbSeparator,
} from "~/components/WorkspaceBreadcrumb";
import { WorkspacePageHeader } from "~/components/WorkspacePageHeader";
import { DraftId } from "~/composerDraftStore";
import { isElectron } from "~/env";
import { useSidebarProjectGroups } from "~/hooks/useSidebarProjectGroups";
import { RESIZABLE_WIDTH_PROPERTY, useResizableWidth } from "~/hooks/useResizableWidth";
import { serverEnvironment, primaryServerKeybindingsAtom } from "~/state/server";
import { useUiStateStore } from "~/uiStateStore";

import "../theme/tokens.css";
import {
  DOCS_DIRECTORY_NAME,
  docsBreadcrumbSegments,
  docsDirectoryCwd,
  normalizeDocsRelativePath,
} from "./docsPath.logic";

const FilePreviewPanel = lazy(() => import("~/components/files/FilePreviewPanel"));

/** Sentinel ref for draft-scoped asset URLs on the full-page Files view (no chat thread). */
const TRAIL_FILES_PANEL_REF = scopeThreadRef(
  EnvironmentId.make("trail-files-panel"),
  ThreadId.make("trail-files-panel"),
);

const TRAIL_FILES_DRAFT_ID = DraftId.make("trail-files");
const TREE_STORAGE_KEY = "trail.files.treeWidth";
const TREE_MIN_WIDTH = 200;
const TREE_MAX_WIDTH = 480;
const TREE_DEFAULT_WIDTH = 280;

function TrailFilesTreePane({ children }: { readonly children: ReactNode }) {
  const gt = useGT();
  const { width, setWidth, handlers } = useResizableWidth({
    storageKey: TREE_STORAGE_KEY,
    defaultWidth: TREE_DEFAULT_WIDTH,
    minWidth: TREE_MIN_WIDTH,
    maxWidth: TREE_MAX_WIDTH,
    edge: "right",
  });

  return (
    <aside
      aria-label={gt("Docs file tree", { $context: "Trail files page" })}
      className="relative flex min-h-0 shrink-0 border-r border-border/60 bg-background"
      style={
        {
          [RESIZABLE_WIDTH_PROPERTY]: `${width}px`,
          width: `var(${RESIZABLE_WIDTH_PROPERTY})`,
        } as CSSProperties
      }
    >
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">{children}</div>
      <RightPanelResizeHandle
        handlers={handlers}
        label={gt("Resize docs file tree")}
        tabIndex={0}
        aria-valuenow={width}
        aria-valuemin={TREE_MIN_WIDTH}
        aria-valuemax={TREE_MAX_WIDTH}
        className="left-auto right-0 any-pointer-coarse:right-0 any-pointer-coarse:-right-2 any-pointer-coarse:left-auto"
        onKeyDown={(event) => {
          if (event.altKey || event.ctrlKey || event.metaKey) return;
          let nextWidth: number;
          switch (event.key) {
            case "ArrowLeft":
              nextWidth = width - 16;
              break;
            case "ArrowRight":
              nextWidth = width + 16;
              break;
            case "Home":
              nextWidth = TREE_MIN_WIDTH;
              break;
            case "End":
              nextWidth = TREE_MAX_WIDTH;
              break;
            default:
              return;
          }
          event.preventDefault();
          event.stopPropagation();
          setWidth(nextWidth);
        }}
      />
    </aside>
  );
}

export function TrailFilesPage() {
  const gt = useGT();
  const messages = useMessages();
  const groups = useSidebarProjectGroups().filter((group) => !group.archived);
  const scopeKeys = useUiStateStore((store) => store.sidebarProjectScopeKeys);
  const activeKey = scopeKeys.length === 1 ? scopeKeys[0] : null;
  const projectGroup =
    (activeKey !== null ? groups.find((group) => group.projectKey === activeKey) : undefined) ??
    (groups.length === 1 ? groups[0] : undefined);
  const project = projectGroup?.memberProjects[0];

  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [revealId, setRevealId] = useState(0);
  const [folderTrail, setFolderTrail] = useState<string | undefined>(undefined);
  const [pendingPaths, setPendingPaths] = useState<ReadonlySet<string>>(() => new Set());

  const keybindings = useAtomValue(primaryServerKeybindingsAtom);
  const serverConfig = useAtomValue(
    serverEnvironment.configValueAtom(project?.environmentId ?? null),
  );
  const availableEditors = serverConfig?.availableEditors ?? [];

  const rootListing = useProjectEntriesQuery(
    project?.environmentId ?? EnvironmentId.make("trail-files-unscoped"),
    project?.workspaceRoot ?? "",
    "",
    null,
    messages,
  );
  const docsEntry = rootListing.data?.entries.find(
    (entry) => entry.path === DOCS_DIRECTORY_NAME && entry.kind === "directory",
  );
  const docsMissing =
    project !== undefined &&
    rootListing.data !== null &&
    !rootListing.isPending &&
    docsEntry === undefined;

  const docsCwd = project !== undefined ? docsDirectoryCwd(project.workspaceRoot) : "";
  const projectName = projectGroup?.displayName ?? project?.title ?? "";
  const breadcrumbSegments = docsBreadcrumbSegments(selectedPath);

  const openFile = (relativePath: string) => {
    const normalized = normalizeDocsRelativePath(relativePath);
    if (normalized === null) return;
    setSelectedPath(normalized);
    setFolderTrail(undefined);
    setRevealId((value) => value + 1);
  };

  const navigateFolder = (relativePath: string, trail: string, _keepSource: boolean) => {
    const normalized = normalizeDocsRelativePath(relativePath === "" ? null : relativePath);
    setSelectedPath(normalized);
    setFolderTrail(trail || undefined);
    setRevealId((value) => value + 1);
  };

  const onPendingChange = (relativePath: string, pending: boolean) => {
    setPendingPaths((previous) => {
      const next = new Set(previous);
      if (pending) next.add(relativePath);
      else next.delete(relativePath);
      return next;
    });
  };

  let body: ReactNode;
  if (project === undefined) {
    body = (
      <Empty>
        <EmptyMedia variant="icon">
          <FolderOpenIcon />
        </EmptyMedia>
        <EmptyHeader>
          <EmptyTitle>
            <T>Select a project</T>
          </EmptyTitle>
          <EmptyDescription>
            <T>Pick a project in the rail to browse its docs/ folder.</T>
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  } else if (rootListing.isPending && rootListing.data === null) {
    body = (
      <div role="status" className="px-6 py-8 text-sm text-muted-foreground">
        <T>Loading docs…</T>
      </div>
    );
  } else if (docsMissing) {
    body = (
      <Empty>
        <EmptyMedia variant="icon">
          <FolderTreeIcon />
        </EmptyMedia>
        <EmptyHeader>
          <EmptyTitle>
            <T>No docs/ folder yet</T>
          </EmptyTitle>
          <EmptyDescription>
            <T>
              Create a docs/ directory in this project's repository to browse Markdown and other
              files here.
            </T>
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  } else {
    body = (
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <TrailFilesTreePane>
          <FileBrowserPanel
            environmentId={project.environmentId}
            cwd={docsCwd}
            projectName={DOCS_DIRECTORY_NAME}
            selectedPath={selectedPath}
            selectedPathRevealId={revealId}
            onOpenFile={openFile}
            workspaceMutationId={null}
          />
        </TrailFilesTreePane>
        <div
          className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
          data-trail-files-preview=""
        >
          {selectedPath !== null ? (
            <Suspense
              fallback={
                <div role="status" className="px-6 py-8 text-sm text-muted-foreground">
                  <T>Loading preview…</T>
                </div>
              }
            >
              <FilePreviewPanel
                environmentId={project.environmentId}
                cwd={docsCwd}
                projectName={projectName}
                projectId={project.id}
                relativePath={selectedPath}
                threadRef={TRAIL_FILES_PANEL_REF}
                composerDraftTarget={TRAIL_FILES_DRAFT_ID}
                keybindings={keybindings}
                availableEditors={availableEditors}
                openInShortcutEnabled={false}
                revealLine={null}
                revealRequestId={revealId}
                onOpenFile={openFile}
                onNavigateFolder={navigateFolder}
                folderTrail={folderTrail}
                onPendingChange={onPendingChange}
                selectedFilePending={pendingPaths.has(selectedPath)}
                workspaceMutationId={null}
              />
            </Suspense>
          ) : (
            <Empty size="compact">
              <EmptyMedia variant="icon">
                <FolderOpenIcon />
              </EmptyMedia>
              <EmptyHeader>
                <EmptyTitle>
                  <T>Select a file</T>
                </EmptyTitle>
                <EmptyDescription>
                  <T>Choose a document from the docs/ tree to preview it.</T>
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </div>
      </div>
    );
  }

  return (
    <SidebarInset className="flex h-dvh min-h-0 flex-col overflow-hidden">
      <WorkspacePageHeader electron={isElectron}>
        <WorkspaceBreadcrumb ariaLabel={gt("Files breadcrumb", { $context: "Trail files page" })}>
          <WorkspaceBreadcrumbItem current={project === undefined}>
            {projectName || <T>Files</T>}
          </WorkspaceBreadcrumbItem>
          {project !== undefined
            ? breadcrumbSegments.map((segment, index) => {
                const pathKey = breadcrumbSegments.slice(0, index + 1).join("/");
                return (
                  <Fragment key={pathKey}>
                    <WorkspaceBreadcrumbSeparator />
                    <WorkspaceBreadcrumbItem current={index === breadcrumbSegments.length - 1}>
                      {segment}
                    </WorkspaceBreadcrumbItem>
                  </Fragment>
                );
              })
            : null}
        </WorkspaceBreadcrumb>
      </WorkspacePageHeader>
      {body}
    </SidebarInset>
  );
}
