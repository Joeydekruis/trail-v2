import type { DesignListResult, DesignPageKind } from "@t3tools/trail-contracts";

export type TrailDesignCatalogFilter = "all" | "components";

export function filterDesignCatalog(
  folders: DesignListResult["folders"],
  filter: TrailDesignCatalogFilter,
): DesignListResult["folders"] {
  if (filter === "all") return folders;
  return folders
    .map((folder) => ({
      ...folder,
      pages: folder.pages.filter((page) => page.kind === ("component" satisfies DesignPageKind)),
    }))
    .filter((folder) => folder.pages.length > 0);
}