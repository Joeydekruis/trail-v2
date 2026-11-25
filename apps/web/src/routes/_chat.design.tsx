import { createFileRoute } from "@tanstack/react-router";

import { TrailDesignPage } from "../trail/design/TrailDesignPage";
import { trailDesignSearchFromUrl } from "../trail/design/trailDesignRoute.logic";

export const Route = createFileRoute("/_chat/design")({
  validateSearch: trailDesignSearchFromUrl,
  component: TrailDesignPage,
});