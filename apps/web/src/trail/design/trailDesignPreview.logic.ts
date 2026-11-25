export type TrailDesignSelection = {
  readonly folder: string;
  readonly page: string;
};

export function designSelectionKey(selection: TrailDesignSelection | null): string | null {
  return selection === null ? null : `${selection.folder}/${selection.page}`;
}