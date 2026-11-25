import { create } from "zustand";

export type TrailSidebarTab = "chats" | "files";

type TrailSidebarTabState = {
  tab: TrailSidebarTab;
  setTab: (tab: TrailSidebarTab) => void;
};

export const useTrailSidebarTabStore = create<TrailSidebarTabState>((set) => ({
  tab: "chats",
  setTab: (tab) => set({ tab }),
}));
