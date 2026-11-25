import type {
  EnvironmentId,
  IssueScopeRef,
  IssueTrackerKind,
  IssueTrackerSummary,
  ProjectId,
} from "@t3tools/contracts";
import { describe, expect, it } from "vite-plus/test";

import { resolveTrailIssueCreateTarget } from "./trailIssueCreateScope.logic";

const environmentId = "env-1" as EnvironmentId;
const projectId = "proj-1" as ProjectId;

function scope(input: Partial<IssueScopeRef> & Pick<IssueScopeRef, "scope">): IssueScopeRef {
  return {
    projectId,
    tracker: "github" as IssueTrackerKind,
    host: "github.com",
    ...input,
  };
}

function tracker(overrides: Partial<IssueTrackerSummary> & Pick<IssueTrackerSummary, "host">): IssueTrackerSummary {
  const capabilities = {
    create: true,
    edit: true,
    comment: true,
    labels: true,
    assignees: true,
    reactions: true,
    templates: true,
    linkedPullRequests: true,
    events: true,
    search: true,
    ...overrides.capabilities,
  };
  return {
    tracker: "github" as IssueTrackerKind,
    projectCount: 1,
    configured: true,
    detail: null,
    ...overrides,
    capabilities,
  };
}

describe("resolveTrailIssueCreateTarget", () => {
  it("returns null without a scoped project", () => {
    expect(
      resolveTrailIssueCreateTarget({
        project: null,
        scopes: [{ environmentId, input: scope({ scope: "acme/api" }) }],
        trackers: [tracker({ host: "github.com" })],
      }),
    ).toBeNull();
  });

  it("picks a scope when create is allowed", () => {
    const input = scope({ scope: "acme/api" });
    expect(
      resolveTrailIssueCreateTarget({
        project: { environmentId, projectId },
        scopes: [{ environmentId, input }],
        trackers: [tracker({ host: "github.com" })],
      }),
    ).toEqual({ environmentId, scope: input });
  });

  it("respects the list host filter", () => {
    const github = scope({ scope: "acme/api", host: "github.com" });
    const gitea = scope({ scope: "acme/api", host: "git.example.com" });
    expect(
      resolveTrailIssueCreateTarget({
        project: { environmentId, projectId },
        scopes: [
          { environmentId, input: github },
          { environmentId, input: gitea },
        ],
        trackers: [
          tracker({ host: "github.com" }),
          tracker({ host: "git.example.com" }),
        ],
        host: "git.example.com",
      }),
    ).toEqual({ environmentId, scope: gitea });
  });

  it("skopes when create is disabled", () => {
    expect(
      resolveTrailIssueCreateTarget({
        project: { environmentId, projectId },
        scopes: [{ environmentId, input: scope({ scope: "acme/api" }) }],
        trackers: [
          tracker({
            host: "github.com",
            capabilities: {
              create: false,
              edit: true,
              comment: true,
              labels: true,
              assignees: true,
              reactions: true,
              templates: true,
              linkedPullRequests: true,
              events: true,
              search: true,
            },
          }),
        ],
      }),
    ).toBeNull();
  });
});