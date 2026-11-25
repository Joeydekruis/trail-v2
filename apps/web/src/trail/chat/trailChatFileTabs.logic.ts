export type TrailChatMainTab = "chat";

export type TrailChatFileTab = {
  readonly relativePath: string;
  readonly revealLine: number | null;
  readonly revealRequestId: number;
};

export type TrailChatFileTabsState = {
  readonly active: TrailChatMainTab | string;
  readonly tabs: readonly TrailChatFileTab[];
};

export function trailChatFileTabLabel(relativePath: string): string {
  const segments = relativePath.split("/");
  return segments[segments.length - 1] || relativePath;
}

export function openTrailChatFileTab(
  state: TrailChatFileTabsState | undefined,
  relativePath: string,
  revealLine?: number,
): TrailChatFileTabsState {
  const trimmed = relativePath.trim();
  if (!trimmed) {
    return state ?? { active: "chat", tabs: [] };
  }
  const existing = state?.tabs.find((tab) => tab.relativePath === trimmed);
  const revealRequestId = (existing?.revealRequestId ?? 0) + (revealLine !== undefined ? 1 : 0);
  const nextTab: TrailChatFileTab = {
    relativePath: trimmed,
    revealLine: revealLine ?? existing?.revealLine ?? null,
    revealRequestId: revealLine !== undefined ? revealRequestId : (existing?.revealRequestId ?? 0),
  };
  const tabs = existing
    ? state!.tabs.map((tab) => (tab.relativePath === trimmed ? nextTab : tab))
    : [...(state?.tabs ?? []), nextTab];
  return { active: trimmed, tabs };
}

export function closeTrailChatFileTab(
  state: TrailChatFileTabsState,
  relativePath: string,
): TrailChatFileTabsState {
  const tabs = state.tabs.filter((tab) => tab.relativePath !== relativePath);
  if (tabs.length === 0) {
    return { active: "chat", tabs };
  }
  if (state.active !== relativePath) {
    return { ...state, tabs };
  }
  const closedIndex = state.tabs.findIndex((tab) => tab.relativePath === relativePath);
  const next =
    tabs[Math.min(closedIndex, tabs.length - 1)]?.relativePath ??
    tabs[tabs.length - 1]?.relativePath ??
    "chat";
  return { active: next, tabs };
}

export function setTrailChatMainTab(
  state: TrailChatFileTabsState | undefined,
  active: TrailChatMainTab | string,
): TrailChatFileTabsState {
  return { active, tabs: state?.tabs ?? [] };
}
