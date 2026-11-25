// @effect-diagnostics nodeBuiltinImport:off -- sync sha256 for design bytes
import * as crypto from "node:crypto";

export const contentHash = (bytes: Uint8Array): string =>
  `sha256:${crypto.createHash("sha256").update(bytes).digest("hex")}`;

export const contentHashFromString = (text: string): string =>
  contentHash(new TextEncoder().encode(text));