const STORED_CONNECTION_KEY = "trailFeedbackStoredConnection";

export interface StoredTrailConnection {
  readonly serverUrl: string;
  readonly accessToken: string;
  readonly savedAt: number;
}

export async function readStoredConnection(): Promise<StoredTrailConnection | null> {
  const raw = await chrome.storage.local.get(STORED_CONNECTION_KEY);
  const value = raw[STORED_CONNECTION_KEY];
  if (
    typeof value !== "object" ||
    value === null ||
    typeof (value as StoredTrailConnection).serverUrl !== "string" ||
    typeof (value as StoredTrailConnection).accessToken !== "string"
  ) {
    return null;
  }
  return value as StoredTrailConnection;
}

export async function writeStoredConnection(connection: {
  readonly serverUrl: string;
  readonly accessToken: string;
}): Promise<void> {
  await chrome.storage.local.set({
    [STORED_CONNECTION_KEY]: {
      serverUrl: connection.serverUrl,
      accessToken: connection.accessToken,
      savedAt: Date.now(),
    } satisfies StoredTrailConnection,
  });
}

export interface TrailSessionToken {
  readonly token: string;
  readonly cookieName: string;
  readonly domain: string;
}

const isLoopbackDomain = (domain: string) =>
  domain === "localhost" || domain === "127.0.0.1" || domain === ".localhost";

/** Trail cookies Chrome may have after you pair in a normal tab (not in Electron). */
export async function collectLoopbackSessionTokens(): Promise<TrailSessionToken[]> {
  const all = await chrome.cookies.getAll({});
  const found: TrailSessionToken[] = [];
  for (const cookie of all) {
    if (!isLoopbackDomain(cookie.domain)) continue;
    if (cookie.name.startsWith("t3_dev_session_") && cookie.value) {
      found.push({ token: cookie.value, cookieName: cookie.name, domain: cookie.domain });
    } else if (cookie.name.startsWith("t3_session_") && cookie.value.length > 0) {
      found.push({ token: cookie.value, cookieName: cookie.name, domain: cookie.domain });
    }
  }
  const seen = new Set<string>();
  return found.filter((entry) => {
    const key = `${entry.domain}:${entry.token.slice(0, 16)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function startSessionCookieWatch(onChange: () => void): void {
  chrome.cookies.onChanged.addListener((change) => {
    const name = change.cookie.name;
    if (
      !isLoopbackDomain(change.cookie.domain) ||
      (!name.startsWith("t3_dev_session_") && !name.startsWith("t3_session_"))
    ) {
      return;
    }
    onChange();
  });
}