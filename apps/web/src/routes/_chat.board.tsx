import { createFileRoute, redirect } from "@tanstack/react-router";

import { boardSearchFromUrl } from "../trail/board/boardSearch.logic";
import { writeStoredIssuesIm } from "../trail/issues/issuesIm.logic";

export const Route = createFileRoute("/_chat/board")({
  validateSearch: boardSearchFromUrl,
  beforeLoad: ({ search }) => {
    writeStoredIssuesIm("board");
    throw redirect({
      to: "/issues",
      search: {
        who: "all",
        status: search.status,
        im: "board",
        ...(search.label?.length ? { label: search.label } : {}),
        ...(search.host ? { host: search.host } : {}),
        ...(search.selectedEnvironmentId
          ? { selectedEnvironmentId: search.selectedEnvironmentId }
          : {}),
        ...(search.selectedProjectId ? { selectedProjectId: search.selectedProjectId } : {}),
        ...(search.selectedHost ? { selectedHost: search.selectedHost } : {}),
        ...(search.tracker ? { tracker: search.tracker } : {}),
        ...(search.scope ? { scope: search.scope } : {}),
        ...(search.key ? { key: search.key } : {}),
      },
    });
  },
});