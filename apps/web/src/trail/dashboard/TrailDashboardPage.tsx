import { scopeProjectRef } from "@t3tools/client-runtime/environment";
import { selectGroupDefaultProject } from "@t3tools/client-runtime/state/project-grouping";
import { useRouter } from "@tanstack/react-router";
import { T, useGT } from "gt-react";
import { useEffect, useEffectEvent, useRef, useState } from "react";

import { NoProjectsHero } from "../../components/NoProjectsHero";
import { sortScopedProjectsForSidebar } from "../../components/Sidebar.logic";
import { Button } from "../../components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "../../components/ui/empty";
import { RefreshIcon } from "../../components/ui/refresh-icon";
import { SidebarInset } from "../../components/ui/sidebar";
import { WorkspacePageHeader } from "../../components/WorkspacePageHeader";
import { useNewThreadHandler } from "../../hooks/useHandleNewThread";
import { useSidebarProjectGroups } from "../../hooks/useSidebarProjectGroups";
import {
  readProject,
  useAllEnvironmentShellsBootstrapped,
  useProjects,
  useVisibleThreadShells,
} from "../../state/entities";
import { isElectron } from "../../env";
import { workspaceAreaProps } from "../../lib/workspaceFocus";
import { useUiStateStore } from "../../uiStateStore";
import { resolveTrailSidebarProjectScopeKeys } from "../projectScope.logic";

function useTrailDashboardProjectRef() {
  const groups = useSidebarProjectGroups();
  const persistedKeys = useUiStateStore((store) => store.sidebarProjectScopeKeys);
  const scopeKeys = resolveTrailSidebarProjectScopeKeys({
    groups,
    persistedKeys,
    canClearMissingScope: true,
  });
  const group = groups.find((candidate) => candidate.projectKey === scopeKeys[0]);
  if (!group) {
    return null;
  }
  const member = selectGroupDefaultProject(group.memberProjects);
  return member ? scopeProjectRef(member.environmentId, member.id) : null;
}

function DraftStartError({ onRetry }: { readonly onRetry: () => void }) {
  const gt = useGT();
  const contentArea = workspaceAreaProps("home", 1, gt("Home", { $context: "the home screen" }));
  return (
    <SidebarInset
      {...contentArea}
      role="main"
      className="h-dvh min-h-0 overflow-hidden overscroll-y-none"
    >
      {isElectron ? <WorkspacePageHeader electron /> : null}
      <Empty className="flex-1">
        <EmptyHeader className="max-w-md">
          <EmptyTitle>
            <T>Couldn’t start a new thread</T>
          </EmptyTitle>
          <EmptyDescription>
            <T>The project is still available. Try opening the draft again.</T>
          </EmptyDescription>
          <div className="mt-5 flex justify-center">
            <Button size="sm" onClick={onRetry}>
              <RefreshIcon size="md" />
              <T>Try again</T>
            </Button>
          </div>
        </EmptyHeader>
      </Empty>
    </SidebarInset>
  );
}

/**
 * Trail “Dashboard” is the agent home: open a new chat in the workspace selected on the rail.
 */
export function TrailDashboardPage() {
  const projects = useProjects();
  const threads = useVisibleThreadShells();
  const bootstrapped = useAllEnvironmentShellsBootstrapped();
  const projectRef = useTrailDashboardProjectRef();
  const handleNewThread = useNewThreadHandler();
  const router = useRouter();
  const isStillOnDashboard = useEffectEvent(() => router.state.location.pathname === "/dashboard");
  const startedAttemptRef = useRef<number | null>(null);
  const [startState, setStartState] = useState({ failed: false, retryRequest: 0 });
  const attempt = startState.retryRequest;

  const hasPickableProject =
    sortScopedProjectsForSidebar(
      projects.filter((project) => project.archivedAt == null),
      threads,
      "updated_at",
    ).length > 0;

  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- starts a draft in the rail-scoped project and navigates to the agent view
  useEffect(() => {
    if (projectRef === null || startedAttemptRef.current === attempt || !isStillOnDashboard()) {
      return;
    }
    if (readProject(projectRef) === null) {
      return;
    }
    startedAttemptRef.current = attempt;
    void handleNewThread(projectRef, { replace: true })
      .then((opened) => {
        if (opened === null) {
          setStartState((state) => ({ ...state, retryRequest: state.retryRequest + 1 }));
        }
      })
      .catch(() => {
        setStartState((state) => ({ ...state, failed: true }));
      });
  }, [attempt, handleNewThread, isStillOnDashboard, projectRef]);

  if (projectRef !== null) {
    return startState.failed ? (
      <DraftStartError
        onRetry={() => {
          setStartState((state) => ({
            failed: false,
            retryRequest: state.retryRequest + 1,
          }));
        }}
      />
    ) : null;
  }

  return bootstrapped && !hasPickableProject ? <NoProjectsHero /> : null;
}
