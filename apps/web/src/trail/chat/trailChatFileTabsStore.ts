import type { ScopedThreadRef } from "@t3tools/contracts";
import { scopedThreadKey } from "@t3tools/client-runtime/environment";
import { create } from "zustand";

import {
  closeTrailChatFileTab,
  openTrailChatFileTab,
  setTrailChatMainTab,
  type TrailChatFileTabsState,
} from "./trailChatFileTabs.logic";

type Store = {
  readonly byThreadKey: Readonly<Record<string, TrailChatFileTabsState>>;
  openFile: (threadRef: ScopedThreadRef, relativePath: string, line?: number) => void;
  activate: (threadRef: ScopedThreadRef, tab: "chat" | string) => void;
  close: (threadRef: ScopedThreadRef, relativePath: string) => void;
  read: (threadKey: string) => TrailChatFileTabsState;
};

export const TRAIL_CENTER_CHAT_FILE_TABS = true;

export const useTrailChatFileTabsStore = create<Store>()((set, get) => ({
  byThreadKey: {},
  read: (threadKey) => get().byThreadKey[threadKey] ?? { active: "chat", tabs: [] },
  openFile: (threadRef, relativePath, line) => {
    const threadKey = scopedThreadKey(threadRef);
    const current = get().byThreadKey[threadKey];
    const next = openTrailChatFileTab(current, relativePath, line);
    set({ byThreadKey: { ...get().byThreadKey, [threadKey]: next } });
  },
  activate: (threadRef, tab) => {
    const threadKey = scopedThreadKey(threadRef);
    const current = get().byThreadKey[threadKey];
    set({
      byThreadKey: {
        ...get().byThreadKey,
        [threadKey]: setTrailChatMainTab(current, tab),
      },
    });
  },
  close: (threadRef, relativePath) => {
    const threadKey = scopedThreadKey(threadRef);
    const current = get().byThreadKey[threadKey];
    if (!current || current.tabs.length === 0) return;
    const next = closeTrailChatFileTab(current, relativePath);
    set({ byThreadKey: { ...get().byThreadKey, [threadKey]: next } });
  },
}));

export function openTrailChatFile(
  threadRef: ScopedThreadRef,
  relativePath: string,
  line?: number,
): void {
  if (!TRAIL_CENTER_CHAT_FILE_TABS) return;
  useTrailChatFileTabsStore.getState().openFile(threadRef, relativePath, line);
}

export function useTrailChatFileTabActive(threadRef: ScopedThreadRef | null): boolean {
  return useTrailChatFileTabsStore((store) => {
    if (threadRef === null) return false;
    const threadKey = scopedThreadKey(threadRef);
    const active = store.byThreadKey[threadKey]?.active ?? "chat";
    return active !== "chat";
  });
}
