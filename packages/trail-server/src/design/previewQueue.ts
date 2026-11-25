import * as Effect from "effect/Effect";

/** Phase 3+ hook: enqueue PNG previews for changed design pages (not committed to git). */
export const queueDesignPreviews = (_input: {
  readonly projectId: string;
  readonly folder: string;
  readonly pages: readonly string[];
}) => Effect.void;