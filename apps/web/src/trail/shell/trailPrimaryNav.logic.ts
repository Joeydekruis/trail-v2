export type TrailPrimaryNavId = "dashboard" | "chat" | "board" | "files";

export function resolveTrailPrimaryNav(pathname: string): TrailPrimaryNavId {
  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) return "dashboard";
  if (pathname === "/board" || pathname.startsWith("/board/")) return "board";
  if (pathname === "/files" || pathname.startsWith("/files/")) return "files";
  return "chat";
}

export function isTrailUtilityPage(pathname: string): boolean {
  return (
    pathname === "/board" ||
    pathname.startsWith("/board/") ||
    pathname === "/files" ||
    pathname.startsWith("/files/") ||
    pathname === "/dashboard" ||
    pathname.startsWith("/dashboard/")
  );
}
