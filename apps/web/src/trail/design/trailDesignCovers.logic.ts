import type { DesignListResult } from "@t3tools/trail-contracts";

export type DesignCoverRef = `${string}/${string}`;

export type DesignUsedByEntry = {
  readonly folder: string;
  readonly page: string;
  readonly title: string;
};

export function designUsedByIndex(
  folders: DesignListResult["folders"],
): ReadonlyMap<DesignCoverRef, readonly DesignUsedByEntry[]> {
  const index = new Map<DesignCoverRef, DesignUsedByEntry[]>();
  for (const folder of folders) {
    for (const page of folder.pages) {
      for (const cover of page.covers ?? []) {
        const ref = cover as DesignCoverRef;
        const list = index.get(ref) ?? [];
        list.push({ folder: folder.folder, page: page.page, title: page.title });
        index.set(ref, list);
      }
    }
  }
  return index;
}

export function designUsedByForSelection(
  folders: DesignListResult["folders"],
  selection: { readonly folder: string; readonly page: string },
): readonly DesignUsedByEntry[] {
  const ref: DesignCoverRef = `${selection.folder}/${selection.page}`;
  return designUsedByIndex(folders).get(ref) ?? [];
}

export function designPageSummary(
  folders: DesignListResult["folders"],
  selection: { readonly folder: string; readonly page: string },
) {
  for (const folder of folders) {
    if (folder.folder !== selection.folder) continue;
    return folder.pages.find((page) => page.page === selection.page) ?? null;
  }
  return null;
}