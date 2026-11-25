import type {
  EnvironmentId,
  IssueScopeRef,
  IssueTrackerSummary,
  ProjectId,
} from "@t3tools/contracts";

export type TrailIssueCreateTarget = {
  readonly environmentId: EnvironmentId;
  readonly scope: IssueScopeRef;
};

/** One scope the signed-in account may file into for the board's project. */
export function resolveTrailIssueCreateTarget(params: {
  readonly project: { readonly environmentId: EnvironmentId; readonly projectId: ProjectId } | null;
  readonly scopes: ReadonlyArray<{ readonly environmentId: EnvironmentId; readonly input: IssueScopeRef }>;
  readonly trackers: ReadonlyArray<IssueTrackerSummary>;
  readonly host?: string | undefined;
}): TrailIssueCreateTarget | null {
  const { project, scopes, trackers, host } = params;
  if (project === null) return null;

  const candidates = scopes.filter(
    (scope) =>
      scope.environmentId === project.environmentId && scope.input.projectId === project.projectId,
  );
  const narrowed = host
    ? candidates.filter(
        (scope) => (scope.input.host ?? "").toLowerCase() === host.trim().toLowerCase(),
      )
    : candidates;

  for (const candidate of narrowed) {
    const hostKey = (candidate.input.host ?? "").toLowerCase();
    const tracker = trackers.find(
      (row) =>
        row.tracker === candidate.input.tracker &&
        row.host.toLowerCase() === hostKey &&
        row.configured &&
        row.capabilities?.create === true,
    );
    if (tracker) {
      return { environmentId: candidate.environmentId, scope: candidate.input };
    }
  }
  return null;
}