import { T, useGT } from "gt-react";
import type { ReactNode } from "react";

import { SidebarInset } from "../../components/ui/sidebar";
import { WorkspaceBreadcrumb, WorkspaceBreadcrumbItem } from "../../components/WorkspaceBreadcrumb";
import { WorkspacePageContainer } from "../../components/WorkspacePageContainer";
import { WorkspacePageHeader } from "../../components/WorkspacePageHeader";
import { isElectron } from "../../env";

export function TrailComingSoonPage({
  title,
  description,
}: {
  readonly title: ReactNode;
  readonly description: ReactNode;
}) {
  const gt = useGT();
  return (
    <SidebarInset className="h-dvh">
      <WorkspacePageHeader electron={isElectron}>
        <WorkspaceBreadcrumb ariaLabel={gt("Page breadcrumb", { $context: "Trail stub page" })}>
          <WorkspaceBreadcrumbItem current>{title}</WorkspaceBreadcrumbItem>
        </WorkspaceBreadcrumb>
      </WorkspacePageHeader>
      <WorkspacePageContainer width="readable">
        <div className="flex flex-col gap-2 pt-8">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="text-muted-foreground text-sm">{description}</p>
          <p className="text-muted-foreground text-sm">
            <T>Coming soon</T>
          </p>
        </div>
      </WorkspacePageContainer>
    </SidebarInset>
  );
}
