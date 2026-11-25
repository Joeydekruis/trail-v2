export type TrailDesignSearch = {
  readonly folder?: string;
  readonly page?: string;
};

export function trailDesignSearchFromUrl(search: Record<string, unknown>): TrailDesignSearch {
  return {
    ...(typeof search.folder === "string" ? { folder: search.folder } : {}),
    ...(typeof search.page === "string" ? { page: search.page } : {}),
  };
}

export function trailDesignDeepSelection(
  search: TrailDesignSearch,
): { folder: string; page: string } | null {
  if (search.folder === undefined || search.page === undefined) return null;
  return { folder: search.folder, page: search.page };
}