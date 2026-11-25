import { createFileRoute, redirect } from "@tanstack/react-router";

/** Option B: files live in the chat sidebar, not as a top-level page. */
export const Route = createFileRoute("/_chat/files")({
  beforeLoad: () => {
    throw redirect({ to: "/", replace: true });
  },
});