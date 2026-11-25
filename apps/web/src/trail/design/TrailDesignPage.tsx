import type { DesignGetResult, DesignListResult } from "@t3tools/trail-contracts";
import { useSearch } from "@tanstack/react-router";
import { T, useGT } from "gt-react";
import { FileTextIcon, PaletteIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "../../components/ui/empty";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "../../components/ui/select";
import { RefreshIcon } from "../../components/ui/refresh-icon";
import { Button } from "../../components/ui/button";
import { SidebarInset } from "../../components/ui/sidebar";
import {
  getAppModalReturnThreadTarget,
  useNavigateToMainApp,
} from "../../components/sidebar/mainAppLocation";
import { WorkspacePageHeader } from "../../components/WorkspacePageHeader";
import { isElectron } from "../../env";
import { cn } from "../../lib/utils";
import { workspaceAreaProps } from "../../lib/workspaceFocus";
import { useProjects } from "../../state/entities";
import { openTrailChatFile } from "../chat/trailChatFileTabsStore";
import { useTrailScopedProject } from "../useTrailScopedProject";

import { fetchTrailDesignList, fetchTrailDesignPage } from "./trailDesignApi";
import {
  filterDesignCatalog,
  type TrailDesignCatalogFilter,
} from "./trailDesignCatalog.logic";
import { designPageSummary, designUsedByForSelection } from "./trailDesignCovers.logic";
import { TrailDesignPreview } from "./TrailDesignPreview";
import { trailDesignDeepSelection } from "./trailDesignRoute.logic";
import { designSelectionKey, type TrailDesignSelection } from "./trailDesignPreview.logic";

export function TrailDesignPage() {
  const gt = useGT();
  const navigateToMainApp = useNavigateToMainApp();
  const search = useSearch({ from: "/_chat/design" });
  const projects = useProjects();
  const scoped = useTrailScopedProject(projects);
  const projectId = scoped?.projectId;
  const [state, setState] = useState<
    | { readonly tag: "idle" }
    | { readonly tag: "loading" }
    | { readonly tag: "error" }
    | { readonly tag: "ready"; readonly folders: DesignListResult["folders"] }
  >({ tag: "idle" });
  const [selection, setSelection] = useState<TrailDesignSelection | null>(null);
  const [version, setVersion] = useState<number | undefined>(undefined);
  const [catalogFilter, setCatalogFilter] = useState<TrailDesignCatalogFilter>("all");
  const [preview, setPreview] = useState<
    | { readonly tag: "idle" }
    | { readonly tag: "loading" }
    | { readonly tag: "error" }
    | { readonly tag: "ready"; readonly detail: DesignGetResult; readonly title: string }
  >({ tag: "idle" });

  const load = () => {
    if (projectId === undefined) return;
    setState({ tag: "loading" });
    void fetchTrailDesignList(projectId)
      .then((result) => {
        setState({ tag: "ready", folders: result.folders });
        const deep = trailDesignDeepSelection(search);
        if (deep !== null) {
          setSelection(deep);
        } else {
          const first = result.folders[0]?.pages[0];
          setSelection(first === undefined ? null : { folder: first.folder, page: first.page });
        }
        setVersion(undefined);
      })
      .catch(() => setState({ tag: "error" }));
  };

  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- load when scoped project changes
  useEffect(() => {
    if (projectId === undefined) {
      setState({ tag: "idle" });
      setSelection(null);
      return;
    }
    load();
  }, [projectId]);

  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- apply deep links from issue drawer / URL
  useEffect(() => {
    const deep = trailDesignDeepSelection(search);
    if (deep !== null) {
      setSelection(deep);
      setVersion(undefined);
    }
  }, [search.folder, search.page]);

  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- load preview for selection
  useEffect(() => {
    if (projectId === undefined || selection === null) {
      setPreview({ tag: "idle" });
      return;
    }
    const key = designSelectionKey(selection);
    setPreview({ tag: "loading" });
    void fetchTrailDesignPage({
      projectId,
      folder: selection.folder,
      page: selection.page,
      ...(version === undefined ? {} : { version }),
    })
      .then((detail) => {
        if (designSelectionKey(selection) !== key) return;
        setPreview({
          tag: "ready",
          detail,
          title: `${selection.folder}/${selection.page}`,
        });
      })
      .catch(() => {
        if (designSelectionKey(selection) === key) setPreview({ tag: "error" });
      });
  }, [projectId, selection, version]);

  const contentArea = workspaceAreaProps("design", 1, gt("Design", { $context: "Trail design library" }));
  const pageSummary =
    state.tag === "ready" && selection !== null ? designPageSummary(state.folders, selection) : null;
  const usedBy =
    state.tag === "ready" && selection !== null ? designUsedByForSelection(state.folders, selection) : [];
  const catalogFolders =
    state.tag === "ready" ? filterDesignCatalog(state.folders, catalogFilter) : [];

  const openInChatFiles = () => {
    if (preview.tag !== "ready") return;
    const target = getAppModalReturnThreadTarget();
    navigateToMainApp();
    if (target?.kind === "server") {
      openTrailChatFile(target.threadRef, preview.detail.path);
    }
  };

  return (
    <SidebarInset
      {...contentArea}
      role="main"
      className="h-dvh min-h-0 overflow-hidden overscroll-y-none"
    >
      {isElectron ? <WorkspacePageHeader electron /> : null}
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden p-4">
        <div className="flex shrink-0 items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <PaletteIcon className="size-5 text-[color:var(--trail-accent)]" aria-hidden />
            <h1 className="text-lg font-semibold">
              <T context="Trail design library page">Design library</T>
            </h1>
          </div>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant={catalogFilter === "all" ? "default" : "outline"}
              onClick={() => setCatalogFilter("all")}
            >
              <T context="Trail design library page">All pages</T>
            </Button>
            <Button
              size="sm"
              variant={catalogFilter === "components" ? "default" : "outline"}
              onClick={() => setCatalogFilter("components")}
            >
              <T context="Trail design library page">Components</T>
            </Button>
          </div>
          <Button size="sm" variant="outline" onClick={load} disabled={projectId === undefined}>
            <RefreshIcon size="md" />
            <T>Refresh</T>
          </Button>
        </div>
        <p className="shrink-0 text-sm text-muted-foreground">
          <T context="Trail design library page">
            HTML designs in docs/design/. Agents save via trail_save_design MCP.
          </T>
        </p>
        {projectId === undefined ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>
                <T>Select a project</T>
              </EmptyTitle>
              <EmptyDescription>
                <T context="Trail design library page">Choose a workspace on the rail to browse its designs.</T>
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : state.tag === "loading" || state.tag === "idle" ? (
          <p className="text-sm text-muted-foreground">
            <T>Loading…</T>
          </p>
        ) : state.tag === "error" ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>
                <T>Could not load designs</T>
              </EmptyTitle>
              <EmptyDescription>
                <T>Check that the server is running and you are signed in.</T>
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : catalogFolders.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>
                {catalogFilter === "components" ? (
                  <T context="Trail design library page">No components yet</T>
                ) : (
                  <T>No designs yet</T>
                )}
              </EmptyTitle>
              <EmptyDescription>
                <T context="Trail design library page">
                  Save pages from Claude Design through the T3 MCP trail_save_design tool.
                </T>
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(240px,320px)_1fr]">
            <ul className="flex min-h-0 flex-col gap-3 overflow-y-auto pr-1">
              {catalogFolders.map((folder) => (
                <li
                  key={folder.folder}
                  className="rounded-lg border border-[color:var(--trail-border)] bg-[color:var(--trail-card)] p-3"
                >
                  <h2 className="font-medium">{folder.title ?? folder.folder}</h2>
                  <p className="font-mono text-2xs text-muted-foreground">docs/design/{folder.folder}</p>
                  <ul className="mt-2 flex flex-col gap-0.5">
                    {folder.pages.map((page) => {
                      const selected =
                        selection?.folder === page.folder && selection.page === page.page;
                      return (
                        <li key={page.page}>
                          <button
                            type="button"
                            className={cn(
                              "w-full rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                              selected
                                ? "bg-accent text-accent-foreground"
                                : "hover:bg-sidebar-row-hover",
                            )}
                            onClick={() => {
                              setSelection({ folder: page.folder, page: page.page });
                              setVersion(undefined);
                            }}
                          >
                            <span className="font-medium">{page.title}</span>
                            <span className="mt-0.5 block font-mono text-2xs text-muted-foreground">
                              {page.page} · v{page.version} · {page.kind}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              ))}
            </ul>
            <div className="flex min-h-0 min-w-0 flex-col rounded-lg border border-[color:var(--trail-border)] bg-[color:var(--trail-card)] p-3">
              {preview.tag === "loading" || preview.tag === "idle" ? (
                <p className="text-sm text-muted-foreground">
                  <T>Select a page to preview.</T>
                </p>
              ) : preview.tag === "error" ? (
                <p className="text-sm text-destructive">
                  <T>Could not load preview.</T>
                </p>
              ) : (
                <>
                  {pageSummary !== null ? (
                    <div className="mb-3 space-y-2 text-sm">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="min-w-0 flex-1 font-mono text-2xs text-muted-foreground">
                          {preview.detail.path}
                        </p>
                        <Button size="sm" variant="outline" onClick={openInChatFiles}>
                          <FileTextIcon className="size-3.5" aria-hidden />
                          <T context="Trail design library page">Open in chat files</T>
                        </Button>
                      </div>
                      {pageSummary.linkedIssues !== undefined && pageSummary.linkedIssues.length > 0 ? (
                        <p className="text-muted-foreground">
                          <T context="Trail design library page">Linked issues:</T>{" "}
                          {pageSummary.linkedIssues.map((issue) => `#${issue}`).join(", ")}
                        </p>
                      ) : null}
                      {usedBy.length > 0 ? (
                        <p className="text-muted-foreground">
                          <T context="Trail design library page">Used by:</T>{" "}
                          {usedBy.map((entry) => `${entry.folder}/${entry.page}`).join(", ")}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                  {preview.detail.versions.length > 1 ? (
                    <Select
                      value={String(preview.detail.version)}
                      onValueChange={(value) => setVersion(Number(value))}
                    >
                      <SelectTrigger size="sm" className="w-full max-w-xs">
                        <SelectValue placeholder={gt("Version")} />
                      </SelectTrigger>
                      <SelectPopup>
                        {preview.detail.versions.map((entry) => (
                          <SelectItem key={entry.n} value={String(entry.n)}>
                            v{entry.n} · {entry.commit}
                            {entry.note ? ` — ${entry.note}` : ""}
                          </SelectItem>
                        ))}
                      </SelectPopup>
                    </Select>
                  ) : null}
                  {preview.detail.html === undefined || preview.detail.html.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      <T context="Trail design preview">This version has no HTML content.</T>
                    </p>
                  ) : (
                    <TrailDesignPreview title={preview.title} html={preview.detail.html} />
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </SidebarInset>
  );
}