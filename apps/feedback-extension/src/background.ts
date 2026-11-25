import { submitFeedbackBatch } from "./api.js";
import { debugLog } from "./debug.js";
import { defaultLocalTrailOrigin, refreshSessionFromCookies, registerPairingToken } from "./localTrail.js";
import { startSessionCookieWatch } from "./sessionSync.js";
import { readSettings } from "./storage.js";
import type { PendingComment } from "./types.js";

const CONTENT_SCRIPT_ID = "trail-feedback-hud";

const HUD_CONTENT_SCRIPT = {
  id: CONTENT_SCRIPT_ID,
  js: ["content.js"],
  css: ["content.css"],
  matches: ["http://*/*", "https://*/*"],
  runAt: "document_idle" as const,
};

let hudRegistration: Promise<void> | undefined;

const isDuplicateScriptIdError = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("Duplicate script ID");
};

async function applyHudContentScript(): Promise<void> {
  const existing = await chrome.scripting.getRegisteredContentScripts({ ids: [CONTENT_SCRIPT_ID] });
  if (existing.length > 0) {
    await chrome.scripting.updateContentScripts([HUD_CONTENT_SCRIPT]);
    void debugLog("Content script updated", { id: CONTENT_SCRIPT_ID });
    return;
  }
  try {
    await chrome.scripting.registerContentScripts([HUD_CONTENT_SCRIPT]);
    void debugLog("Content script registered", { id: CONTENT_SCRIPT_ID });
  } catch (error) {
    if (!isDuplicateScriptIdError(error)) throw error;
    await chrome.scripting.unregisterContentScripts({ ids: [CONTENT_SCRIPT_ID] });
    await chrome.scripting.registerContentScripts([HUD_CONTENT_SCRIPT]);
    void debugLog("Content script re-registered", { id: CONTENT_SCRIPT_ID });
  }
}

function registerHudContentScript(): Promise<void> {
  if (hudRegistration) return hudRegistration;
  hudRegistration = applyHudContentScript().finally(() => {
    hudRegistration = undefined;
  });
  return hudRegistration;
}

void refreshSessionFromCookies();
startSessionCookieWatch(() => {
  void refreshSessionFromCookies();
});

chrome.runtime.onInstalled.addListener(() => {
  void registerHudContentScript();
});
void registerHudContentScript();

const pendingByTab = new Map<number, PendingComment[]>();

async function captureTab(tabId: number): Promise<string | null> {
  try {
    const tab = await chrome.tabs.get(tabId);
    if (!tab.windowId) return null;
    return chrome.tabs.captureVisibleTab(tab.windowId, { format: "png" });
  } catch {
    return null;
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  void (async () => {
    if (message?.type === "trail-feedback:capture-tab") {
      const tabId = sender.tab?.id;
      if (tabId === undefined) {
        sendResponse(null);
        return;
      }
      sendResponse(await captureTab(tabId));
      return;
    }
    if (message?.type === "trail-feedback:queue-comment" && sender.tab?.id !== undefined) {
      const tabId = sender.tab.id;
      const list = pendingByTab.get(tabId) ?? [];
      list.push(message.comment as PendingComment);
      pendingByTab.set(tabId, list);
      sendResponse({ ok: true, count: list.length });
      return;
    }
    if (message?.type === "trail-feedback:pending-count" && sender.tab?.id !== undefined) {
      sendResponse({ count: pendingByTab.get(sender.tab.id)?.length ?? 0 });
      return;
    }
    if (
      (message?.type === "trail-feedback:submit-tab" || message?.type === "trail-feedback:submit-current") &&
      (message.tabId !== undefined || sender.tab?.id !== undefined)
    ) {
      const tabId = (message.tabId as number | undefined) ?? sender.tab?.id;
      if (tabId === undefined) {
        sendResponse({ ok: false, error: "No tab." });
        return;
      }
      const settings = await readSettings();
      const comments = pendingByTab.get(tabId) ?? [];
      if (comments.length === 0) {
        sendResponse({ ok: false, error: "No comments in this tab." });
        return;
      }
      try {
        const result = await submitFeedbackBatch({
          settings,
          comments,
        });
        void debugLog("Submit OK", result);
        pendingByTab.delete(tabId);
        sendResponse({ ok: true, result });
      } catch (error) {
        void debugLog(
          "Submit error",
          error instanceof Error ? error.message : String(error),
        );
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : "Submit failed.",
        });
      }
      return;
    }
    if (message?.type === "trail-feedback:clear-tab" && message.tabId !== undefined) {
      pendingByTab.delete(message.tabId as number);
      sendResponse({ ok: true });
      return;
    }
    if (message?.type === "trail-feedback:arm") {
      sendResponse({ ok: true });
      return;
    }
    if (message?.type === "trail-feedback:sync-sessions") {
      const ok = await refreshSessionFromCookies();
      sendResponse({ ok });
      return;
    }
    if (
      message?.type === "trail-feedback:pairing-token" &&
      typeof message.origin === "string" &&
      typeof message.token === "string"
    ) {
      const ok = await registerPairingToken(message.origin, message.token);
      void debugLog("Pairing token captured", { origin: message.origin, ok });
      sendResponse({ ok });
      return;
    }
    if (message?.type === "trail-feedback:open-trail") {
      const url = typeof message.url === "string" ? message.url : defaultLocalTrailOrigin;
      await chrome.tabs.create({ url });
      sendResponse({ ok: true });
      return;
    }
    sendResponse({ ok: false, error: "Unknown message." });
  })();
  return true;
});