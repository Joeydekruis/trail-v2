import { describe, expect, it } from "@effect/vitest";
import { ChatAttachmentId, ThreadId, type ChatImageAttachment } from "@t3tools/contracts";
import type { TrailFeedbackSubmitManifest } from "@t3tools/trail-contracts";

import { buildFeedbackTurnPayload, wireAnnotationToPreviewPayload } from "./feedbackMessage.ts";

describe("buildFeedbackTurnPayload", () => {
  it("emits preview-annotation references agents can resolve", () => {
    const manifest: TrailFeedbackSubmitManifest = {
      destination: { mode: "thread", threadId: ThreadId.make("thread-1") },
      annotations: [
        {
          id: "ann-1",
          pageUrl: "http://localhost:5733/",
          pageTitle: "Home",
          comment: "Button misaligned",
          screenshotPart: "shot.png",
        },
      ],
    };
    const pickedAt = "2026-11-24T12:00:00.000Z";
    const annotation = wireAnnotationToPreviewPayload(manifest.annotations[0]!, pickedAt);
    const screenshot: ChatImageAttachment = {
      type: "image",
      id: ChatAttachmentId.make("img-ann-1"),
      name: "shot.png",
      mimeType: "image/png",
      sizeBytes: 1024,
    };
    const payload = buildFeedbackTurnPayload({
      manifest,
      annotations: [annotation],
      screenshotAttachments: new Map([[annotation.id, screenshot]]),
    });
    expect(payload.text).toContain("t3-context://v1/preview-annotation/");
    expect(payload.context.records.some((record) => record.kind === "preview-annotation")).toBe(
      true,
    );
    expect(payload.attachments).toHaveLength(1);
  });
});