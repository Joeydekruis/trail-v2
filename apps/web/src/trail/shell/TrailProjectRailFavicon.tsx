import { useAtomValue } from "@effect/atom-react";
import { isProjectFaviconFallbackUrl } from "@t3tools/shared/projectFavicon";
import { useEffect, useState } from "react";

import { ProjectFavicon, type ProjectFaviconProject } from "../../components/ProjectFavicon";
import { projectFaviconUrlAtom, refreshProjectFaviconUrl } from "../../state/assets";

export function TrailProjectRailFavicon({ project }: { readonly project: ProjectFaviconProject }) {
  const [loadFailed, setLoadFailed] = useState(false);
  const url = useAtomValue(
    projectFaviconUrlAtom({
      environmentId: project.environmentId,
      cwd: project.workspaceRoot,
      faviconPath: project.faviconPath,
    }),
  );
  const hasIconUrl = url !== null && !isProjectFaviconFallbackUrl(url);

  useEffect(() => {
    setLoadFailed(false);
    if (hasIconUrl) {
      return;
    }
    refreshProjectFaviconUrl({
      environmentId: project.environmentId,
      cwd: project.workspaceRoot,
      faviconPath: project.faviconPath,
    });
  }, [hasIconUrl, project.environmentId, project.faviconPath, project.workspaceRoot]);

  if (hasIconUrl && !loadFailed) {
    return (
      <img
        alt=""
        className="size-[1.125rem] shrink-0 rounded-[0.3125rem] object-contain"
        src={url}
        onError={() => setLoadFailed(true)}
      />
    );
  }

  return (
    <ProjectFavicon
      preferRepoFavicon
      project={project}
      className="size-[1.125rem] text-[length:inherit] font-[inherit]"
    />
  );
}
