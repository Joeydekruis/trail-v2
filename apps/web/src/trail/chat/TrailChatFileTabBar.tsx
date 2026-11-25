import { scopedThreadKey } from "@t3tools/client-runtime/environment";
import type { ScopedThreadRef } from "@t3tools/contracts";
import { useGT, T } from "gt-react";
import { MessagesSquareIcon, XIcon } from "lucide-react";

import { trailChatFileTabLabel } from "./trailChatFileTabs.logic";
import { useTrailChatFileTabsStore } from "./trailChatFileTabsStore";

export function TrailChatFileTabBar({ threadRef }: { readonly threadRef: ScopedThreadRef }) {
  const gt = useGT();
  const threadKey = scopedThreadKey(threadRef);
  const state = useTrailChatFileTabsStore((store) => store.byThreadKey[threadKey]);
  const activate = useTrailChatFileTabsStore((store) => store.activate);
  const close = useTrailChatFileTabsStore((store) => store.close);
  const tabs = state?.tabs ?? [];
  const active = state?.active ?? "chat";
  if (tabs.length === 0) return null;

  return (
    <div
      className="flex h-[var(--workspace-topbar-height)] min-h-[var(--workspace-topbar-height)] shrink-0 items-stretch overflow-x-auto bg-background"
      data-trail-chat-workspace-tabs=""
      role="tablist"
      aria-label={gt("Workspace")}
    >
      <button
        type="button"
        role="tab"
        aria-selected={active === "chat"}
        data-trail-workspace-tab=""
        data-active={active === "chat" ? "true" : "false"}
        onClick={() => activate(threadRef, "chat")}
      >
        <MessagesSquareIcon aria-hidden className="size-3.5 shrink-0 opacity-80" />
        <T context="main chat workspace tab">Chat</T>
      </button>
      {tabs.map((tab) => {
        const selected = active === tab.relativePath;
        const label = trailChatFileTabLabel(tab.relativePath);
        return (
          <div
            key={tab.relativePath}
            className="flex shrink-0 items-stretch"
            data-trail-workspace-tab-wrap=""
          >
            <button
              type="button"
              role="tab"
              aria-selected={selected}
              data-trail-workspace-tab=""
              data-active={selected ? "true" : "false"}
              title={tab.relativePath}
              onClick={() => activate(threadRef, tab.relativePath)}
            >
              <span className="truncate">{label}</span>
            </button>
            <button
              type="button"
              data-trail-workspace-tab-close=""
              aria-label={gt("Close {name}", { name: label })}
              onClick={(event) => {
                event.stopPropagation();
                close(threadRef, tab.relativePath);
              }}
            >
              <XIcon aria-hidden className="size-3" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
