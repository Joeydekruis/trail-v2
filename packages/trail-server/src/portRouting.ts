import type {
  OrchestrationProjectShell,
  OrchestrationV2ThreadShell,
  ProjectId,
  ThreadId,
} from "@t3tools/contracts";

export interface TrailFeedbackThreadSuggestion {
  readonly threadId: ThreadId;
  readonly projectId: ProjectId;
}

export function parsePreviewPort(pageUrl: string): number | null {
  try {
    const url = new URL(pageUrl);
    if (url.port.length > 0) {
      const port = Number.parseInt(url.port, 10);
      return Number.isFinite(port) ? port : null;
    }
    if (url.protocol === "https:") return 443;
    if (url.protocol === "http:") return 80;
    return null;
  } catch {
    return null;
  }
}

function scriptMatchesPort(previewUrl: string, port: number): boolean {
  const direct = parsePreviewPort(previewUrl);
  if (direct === port) return true;
  return previewUrl.includes(`:${port}`);
}

export function projectIdsForPreviewPort(
  projects: ReadonlyArray<OrchestrationProjectShell>,
  port: number,
): ReadonlySet<ProjectId> {
  const ids = new Set<ProjectId>();
  for (const project of projects) {
    for (const script of project.scripts) {
      if (script.previewUrl !== undefined && scriptMatchesPort(script.previewUrl, port)) {
        ids.add(project.id);
      }
    }
  }
  return ids;
}

function threadIsActive(thread: OrchestrationV2ThreadShell): boolean {
  return thread.deletedAt === null && thread.archivedAt === null;
}

function threadUnsettled(thread: OrchestrationV2ThreadShell): boolean {
  return thread.settledOverride !== "settled" && thread.settledAt === null;
}

export function suggestThreadForPreviewPort(input: {
  readonly pageUrl: string;
  readonly projects: ReadonlyArray<OrchestrationProjectShell>;
  readonly threads: ReadonlyArray<OrchestrationV2ThreadShell>;
}): TrailFeedbackThreadSuggestion | null {
  const port = parsePreviewPort(input.pageUrl);
  if (port === null || port === 80 || port === 443) return null;

  const projectIds = projectIdsForPreviewPort(input.projects, port);
  if (projectIds.size === 0) return null;

  const candidates = input.threads.filter(
    (thread) => threadIsActive(thread) && projectIds.has(thread.projectId),
  );
  if (candidates.length === 0) return null;

  candidates.sort((left, right) => {
    const leftUnsettled = threadUnsettled(left) ? 0 : 1;
    const rightUnsettled = threadUnsettled(right) ? 0 : 1;
    if (leftUnsettled !== rightUnsettled) return leftUnsettled - rightUnsettled;
    const leftUpdated = Date.parse(left.updatedAt.toString());
    const rightUpdated = Date.parse(right.updatedAt.toString());
    if (leftUpdated !== rightUpdated) return rightUpdated - leftUpdated;
    return left.id.localeCompare(right.id);
  });

  const best = candidates[0]!;
  return { threadId: best.id, projectId: best.projectId };
}