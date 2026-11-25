import { debugLog } from "./debug.js";
import {
  collectLoopbackSessionTokens,
  readStoredConnection,
  writeStoredConnection,
} from "./sessionSync.js";

const BASE_WEB_PORT = 5733;
const BASE_SERVER_PORT = 13773;
const MAX_PORT_OFFSET = 48;
const CACHE_TTL_MS = 60_000;

const HOSTS = ["127.0.0.1", "localhost"] as const;

export interface LocalTrailConnection {
  readonly serverUrl: string;
  readonly accessToken: string;
}

export class LocalTrailError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LocalTrailError";
  }
}

let cached: { readonly connection: LocalTrailConnection; readonly at: number } | null = null;

function portCandidates(base: number): number[] {
  const ports: number[] = [];
  for (let offset = 0; offset <= MAX_PORT_OFFSET; offset += 1) {
    ports.push(base + offset);
  }
  return ports;
}

function webOrigins(): string[] {
  const origins: string[] = [];
  for (const host of HOSTS) {
    for (const port of portCandidates(BASE_WEB_PORT)) {
      origins.push(`http://${host}:${port}`);
    }
  }
  return origins;
}

async function tryContext(
  origin: string,
  token: string,
): Promise<{ ok: true } | { ok: false; status: number; body: string }> {
  const url = `${origin.replace(/\/$/, "")}/api/trail/feedback/context`;
  try {
    const response = await fetch(url, {
      headers: { authorization: `Bearer ${token}` },
    });
    const body = await response.text();
    if (!response.ok) {
      return { ok: false, status: response.status, body: body.slice(0, 400) };
    }
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, status: 0, body: message };
  }
}

async function probeOrigin(
  origin: string,
  token: string,
  label: string,
): Promise<LocalTrailConnection | null> {
  const attempt = await tryContext(origin, token);
  if (attempt.ok) {
    void debugLog(`Connected via ${label}`, { origin, tokenPrefix: `${token.slice(0, 8)}…` });
    const connection = { serverUrl: origin, accessToken: token };
    await writeStoredConnection(connection);
    return connection;
  }
  void debugLog(`Probe miss (${label})`, { origin, status: attempt.status, body: attempt.body });
  return null;
}

async function readOriginOverride(): Promise<string | null> {
  const raw = await chrome.storage.local.get("trailFeedbackOriginOverride");
  const value = raw.trailFeedbackOriginOverride;
  if (typeof value !== "string" || value.trim() === "") return null;
  try {
    return new URL(value.trim()).origin;
  } catch {
    return null;
  }
}

function originsToProbe(override: string | null): string[] {
  const origins: string[] = [];
  if (override !== null) origins.push(override);
  for (const origin of webOrigins()) {
    if (!origins.includes(origin)) origins.push(origin);
  }
  return origins;
}

function allTrailOrigins(override: string | null): string[] {
  const origins = originsToProbe(override);
  for (const host of HOSTS) {
    for (const port of portCandidates(BASE_SERVER_PORT)) {
      const origin = `http://${host}:${port}`;
      if (!origins.includes(origin)) origins.push(origin);
    }
  }
  return origins;
}

async function tryLocalBootstrap(origins: string[]): Promise<LocalTrailConnection | null> {
  for (const origin of origins) {
    const url = `${origin.replace(/\/$/, "")}/api/trail/feedback/local-bootstrap`;
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) {
        void debugLog("Bootstrap miss", { origin, status: response.status });
        continue;
      }
      const body = (await response.json()) as { serverUrl?: string; accessToken?: string };
      if (typeof body.accessToken !== "string" || typeof body.serverUrl !== "string") continue;
      const check = await tryContext(body.serverUrl, body.accessToken);
      if (!check.ok) {
        void debugLog("Bootstrap token rejected", {
          origin: body.serverUrl,
          status: check.status,
          body: check.body,
        });
        continue;
      }
      const connection = { serverUrl: body.serverUrl, accessToken: body.accessToken };
      await writeStoredConnection(connection);
      void debugLog("Loopback bootstrap ok", { origin: body.serverUrl });
      return connection;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      void debugLog("Bootstrap error", { origin, message });
    }
  }
  return null;
}

async function probeTokenAcrossOrigins(
  token: string,
  origins: string[],
  label: string,
): Promise<LocalTrailConnection | null> {
  for (const origin of origins) {
    const hit = await probeOrigin(origin, token, label);
    if (hit !== null) return hit;
  }
  return null;
}

/** Pairing links use `#token=…`; that value works as Bearer until the web app consumes it. */
export async function registerPairingToken(origin: string, token: string): Promise<boolean> {
  cached = null;
  const origins = originsToProbe(origin);
  const hit = await probeTokenAcrossOrigins(token, origins, "pairing-hash");
  if (hit !== null) {
    cached = { connection: hit, at: Date.now() };
    return true;
  }
  return false;
}

export async function refreshSessionFromCookies(): Promise<boolean> {
  cached = null;
  const tokens = await collectLoopbackSessionTokens();
  void debugLog("Cookie resync", { tokenCount: tokens.length });
  if (tokens.length === 0) return false;
  const origins = originsToProbe(await readOriginOverride());
  for (const session of tokens) {
    const hit = await probeTokenAcrossOrigins(session.token, origins, session.cookieName);
    if (hit !== null) {
      cached = { connection: hit, at: Date.now() };
      return true;
    }
  }
  return false;
}

export async function resolveLocalTrail(): Promise<LocalTrailConnection> {
  const now = Date.now();
  if (cached !== null && now - cached.at < CACHE_TTL_MS) {
    void debugLog("Using cached Trail connection", { origin: cached.connection.serverUrl });
    return cached.connection;
  }

  const override = await readOriginOverride();
  const stored = await readStoredConnection();
  if (stored !== null) {
    const check = await tryContext(stored.serverUrl, stored.accessToken);
    if (check.ok) {
      cached = { connection: stored, at: now };
      void debugLog("Using stored Trail connection", { origin: stored.serverUrl });
      return stored;
    }
    void debugLog("Stored connection expired", { origin: stored.serverUrl, status: check.status });
  }

  const sessionTokens = await collectLoopbackSessionTokens();
  void debugLog("Session scan", {
    override,
    cookieCount: sessionTokens.length,
    domains: sessionTokens.map((t) => t.domain),
  });

  const origins = originsToProbe(override);
  for (const session of sessionTokens) {
    const hit = await probeTokenAcrossOrigins(session.token, origins, session.cookieName);
    if (hit !== null) {
      cached = { connection: hit, at: now };
      return hit;
    }
  }

  let sawServer = false;
  let lastAuthStatus = 0;
  for (const origin of origins) {
    try {
      const response = await fetch(`${origin}/api/trail/feedback/context`);
      if (response.status === 401 || response.status === 403) {
        sawServer = true;
        lastAuthStatus = response.status;
        void debugLog("Trail API present, not authenticated", { origin, status: response.status });
      }
    } catch {
      // not running on this port
    }
  }
  for (const host of HOSTS) {
    for (const port of portCandidates(BASE_SERVER_PORT)) {
      const origin = `http://${host}:${port}`;
      try {
        const response = await fetch(`${origin}/api/trail/feedback/context`);
        if (response.status === 401 || response.status === 403) {
          sawServer = true;
          lastAuthStatus = response.status;
        }
      } catch {
        // not running on this port
      }
    }
  }

  if (sawServer) {
    const bootstrapped = await tryLocalBootstrap(allTrailOrigins(override));
    if (bootstrapped !== null) {
      cached = { connection: bootstrapped, at: now };
      return bootstrapped;
    }
    throw new LocalTrailError(
      "Trail draait, maar er kon geen sessie worden opgezet. Herstart de Trail-server (nieuwste build) en klik Vernieuwen. Of open Trail één keer in Chrome (pairing-URL) als bootstrap uitstaat.",
    );
  }

  throw new LocalTrailError(
    "Geen Trail op localhost. Start `vp run dev` of de desktop-dev-server, open daarna Trail in Chrome op 127.0.0.1, en vernieuw.",
  );
}

export async function setOriginOverride(origin: string | null): Promise<void> {
  if (origin === null || origin.trim() === "") {
    await chrome.storage.local.remove("trailFeedbackOriginOverride");
    cached = null;
    return;
  }
  await chrome.storage.local.set({ trailFeedbackOriginOverride: new URL(origin).origin });
  cached = null;
}

export const defaultLocalTrailOrigin = "http://127.0.0.1:5733";