import { FolderIcon, MessagesSquareIcon } from "lucide-react";
import { T } from "gt-react";

import { TrailSegmentedToggle, TrailSegmentedToggleItem } from "./TrailSegmentedToggle";

import { useTrailSidebarTabStore, type TrailSidebarTab } from "./trailSidebarTabStore";

export function TrailSidebarChatsFilesToggle() {
  const tab = useTrailSidebarTabStore((store) => store.tab);
  const setTab = useTrailSidebarTabStore((store) => store.setTab);

  return (
    <div data-trail-sidebar-tab-toggle="">
      <TrailSegmentedToggle
        aria-label="Sidebar"
        onValueChange={(values) => {
          const next = values[0];
          if (next === "chats" || next === "files") {
            setTab(next);
          }
        }}
        value={[tab]}
      >
        <TrailSegmentedToggleItem value="chats">
          <MessagesSquareIcon />
          <T context="sidebar lists chat threads">Chats</T>
        </TrailSegmentedToggleItem>
        <TrailSegmentedToggleItem value="files">
          <FolderIcon />
          <T context="sidebar lists worktree files">Files</T>
        </TrailSegmentedToggleItem>
      </TrailSegmentedToggle>
    </div>
  );
}

export function useTrailSidebarListsFiles(): boolean {
  return useTrailSidebarTabStore((store) => store.tab) === "files";
}
