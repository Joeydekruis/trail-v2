export function resolveTrailSidebarFilesCwd(input: {
  readonly worktreePath: string | null | undefined;
  readonly projectWorkspaceRoot: string | null | undefined;
}): string | null {
  const worktree = input.worktreePath?.trim();
  if (worktree) return worktree;
  const root = input.projectWorkspaceRoot?.trim();
  if (root) return root;
  return null;
}
