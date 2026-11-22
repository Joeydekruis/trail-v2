import { createFileRoute } from "@tanstack/react-router";
import { T } from "gt-react";

import { TrailComingSoonPage } from "../trail/shell/TrailComingSoonPage";

function TrailDashboardPage() {
  return (
    <TrailComingSoonPage
      title={<T>Dashboard</T>}
      description={<T>Latest chats, board activity, and project snapshot will show up here.</T>}
    />
  );
}

export const Route = createFileRoute("/_chat/dashboard")({
  component: TrailDashboardPage,
});
