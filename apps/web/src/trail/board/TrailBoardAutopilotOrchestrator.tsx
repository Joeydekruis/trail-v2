import {
  groupIssues,
  holdIssuePages,
  type HeldIssuePage,
} from "@t3tools/client-runtime/issue-list";
import type { EnvironmentId, IssueListInput } from "@t3tools/contracts";
import { useState } from "react";

import { issueFilterProjects, issueListTargets } from "~/components/issue/issuesSearch.logic";
import { useLiveRefresh } from "~/hooks/useLiveRefresh";
import { useProjects } from "~/state/entities";
import { useEnvironments, useIssuesSupported } from "~/state/environments";
import { useIssueList } from "~/state/issues";
import { useTrailIssueProjectFilter } from "~/trail/useTrailIssueProjectFilter";
import { useTrailScopedProject } from "~/trail/useTrailScopedProject";

import { useTrailBoardAutopilot } from "./useTrailBoardAutopilot";
import { useTrailBoardAutopilotContinue } from "./useTrailBoardAutopilotContinue";
import { useTrailIssueWork } from "./useTrailIssueWork";

const AUTOPILOT_ISSUE_LIST_LIMIT = 100;

const autopilotListInput: IssueListInput = {
  state: "open",
  involvement: "all",
  limit: AUTOPILOT_ISSUE_LIST_LIMIT,
};

/** Keeps board autopilot alive on chat and other routes (not only the Issues board view). */
export function TrailBoardAutopilotOrchestrator() {
  const issuesSupported = useIssuesSupported();
  const { environments } = useEnvironments();
  const projects = useProjects();
  const [pages] = useState<ReadonlyMap<EnvironmentId, HeldIssuePage>>(() => new Map());

  const capableEnvironments = environments.filter(
    (environment) => environment.serverConfig?.environment.capabilities.issues === true,
  );
  const environmentLabels = new Map(
    environments.map((environment) => [environment.environmentId, environment.label]),
  );
  const filterProjects = issueFilterProjects(
    projects.filter((project) =>
      capableEnvironments.some(
        (environment) => environment.environmentId === project.environmentId,
      ),
    ),
    environmentLabels,
  );

  const trailScopedProject = useTrailScopedProject(filterProjects);
  const trailHideProjects = useTrailIssueProjectFilter(filterProjects);

  const targets =
    !issuesSupported || trailScopedProject === null
      ? []
      : issueListTargets(
          capableEnvironments.map((environment) => environment.environmentId),
          filterProjects.filter(
            (project) =>
              project.environmentId === trailScopedProject.environmentId &&
              project.id === trailScopedProject.projectId,
          ),
          trailHideProjects,
          autopilotListInput,
        );

  const list = useIssueList(targets);
  useLiveRefresh(
    () => {
      if (!list.isPending && targets.length > 0) {
        list.reload();
      }
    },
    { key: JSON.stringify(targets) },
  );

  const scopedRows =
    trailScopedProject === null
      ? []
      : groupIssues(holdIssuePages(list.answers, pages), "", projects, "updated")
          .flatMap((group) => group.rows)
          .filter(
            (row) =>
              row.environmentId === trailScopedProject.environmentId &&
              row.projectId === trailScopedProject.projectId,
          );

  const boardAutopilot = useTrailBoardAutopilot(
    trailScopedProject?.environmentId ?? null,
    trailScopedProject?.projectId ?? null,
  );
  const work = useTrailIssueWork({
    rows: scopedRows,
    onListRefresh: () => list.refresh(),
    autopilotEnabled: boardAutopilot.enabled,
  });

  useTrailBoardAutopilotContinue({
    enabled: boardAutopilot.enabled && trailScopedProject !== null && targets.length > 0,
    environmentId: trailScopedProject?.environmentId ?? null,
    projectId: trailScopedProject?.projectId ?? null,
    rows: scopedRows,
    markForReview: work.markForReview,
  });

  return null;
}
