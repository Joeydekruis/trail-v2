import type { DesignForIssueResult, DesignGetResult, DesignListResult } from "@t3tools/trail-contracts";
import type { ProjectId } from "@t3tools/contracts";

import { resolvePrimaryEnvironmentHttpUrl } from "../../environments/primary";

async function fetchDesignJson<T>(path: string, params: Record<string, string>): Promise<T> {
  const url = new URL(resolvePrimaryEnvironmentHttpUrl(path));
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  const response = await fetch(url, { credentials: "include", cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Design request failed (${response.status})`);
  }
  return (await response.json()) as T;
}

export function fetchTrailDesignList(projectId: ProjectId): Promise<DesignListResult> {
  return fetchDesignJson("/api/trail/design/list", { projectId });
}

export function fetchTrailDesignPage(input: {
  projectId: ProjectId;
  folder: string;
  page: string;
  version?: number;
}): Promise<DesignGetResult> {
  return fetchDesignJson("/api/trail/design/page", {
    projectId: input.projectId,
    folder: input.folder,
    page: input.page,
    ...(input.version === undefined ? {} : { version: String(input.version) }),
  });
}

export function fetchTrailDesignForIssue(input: {
  projectId: ProjectId;
  issue: number;
}): Promise<DesignForIssueResult> {
  return fetchDesignJson("/api/trail/design/for-issue", {
    projectId: input.projectId,
    issue: String(input.issue),
  });
}