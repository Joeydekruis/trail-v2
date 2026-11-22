import { createFileRoute } from "@tanstack/react-router";

import { TrailFilesPage } from "../trail/files/TrailFilesPage";

export const Route = createFileRoute("/_chat/files")({
  component: TrailFilesPage,
});
