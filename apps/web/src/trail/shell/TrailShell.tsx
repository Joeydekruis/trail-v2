import type { ReactNode } from "react";

import { useSidebar } from "../../components/ui/sidebar";

import { ProjectRail } from "./ProjectRail";
import { TrailPrimaryNav } from "./TrailPrimaryNav";
import "../theme/tokens.css";

export function TrailShell({ children }: { readonly children: ReactNode }) {
  const { isMobile } = useSidebar();

  return (
    <div className="flex min-h-0 min-w-0 flex-1" data-trail-shell="">
      {isMobile ? null : (
        <>
          <ProjectRail />
          <TrailPrimaryNav />
        </>
      )}
      <div className="flex min-h-0 min-w-0 flex-1">{children}</div>
    </div>
  );
}
