import { T } from "gt-react";

const DESIGN_PREVIEW_CSP =
  "default-src 'none'; img-src data: https: blob:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; base-uri 'none'; form-action 'none'";

export function TrailDesignPreview({
  title,
  html,
}: {
  readonly title: string;
  readonly html: string;
}) {
  const srcDoc = html.includes("<head")
    ? html.replace(
        /<head([^>]*)>/i,
        `<head$1><meta http-equiv="Content-Security-Policy" content="${DESIGN_PREVIEW_CSP}">`,
      )
    : `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${DESIGN_PREVIEW_CSP}"></head><body>${html}</body></html>`;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <p className="truncate text-sm font-medium">{title}</p>
      <iframe
        title={title}
        srcDoc={srcDoc}
        sandbox="allow-scripts"
        className="min-h-[min(70vh,640px)] flex-1 rounded-md border border-[color:var(--trail-border)] bg-background"
      />
      <p className="text-2xs text-muted-foreground">
        <T context="Trail design preview">Sandboxed preview — designs are untrusted HTML.</T>
      </p>
    </div>
  );
}