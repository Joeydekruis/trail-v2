import type { TrailFeedbackAnnotationWire } from "@t3tools/trail-contracts";

export function buildFeedbackIssueBody(input: {
  readonly annotations: ReadonlyArray<TrailFeedbackAnnotationWire>;
  readonly intro?: string | undefined;
}): string {
  const lines: string[] = [];
  const intro = input.intro?.trim();
  if (intro) lines.push(intro, "");
  lines.push("## Preview feedback");
  for (const annotation of input.annotations) {
    const comment = annotation.comment.trim();
    if (comment.length === 0) continue;
    const title = annotation.pageTitle?.trim() || annotation.pageUrl;
    lines.push(`- **${title}** — ${comment}`);
    lines.push(`  - Page: ${annotation.pageUrl}`);
  }
  return lines.join("\n").trim();
}