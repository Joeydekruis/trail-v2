export type SidebarTrailNavId = "dashboard" | "issues";

export function resolveSidebarTrailNav(pathname: string): SidebarTrailNavId | null {
  if (pathname === "/dashboard") return "dashboard";
  if (pathname === "/issues") return "issues";
  /** Legacy routes — still highlight Issues in the nav. */
  if (pathname === "/board") return "issues";
  return null;
}
