import type { ReactNode } from "react";

import { useSidebar } from "../../components/ui/sidebar";

import "../theme/tokens.css";
import { ProjectRail } from "./ProjectRail";

export function TrailShell({ children }: { readonly children: ReactNode }) {
  const { isMobile } = useSidebar();

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1" data-trail-shell="">
      {isMobile ? null : <ProjectRail />}
      <div className="flex min-h-0 min-w-0 flex-1">{children}</div>
    </div>
  );
}
