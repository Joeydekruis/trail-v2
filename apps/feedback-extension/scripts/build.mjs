import * as esbuild from "esbuild";
import * as NodeFS from "node:fs";
import * as NodePath from "node:path";

const root = NodePath.dirname(import.meta.dirname);
const dist = NodePath.join(root, "dist");
const packageJson = JSON.parse(
  NodeFS.readFileSync(NodePath.join(root, "package.json"), "utf8"),
);
const buildTag = `trail-feedback@${packageJson.version} esbuild-iife`;

NodeFS.mkdirSync(dist, { recursive: true });

const banner = { js: `/* ${buildTag} */` };

const shared = {
  bundle: true,
  platform: "browser",
  target: "chrome120",
  logLevel: "info",
  banner,
};

await esbuild.build({
  ...shared,
  entryPoints: [NodePath.join(root, "src/content.ts")],
  outfile: NodePath.join(dist, "content.js"),
  format: "iife",
});

await esbuild.build({
  ...shared,
  entryPoints: [NodePath.join(root, "src/background.ts")],
  outfile: NodePath.join(dist, "background.js"),
  format: "iife",
});

await esbuild.build({
  ...shared,
  entryPoints: [NodePath.join(root, "src/popup.ts")],
  outfile: NodePath.join(dist, "popup.js"),
  format: "iife",
});

const contentSource = NodeFS.readFileSync(NodePath.join(dist, "content.js"), "utf8");
if (/\bexport\b/.test(contentSource)) {
  throw new Error("content.js must not contain export (use esbuild IIFE only).");
}
if (!contentSource.includes("(() =>")) {
  throw new Error("content.js is not an IIFE bundle — did an old tsc build overwrite dist?");
}

NodeFS.copyFileSync(
  NodePath.join(root, "manifest.json"),
  NodePath.join(dist, "manifest.json"),
);
NodeFS.copyFileSync(
  NodePath.join(root, "src/popup.html"),
  NodePath.join(dist, "popup.html"),
);
NodeFS.copyFileSync(
  NodePath.join(root, "src/content.css"),
  NodePath.join(dist, "content.css"),
);

for (const stale of [
  "api.js",
  "debug.js",
  "localTrail.js",
  "storage.js",
  "types.js",
]) {
  const path = NodePath.join(dist, stale);
  if (NodeFS.existsSync(path)) NodeFS.unlinkSync(path);
}

console.info(`Built ${buildTag} → dist/`);