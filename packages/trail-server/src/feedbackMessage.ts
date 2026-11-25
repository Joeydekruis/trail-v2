import {
  COMPOSER_CONTEXT_PREVIEW_COMMENT_MAX_CHARS,
  type ChatAttachment,
  type ChatImageAttachment,
  type ImageContextRecord,
  type OrchestrationMessageContext,
  type PreviewAnnotationContextRecord,
  type PreviewAnnotationPayload,
} from "@t3tools/contracts";
import {
  formatComposerContextReference,
  sanitizeComposerContextLabel,
  toKindScopedComposerContextId,
} from "@t3tools/shared/composerContextReferences";
import type { TrailFeedbackAnnotationWire, TrailFeedbackSubmitManifest } from "@t3tools/trail-contracts";

import { normalizeElementContextSelection } from "./elementContext.ts";

const PREVIEW_LABEL_MAX_CHARS = 48;
const TRUNCATION_MARKER = "\n… truncated …";

function clampContextText(value: string, max: number): string {
  if (value.length <= max) return value;
  let end = Math.max(0, max - TRUNCATION_MARKER.length);
  const last = value.charCodeAt(end - 1);
  if (last >= 0xd800 && last <= 0xdbff) end -= 1;
  return `${value.slice(0, end)}${TRUNCATION_MARKER}`;
}

function previewAnnotationContextId(annotationId: string) {
  return toKindScopedComposerContextId("preview-annotation", annotationId);
}

function previewAnnotationContextLabel(annotation: PreviewAnnotationPayload): string {
  const comment = annotation.comment.trim().replace(/\s+/g, " ");
  if (comment) {
    if (comment.length <= PREVIEW_LABEL_MAX_CHARS) return comment;
    let end = PREVIEW_LABEL_MAX_CHARS - 1;
    const previous = comment.charCodeAt(end - 1);
    const next = comment.charCodeAt(end);
    if (previous >= 0xd800 && previous <= 0xdbff && next >= 0xdc00 && next <= 0xdfff) end -= 1;
    return `${comment.slice(0, end)}…`;
  }
  return annotation.pageTitle?.trim() || "Preview annotation";
}

function previewAnnotationTargetSummary(annotation: PreviewAnnotationPayload): string {
  const parts: string[] = [];
  const plural = (count: number, noun: string) => `${count} ${noun}${count === 1 ? "" : "s"}`;
  if (annotation.elements.length > 0)
    parts.push(plural(annotation.elements.length, "selected element"));
  return parts.join(", ");
}

export function previewAnnotationContextRecord(
  annotation: PreviewAnnotationPayload,
  options?: { screenshotContextId?: string | undefined },
): PreviewAnnotationContextRecord {
  const targets = annotation.elements.flatMap((target) => {
    const element = normalizeElementContextSelection(target.element);
    return element
      ? [
          {
            id: target.id,
            element: {
              pageUrl: element.pageUrl,
              pageTitle: element.pageTitle,
              tagName: element.tagName,
              selector: element.selector,
              htmlPreview: element.htmlPreview,
              componentName: element.componentName,
              source: element.source,
              styles: element.styles,
            },
          },
        ]
      : [];
  });
  return {
    version: 1,
    contextId: previewAnnotationContextId(annotation.id),
    kind: "preview-annotation",
    label: sanitizeComposerContextLabel(
      previewAnnotationContextLabel(annotation),
      "preview-annotation",
    ),
    annotationId: annotation.id,
    pageUrl: annotation.pageUrl,
    pageTitle: annotation.pageTitle,
    comment: clampContextText(
      annotation.comment.trim(),
      COMPOSER_CONTEXT_PREVIEW_COMMENT_MAX_CHARS,
    ),
    targetSummary: previewAnnotationTargetSummary(annotation),
    styleChanges: [],
    ...(targets.length > 0
      ? {
          elements: targets.map((target) => target.element),
          elementIds: targets.map((target) => target.id),
        }
      : {}),
    ...(options?.screenshotContextId !== undefined
      ? { screenshotContextId: toKindScopedComposerContextId("image", options.screenshotContextId) }
      : {}),
  };
}

export function wireAnnotationToPreviewPayload(
  wire: TrailFeedbackAnnotationWire,
  pickedAt: string,
): PreviewAnnotationPayload {
  const elementSelection =
    wire.element === undefined ? null : normalizeElementContextSelection(wire.element);
  return {
    id: wire.id,
    pageUrl: wire.pageUrl,
    pageTitle: wire.pageTitle,
    comment: wire.comment,
    elements:
      elementSelection === null
        ? []
        : [
            {
              id: wire.id,
              element: {
                ...elementSelection,
                stack: wire.element?.stack ?? [],
                pickedAt: wire.element?.pickedAt ?? pickedAt,
              },
              rect: { x: 0, y: 0, width: 0, height: 0 },
            },
          ],
    regions: [],
    strokes: [],
    styleChanges: [],
    screenshot: null,
    createdAt: pickedAt,
  };
}

export function imageContextRecord(attachment: ChatImageAttachment): ImageContextRecord {
  return {
    version: 1,
    contextId: toKindScopedComposerContextId("image", attachment.id),
    kind: "image",
    label: sanitizeComposerContextLabel(attachment.name, "image"),
    attachmentId: attachment.id,
    name: attachment.name,
    mimeType: attachment.mimeType,
    sizeBytes: attachment.sizeBytes,
  };
}

export interface TrailFeedbackTurnPayload {
  readonly text: string;
  readonly attachments: ReadonlyArray<ChatAttachment>;
  readonly context: OrchestrationMessageContext;
}

export function buildFeedbackTurnPayload(input: {
  readonly manifest: TrailFeedbackSubmitManifest;
  readonly annotations: ReadonlyArray<PreviewAnnotationPayload>;
  readonly screenshotAttachments: ReadonlyMap<string, ChatImageAttachment>;
}): TrailFeedbackTurnPayload {
  const records = input.annotations.map((annotation) => {
    const screenshot = input.screenshotAttachments.get(annotation.id);
    return previewAnnotationContextRecord(annotation, {
      screenshotContextId: screenshot?.id,
    });
  });
  const imageRecords = [...input.screenshotAttachments.values()].map((attachment) =>
    imageContextRecord(attachment),
  );

  const intro =
    input.manifest.intro?.trim() ||
    `Trail Feedback: ${input.annotations.length} comment${input.annotations.length === 1 ? "" : "s"} on ${input.annotations[0]?.pageUrl ?? "this page"}.`;

  let text = intro;
  for (const record of records) {
    text = `${text} ${formatComposerContextReference({
      kind: "preview-annotation",
      contextId: record.contextId,
      label: record.label,
    })}`;
  }

  return {
    text: text.trim(),
    attachments: [...input.screenshotAttachments.values()],
    context: {
      version: 1,
      records: [...records, ...imageRecords],
    },
  };
}