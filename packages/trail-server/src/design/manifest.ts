import {
  type DesignFolderManifest,
  type DesignPageManifest,
  type DesignSavePageInput,
  type DesignVersionEntry,
} from "@t3tools/trail-contracts";

import { contentHashFromString } from "./hash.ts";

export const defaultPageFile = (pageSlug: string) => `${pageSlug}.html`;

export const emptyFolderManifest = (
  folder: string,
  source?: string,
): DesignFolderManifest => ({
  schema: 1,
  folder,
  pages: {},
  ...(source === undefined ? {} : { source }),
});

export const currentVersion = (page: DesignPageManifest): DesignVersionEntry | undefined =>
  page.versions.at(-1);

export const currentVersionNumber = (page: DesignPageManifest): number =>
  currentVersion(page)?.n ?? 0;

export const pageHashMatchesFile = (page: DesignPageManifest, html: string): boolean => {
  const current = currentVersion(page);
  if (current === undefined) return false;
  return current.hash === contentHashFromString(html);
};

export const nextVersionNumber = (page: DesignPageManifest | undefined): number =>
  page === undefined ? 1 : currentVersionNumber(page) + 1;

export const applySavePage = (input: {
  readonly existing: DesignPageManifest | undefined;
  readonly entry: DesignSavePageInput;
  readonly commitSha: string;
  readonly hash: string;
  readonly at: string;
  readonly by: DesignVersionEntry["by"];
  readonly issue?: number;
}): DesignPageManifest => {
  const file = defaultPageFile(input.entry.page);
  const versions = [...(input.existing?.versions ?? [])];
  const n = nextVersionNumber(input.existing);
  versions.push({
    n,
    commit: commitShaShort(input.commitSha),
    hash: input.hash,
    note: input.entry.note,
    at: input.at,
    by: input.by,
  });
  const links = { ...(input.existing?.links ?? {}) };
  if (input.issue !== undefined) {
    const issues = new Set(links.issues ?? []);
    issues.add(input.issue);
    links.issues = [...issues];
  }
  return {
    file,
    title: input.entry.title,
    kind: input.entry.kind,
    covers: input.entry.covers ?? input.existing?.covers,
    versions,
    links: Object.keys(links).length > 0 ? links : undefined,
  };
};

export const recordManualDrift = (
  page: DesignPageManifest,
  onDiskHash: string,
  at: string,
): DesignPageManifest => {
  const current = currentVersion(page);
  if (current === undefined || current.hash === onDiskHash) return page;
  const versions = [...page.versions];
  versions.push({
    n: nextVersionNumber(page),
    commit: current.commit,
    hash: onDiskHash,
    note: "manual edit",
    at,
    by: "manual",
  });
  return { ...page, versions };
};

const commitShaShort = (sha: string) => (sha.length > 7 ? sha.slice(0, 7) : sha);