import type { ProjectId } from "@t3tools/contracts";
import type { DesignForIssueResult } from "@t3tools/trail-contracts";
import { Link } from "@tanstack/react-router";
import { T } from "gt-react";
import { PaletteIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { fetchTrailDesignForIssue } from "./trailDesignApi";
import { trailIssueNumberFromKey } from "./trailIssueDesign.logic";

export function TrailIssueDesignLinks({
  projectId,
  issueKey,
}: {
  readonly projectId: ProjectId;
  readonly issueKey: string;
}) {
  const issue = trailIssueNumberFromKey(issueKey);
  const [result, setResult] = useState<DesignForIssueResult | null | "error">(null);

  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- load linked designs for issue drawer
  useEffect(() => {
    if (issue === null) {
      setResult(null);
      return;
    }
    setResult(null);
    void fetchTrailDesignForIssue({ projectId, issue })
      .then((data) => setResult(data))
      .catch(() => setResult("error"));
  }, [issue, projectId]);

  if (issue === null) return null;
  if (result === null) return null;
  if (result === "error") return null;
  if (result.pages.length === 0 && result.components.length === 0) return null;

  return (
    <section
      className="border-b border-border px-4 py-3"
      data-trail-issue-designs=""
      aria-labelledby="trail-issue-designs-heading"
    >
      <h3
        id="trail-issue-designs-heading"
        className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
      >
        <PaletteIcon className="size-3.5" aria-hidden />
        <T context="Trail issue drawer">Linked designs</T>
      </h3>
      <ul className="flex flex-col gap-1 text-sm">
        {result.pages.map((page) => (
          <li key={`${page.folder}/${page.page}`}>
            <Link
              to="/design"
              search={{ folder: page.folder, page: page.page }}
              className="text-[color:var(--trail-accent)] underline-offset-2 hover:underline"
            >
              {page.title}{" "}
              <span className="font-mono text-2xs text-muted-foreground">
                {page.folder}/{page.page}@v{page.version}
              </span>
            </Link>
          </li>
        ))}
        {result.components.length > 0 ? (
          <li className="mt-1 text-2xs text-muted-foreground">
            <T context="Trail issue drawer">Covers components:</T>{" "}
            {result.components.map((c) => `${c.folder}/${c.page}`).join(", ")}
          </li>
        ) : null}
      </ul>
    </section>
  );
}