import { useLocation, useNavigate } from "@tanstack/react-router";
import { Columns3Icon, FileTextIcon, LayoutDashboardIcon, MessagesSquareIcon } from "lucide-react";
import { useGT } from "gt-react";
import type { ReactNode } from "react";

import { useNavigateToMainApp } from "../../components/sidebar/mainAppLocation";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../../components/ui/tooltip";
import { cn } from "../../lib/utils";

import { resolveTrailPrimaryNav, type TrailPrimaryNavId } from "./trailPrimaryNav.logic";

const NAV_ITEMS: ReadonlyArray<{
  id: TrailPrimaryNavId;
  icon: ReactNode;
}> = [
  { id: "dashboard", icon: <LayoutDashboardIcon className="size-4" /> },
  { id: "chat", icon: <MessagesSquareIcon className="size-4" /> },
  { id: "board", icon: <Columns3Icon className="size-4" /> },
  { id: "files", icon: <FileTextIcon className="size-4" /> },
];

export function TrailPrimaryNav() {
  const gt = useGT();
  const navigate = useNavigate();
  const navigateToMainApp = useNavigateToMainApp();
  const pathname = useLocation({ select: (location) => location.pathname });
  const active = resolveTrailPrimaryNav(pathname);

  const labels: Record<TrailPrimaryNavId, string> = {
    dashboard: gt("Dashboard", { $context: "Trail primary nav" }),
    chat: gt("Chat", { $context: "Trail primary nav" }),
    board: gt("Board", { $context: "Trail primary nav" }),
    files: gt("Files", { $context: "Trail primary nav" }),
  };

  const go = (id: TrailPrimaryNavId) => {
    switch (id) {
      case "dashboard":
        void navigate({ to: "/dashboard" });
        return;
      case "chat":
        navigateToMainApp();
        return;
      case "board":
        void navigate({ to: "/board", search: { status: "open" } });
        return;
      case "files":
        void navigate({ to: "/files" });
        return;
    }
  };

  return (
    <nav
      aria-label={gt("Primary", { $context: "Trail primary navigation" })}
      data-trail-primary-nav=""
    >
      {NAV_ITEMS.map((item) => {
        const selected = active === item.id;
        return (
          <Tooltip key={item.id}>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  aria-label={labels[item.id]}
                  aria-current={selected ? "page" : undefined}
                  className={cn(
                    "flex size-10 flex-col items-center justify-center gap-0.5 rounded-md text-3xs font-medium outline-hidden",
                  )}
                  onClick={() => go(item.id)}
                />
              }
            >
              {item.icon}
              <span className="max-w-full truncate px-0.5 leading-none">{labels[item.id]}</span>
            </TooltipTrigger>
            <TooltipPopup side="right">{labels[item.id]}</TooltipPopup>
          </Tooltip>
        );
      })}
    </nav>
  );
}
