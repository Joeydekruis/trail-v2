import type { ThreadRouteTarget } from "../../threadRoutes";

/** Chat routes where the sidebar can switch between Chats and Files (Option B). */
export function isTrailChatSidebarRoute(
  pathname: string,
  threadTarget: ThreadRouteTarget | null,
): boolean {
  if (threadTarget !== null) {
    return true;
  }
  return pathname === "/" || pathname.startsWith("/draft/");
}
