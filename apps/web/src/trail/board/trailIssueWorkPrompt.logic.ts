export function buildTrailIssueStartPrompt(input: {
  readonly displayKey: string;
  readonly title: string;
  readonly body?: string | null;
}): string {
  const lines = [
    `Start task: work on GitHub issue ${input.displayKey}: ${input.title}.`,
    "Read the issue description and acceptance criteria, then implement the change in this project.",
  ];
  const body = input.body?.trim();
  if (body) {
    lines.push("", "Issue description:", body);
  }
  return lines.join("\n");
}
