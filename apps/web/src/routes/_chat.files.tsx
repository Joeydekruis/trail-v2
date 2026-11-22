import { createFileRoute } from "@tanstack/react-router";
import { T } from "gt-react";

import { TrailComingSoonPage } from "../trail/shell/TrailComingSoonPage";

function TrailFilesStubPage() {
  return (
    <TrailComingSoonPage
      title={<T>Files</T>}
      description={<T>Browse the project docs/ folder from here.</T>}
    />
  );
}

export const Route = createFileRoute("/_chat/files")({
  component: TrailFilesStubPage,
});
