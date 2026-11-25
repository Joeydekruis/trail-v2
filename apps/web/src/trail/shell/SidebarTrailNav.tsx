import { useLocation, useNavigate } from "@tanstack/react-router";
import { CircleDotIcon, LayoutDashboardIcon } from "lucide-react";
import { useGT } from "gt-react";
import type { ReactNode } from "react";

import { issuesNavSearch } from "../issues/issuesIm.logic";
import "../theme/tokens.css";
import { useSidebar } from "../../components/ui/sidebar";
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "../../components/ui/sidebar";

import { resolveSidebarTrailNav, type SidebarTrailNavId } from "./sidebarTrailNav.logic";

const NAV_ITEMS: ReadonlyArray<{
  id: SidebarTrailNavId;
  icon: ReactNode;
}> = [
  { id: "dashboard", icon: <LayoutDashboardIcon className="size-4 shrink-0" /> },
  { id: "issues", icon: <CircleDotIcon className="size-4 shrink-0" /> },
];

export function SidebarTrailNav() {
  const gt = useGT();
  const navigate = useNavigate();
  const { isMobile, setOpenMobile } = useSidebar();
  const pathname = useLocation({ select: (location) => location.pathname });
  const active = resolveSidebarTrailNav(pathname);

  const labels: Record<SidebarTrailNavId, string> = {
    dashboard: gt("Dashboard", { $context: "Trail sidebar nav" }),
    issues: gt("Issues", { $context: "Trail sidebar nav" }),
  };

  const closeMobileSidebar = () => {
    if (isMobile) setOpenMobile(false);
  };

  const go = (id: SidebarTrailNavId) => {
    closeMobileSidebar();
    switch (id) {
      case "dashboard":
        void navigate({ to: "/dashboard" });
        return;
      case "issues":
        void navigate({
          to: "/issues",
          search: issuesNavSearch(),
        });
        return;
    }
  };

  return (
    <SidebarGroup className="px-2 py-1" data-trail-sidebar-nav="">
      <SidebarMenu>
        {NAV_ITEMS.map((item) => {
          const selected = active === item.id;
          return (
            <SidebarMenuItem key={item.id}>
              <SidebarMenuButton
                isActive={selected}
                onClick={() => go(item.id)}
                tooltip={labels[item.id]}
              >
                {item.icon}
                <span>{labels[item.id]}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
