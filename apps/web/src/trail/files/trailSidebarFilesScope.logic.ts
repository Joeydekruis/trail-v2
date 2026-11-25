export type TrailFilesScopeMode = "worktree" | "project";

export function resolveTrailFilesScope(input: {
  readonly cwd: string;
  readonly worktreePath: string | null | undefined;
  readonly branch: string | null | undefined;
  readonly projectName: string;
}): {
  readonly mode: TrailFilesScopeMode;
  readonly headline: string;
  readonly pathLabel: string;
} {
  const worktree = input.worktreePath?.trim() ?? null;
  if (worktree !== null && worktree === input.cwd) {
    const branch = input.branch?.trim();
    return {
      mode: "worktree",
      headline: branch && branch.length > 0 ? branch : "Worktree",
      pathLabel: worktree,
    };
  }
  return {
    mode: "project",
    headline: input.projectName.trim().length > 0 ? input.projectName.trim() : "Project",
    pathLabel: input.cwd,
  };
}
