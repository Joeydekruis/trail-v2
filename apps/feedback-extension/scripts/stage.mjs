import * as NodeFS from "node:fs";
import * as NodePath from "node:path";

const root = NodePath.dirname(import.meta.dirname);
const dist = NodePath.join(root, "dist");

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