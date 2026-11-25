import { pullRequestProjectKey } from "@t3tools/client-runtime/pull-request-project-filter";
import type { IssueListInput } from "@t3tools/contracts";

import {
  issueFilterProjects,
  issueListTargets,
  issueProjectKeys,
} from "~/components/issue/issuesSearch.logic";
import { useLiveRefresh } from "~/hooks/useLiveRefresh";
import { useProjects } from "~/state/entities";
import { useEnvironments, useIssuesSupported } from "~/state/environments";
import { useIssueList } from "~/state/issues";

import { useTrailIssueProjectFilter } from "../useTrailIssueProjectFilter";

import {
  countOpenIssuesFromListAnswers,
  formatSidebarIssueCount,
} from "./sidebarOpenIssueCount.logic";

const SIDEBAR_OPEN_ISSUE_LIMIT = 100;

const openIssueListInput: IssueListInput = {
  state: "open",
  involvement: "all",
  limit: SIDEBAR_OPEN_ISSUE_LIMIT,
};

/** Open-issue count for the scoped workspace, refreshed on the live-refresh cadence. */
export function useTrailSidebarOpenIssueCount(): string | null {
  const issuesSupported = useIssuesSupported();
  const { environments } = useEnvironments();
  const projects = useProjects();

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
  const trailHideProjects = useTrailIssueProjectFilter(filterProjects);
  const hiddenProjects = issueProjectKeys(trailHideProjects);
  const everyProjectHidden =
    filterProjects.length > 0 &&
    filterProjects.every((project) => hiddenProjects.has(pullRequestProjectKey(project)));

  const targets =
    !issuesSupported || everyProjectHidden
      ? []
      : issueListTargets(
          capableEnvironments.map((environment) => environment.environmentId),
          filterProjects,
          trailHideProjects,
          openIssueListInput,
        );

  const list = useIssueList(targets);
  useLiveRefresh(
    () => {
      if (!list.isPending && targets.length > 0) {
        list.reload();
      }
    },
    { key: `trail-sidebar-open-issue-count:${JSON.stringify(targets)}` },
  );

  if (!issuesSupported || targets.length === 0) {
    return null;
  }

  const { count, hasMore } = countOpenIssuesFromListAnswers(list.answers);
  if (list.isPending && count === 0) {
    return null;
  }
  return formatSidebarIssueCount(count, hasMore);
}