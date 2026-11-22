import * as Schema from "effect/Schema";

export const TRAIL_PROJECT_ACCENTS_STORAGE_KEY = "trail:project-accents:v1";

/** Stable palette for per-project accent stripes (mint first = Trail brand). */
export const TRAIL_ACCENT_PALETTE = [
  "#4AF7A3",
  "#5B8CFF",
  "#F7B84A",
  "#F76E6E",
  "#C084FC",
  "#38BDF8",
  "#F472B6",
  "#A3E635",
] as const;

export type TrailAccentColor = (typeof TRAIL_ACCENT_PALETTE)[number];

export const AccentsSchema = Schema.Record(Schema.String, Schema.String);

export type ProjectAccentMap = Readonly<Record<string, string>>;

export function hashProjectKey(projectKey: string): number {
  let hash = 0;
  for (let i = 0; i < projectKey.length; i++) {
    hash = (hash * 31 + projectKey.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function defaultAccentForProject(projectKey: string): TrailAccentColor {
  return TRAIL_ACCENT_PALETTE[hashProjectKey(projectKey) % TRAIL_ACCENT_PALETTE.length]!;
}

export function resolveProjectAccent(projectKey: string, overrides: ProjectAccentMap = {}): string {
  const override = overrides[projectKey];
  if (typeof override === "string" && override.length > 0) return override;
  return defaultAccentForProject(projectKey);
}

export function projectInitial(displayName: string): string {
  const trimmed = displayName.trim();
  if (trimmed.length === 0) return "?";
  const letter = trimmed.match(/\p{L}|\p{N}/u)?.[0];
  return (letter ?? trimmed[0]!).toLocaleUpperCase();
}
