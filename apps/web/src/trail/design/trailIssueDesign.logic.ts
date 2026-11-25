export function trailIssueNumberFromKey(key: string): number | null {
  const parsed = Number(key);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
}