import { createFileRoute } from "@tanstack/react-router";

import { TrailDashboardPage } from "../trail/dashboard/TrailDashboardPage";

export const Route = createFileRoute("/_chat/dashboard")({
  component: TrailDashboardPage,
});