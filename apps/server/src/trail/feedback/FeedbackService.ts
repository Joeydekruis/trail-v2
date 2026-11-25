import {
  ChatAttachmentId,
  CommandId,
  MessageId,
  ProjectId,
  ThreadId,
  type IssueListEntry,
  type ChatImageAttachment,
  type PreviewAnnotationPayload,
  type ThreadIssueKey,
} from "@t3tools/contracts";
import {
  TRAIL_FEEDBACK_MAX_ANNOTATIONS,
  TrailFeedbackAccessError,
  type TrailFeedbackContextQuery,
  type TrailFeedbackContextResult,
  type TrailFeedbackDestination,
  type TrailFeedbackSubmitManifest,
  type TrailFeedbackSubmitResult,
} from "@t3tools/trail-contracts";
import {
  buildFeedbackIssueBody,
  buildFeedbackTurnPayload,
  suggestThreadForPreviewPort,
  wireAnnotationToPreviewPayload,
} from "@t3tools/trail-server";
import * as Context from "effect/Context";
import * as SecureRandom from "effect/crypto/SecureRandom";
import * as DateTime from "effect/DateTime";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";

import {
  attachmentFileExtension,
  createAttachmentId,
  resolveAttachmentPath,
} from "../../attachmentStore.ts";
import * as ServerConfig from "../../config.ts";
import {
  classifyGuestUploads,
  type GuestUpload,
  GUEST_UPLOAD_HEADER_BYTES,
  type InspectedGuestUpload,
} from "../../guest/guestAttachments.ts";
import * as IssueService from "../../issue/IssueService.ts";
import * as Orchestrator from "../../orchestration-v2/Orchestrator.ts";
import { ProjectionStoreV2 } from "../../orchestration-v2/ProjectionStore.ts";
import { ProjectStoreV2 } from "../../orchestration-v2/ProjectStore.ts";
import * as ThreadIssueService from "../../orchestration-v2/ThreadIssueService.ts";
import * as ThreadManagement from "../../orchestration-v2/ThreadManagementService.ts";
import * as ThreadMessageIntake from "../../orchestration-v2/ThreadMessageIntake.ts";
import * as DocumentText from "../../provider/DocumentText.ts";
import { resolveFeedbackThreadLaunch } from "./feedbackThreadLaunch.ts";

export interface FeedbackScreenshotUpload {
  readonly annotationId: string;
  readonly upload: GuestUpload;
}

const uploadFailed = new TrailFeedbackAccessError({ reason: "rejected" });

export class FeedbackService extends Context.Service<
  FeedbackService,
  {
    readonly getContext: (
      query: TrailFeedbackContextQuery,
    ) => Effect.Effect<TrailFeedbackContextResult, TrailFeedbackAccessError>;
    readonly submit: (
      manifest: TrailFeedbackSubmitManifest,
      screenshots: ReadonlyArray<FeedbackScreenshotUpload>,
    ) => Effect.Effect<TrailFeedbackSubmitResult, TrailFeedbackAccessError>;
  }
>()("t3/trail/feedback/FeedbackService") {}

const make = Effect.gen(function* () {
  const orchestrator = yield* Orchestrator.OrchestratorV2;
  const projections = yield* ProjectionStoreV2;
  const projectStore = yield* ProjectStoreV2;
  const threadManagement = yield* ThreadManagement.ThreadManagementService;
  const fileSystem = yield* FileSystem.FileSystem;
  const config = yield* ServerConfig.ServerConfig;
  const documents = yield* DocumentText.DocumentText;
  const random = yield* SecureRandom.SecureRandom;

  const commandId = Effect.fnUntraced(function* (label: string) {
    return CommandId.make(`server:trail-feedback:${label}:${yield* random.uuidV4()}`);
  });

  const inspectUpload = (upload: GuestUpload) =>
    Effect.gen(function* () {
      const info = yield* fileSystem.stat(upload.path);
      const file = yield* fileSystem.open(upload.path, { flag: "r" });
      const header = yield* file.readAlloc(GUEST_UPLOAD_HEADER_BYTES).pipe(
        Effect.map((chunk) => (chunk._tag === "Some" ? chunk.value : new Uint8Array())),
      );
      return {
        ...upload,
        sizeBytes: Number(info.size),
        header,
      } satisfies InspectedGuestUpload;
    }).pipe(Effect.scoped, Effect.mapError(() => uploadFailed));

  const storeScreenshots = Effect.fn("FeedbackService.storeScreenshots")(function* (
    threadId: ThreadId,
    screenshots: ReadonlyArray<FeedbackScreenshotUpload>,
  ) {
    if (screenshots.length > TRAIL_FEEDBACK_MAX_ANNOTATIONS) {
      return yield* new TrailFeedbackAccessError({ reason: "too_many_files" });
    }
    const inspected = yield* Effect.forEach(screenshots, ({ upload }) => inspectUpload(upload));
    const classified = classifyGuestUploads(inspected);
    if (!classified.ok) {
      return yield* new TrailFeedbackAccessError({ reason: classified.reason });
    }
    const byAnnotationId = new Map<string, ChatImageAttachment>();
    yield* Effect.forEach(
      classified.attachments,
      (draft, index) =>
        Effect.gen(function* () {
          const screenshot = screenshots[index]!;
          const id = createAttachmentId(
            threadId,
            draft.type === "file" ? attachmentFileExtension(draft.name) : undefined,
          );
          if (id === null) return yield* uploadFailed;
          const attachment: ChatImageAttachment = {
            type: "image",
            id: ChatAttachmentId.make(id),
            name: draft.name,
            mimeType: draft.mimeType,
            sizeBytes: draft.sizeBytes,
          };
          const path = resolveAttachmentPath({ attachmentsDir: config.attachmentsDir, attachment });
          if (path === null) return yield* uploadFailed;
          yield* fileSystem.makeDirectory(config.attachmentsDir, { recursive: true });
          yield* fileSystem.copyFile(screenshot.upload.path, path);
          byAnnotationId.set(screenshot.annotationId, attachment);
          yield* documents.ensure(path);
        }),
      { discard: true },
    ).pipe(Effect.mapError(() => uploadFailed));
    return byAnnotationId;
  });

  const ensureThreadExists = (threadId: ThreadId) =>
    projections.getThreadProjection(threadId).pipe(
      Effect.asVoid,
      Effect.catchTag("ProjectionStoreThreadNotFoundError", () =>
        Effect.fail(new TrailFeedbackAccessError({ reason: "thread_not_found" })),
      ),
      Effect.mapError(() => new TrailFeedbackAccessError({ reason: "rejected" })),
    );

  const buildTurn = (manifest: TrailFeedbackSubmitManifest, pickedAt: string, screenshots: Map<string, ChatImageAttachment>) => {
    const annotations = manifest.annotations.map((wire) => wireAnnotationToPreviewPayload(wire, pickedAt));
    return buildFeedbackTurnPayload({ manifest, annotations, screenshotAttachments: screenshots });
  };

  const dispatchTurn = Effect.fn("FeedbackService.dispatchTurn")(function* (input: {
    readonly threadId: ThreadId;
    readonly manifest: TrailFeedbackSubmitManifest;
    readonly screenshots: ReadonlyArray<FeedbackScreenshotUpload>;
  }) {
    const screenshotAttachments = yield* storeScreenshots(input.threadId, input.screenshots);
    const pickedAt = DateTime.formatIso(yield* DateTime.now);
    const turn = buildTurn(input.manifest, pickedAt, screenshotAttachments);
    const dispatchCommandId = yield* commandId("submit");
    const messageId = MessageId.make(yield* random.uuidV4());
    yield* orchestrator
      .dispatch({
        type: "message.dispatch",
        commandId: dispatchCommandId,
        threadId: input.threadId,
        messageId,
        text: turn.text,
        attachments: [...turn.attachments],
        context: turn.context,
        dispatchMode: { type: "queue_after_active" },
        createdBy: "user",
        creationSource: "server",
      })
      .pipe(
        Effect.mapError(
          () => new TrailFeedbackAccessError({ reason: "rejected", message: "Dispatch failed." }),
        ),
      );
    return messageId;
  });

  const launchThreadWithFeedback = Effect.fn("FeedbackService.launchThreadWithFeedback")(function* (
    input: {
      readonly projectId: ProjectId;
      readonly title: string;
      readonly manifest: TrailFeedbackSubmitManifest;
      readonly screenshots: ReadonlyArray<FeedbackScreenshotUpload>;
    },
  ) {
    const launchDefaults = yield* resolveFeedbackThreadLaunch(input.projectId);
    const launchCommandId = yield* commandId("launch");
    const launched = yield* ThreadMessageIntake.launchThread({
      commandId: launchCommandId,
      projectId: input.projectId,
      title: input.title,
      titleRenamed: true,
      generateTitle: false,
      modelSelection: launchDefaults.modelSelection,
      runtimeMode: launchDefaults.runtimeMode,
      interactionMode: launchDefaults.interactionMode,
      workspaceStrategy: launchDefaults.workspaceStrategy,
      createdBy: "user",
      creationSource: "server",
    }).pipe(Effect.mapError(() => new TrailFeedbackAccessError({ reason: "rejected" })));

    const messageId = yield* dispatchTurn({
      threadId: launched.threadId,
      manifest: input.manifest,
      screenshots: input.screenshots,
    });
    return { threadId: launched.threadId, messageId, createdThread: true as const };
  });

  const continueOnIssue = Effect.fn("FeedbackService.continueOnIssue")(function* (input: {
    readonly issueKey: ThreadIssueKey;
    readonly projectId: ProjectId;
    readonly threadTitle: string;
    readonly manifest: TrailFeedbackSubmitManifest;
    readonly screenshots: ReadonlyArray<FeedbackScreenshotUpload>;
    readonly linkAfterCreate?: {
      readonly title: string;
      readonly issue: NonNullable<TrailFeedbackSubmitResult["issue"]>;
    };
  }) {
    const threadIssues = yield* ThreadIssueService.ThreadIssueService;
    const linked = yield* threadIssues.linkedThreads(input.issueKey).pipe(
      Effect.mapError(() => new TrailFeedbackAccessError({ reason: "issue_unavailable" })),
    );
    const existing = linked.threads.find((thread) => !thread.settled && thread.archivedAt === null);
    if (existing !== undefined) {
      yield* ensureThreadExists(existing.id);
      const messageId = yield* dispatchTurn({
        threadId: existing.id,
        manifest: input.manifest,
        screenshots: input.screenshots,
      });
      return {
        threadId: existing.id,
        messageId,
        createdThread: false,
        ...(input.linkAfterCreate === undefined ? {} : { issue: input.linkAfterCreate.issue }),
      };
    }

    const launched = yield* launchThreadWithFeedback({
      projectId: input.projectId,
      title: input.threadTitle,
      manifest: input.manifest,
      screenshots: input.screenshots,
    });

    if (input.linkAfterCreate !== undefined) {
      yield* threadIssues
        .link({
          threadId: launched.threadId,
          ref: {
            projectId: input.projectId,
            tracker: input.issueKey.tracker,
            host: input.issueKey.host,
            scope: input.issueKey.scope,
            key: input.issueKey.key,
          },
          url: input.linkAfterCreate.issue.url,
          displayKey: input.linkAfterCreate.issue.displayKey,
          title: input.linkAfterCreate.title,
          source: "manual",
        })
        .pipe(Effect.mapError(() => new TrailFeedbackAccessError({ reason: "rejected" })));
    }

    return {
      threadId: launched.threadId,
      messageId: launched.messageId,
      createdThread: true,
      ...(input.linkAfterCreate === undefined ? {} : { issue: input.linkAfterCreate.issue }),
    };
  });

  const submitToDestination = Effect.fn("FeedbackService.submitToDestination")(function* (
    manifest: TrailFeedbackSubmitManifest,
    screenshots: ReadonlyArray<FeedbackScreenshotUpload>,
  ) {
    const destination = manifest.destination;
    switch (destination.mode) {
      case "thread": {
        yield* ensureThreadExists(destination.threadId);
        const messageId = yield* dispatchTurn({
          threadId: destination.threadId,
          manifest,
          screenshots,
        });
        return { threadId: destination.threadId, messageId };
      }
      case "new_thread": {
        const title =
          destination.title?.trim() ||
          `Feedback: ${manifest.annotations[0]?.pageTitle?.trim() || manifest.annotations[0]?.pageUrl || "preview"}`;
        const launched = yield* launchThreadWithFeedback({
          projectId: destination.projectId,
          title,
          manifest,
          screenshots,
        });
        return {
          threadId: launched.threadId,
          messageId: launched.messageId,
          createdThread: true,
        };
      }
      case "new_issue": {
        if (destination.startThread === false) {
          return yield* new TrailFeedbackAccessError({
            reason: "rejected",
            message: "A thread is required to carry preview attachments.",
          });
        }
        const issues = yield* IssueService.IssueService;
        const scope = yield* issues.projectScope(destination.projectId).pipe(
          Effect.mapError(() => new TrailFeedbackAccessError({ reason: "issue_unavailable" })),
        );
        const issueBody = buildFeedbackIssueBody({
          annotations: manifest.annotations,
          intro: manifest.intro,
        });
        const created = yield* issues
          .create({
            ...scope,
            title: destination.title,
            body: issueBody,
            labels: destination.labels ?? [],
            assignees: [],
          })
          .pipe(Effect.mapError(() => new TrailFeedbackAccessError({ reason: "issue_unavailable" })));
        const trailIssue = {
          key: created.key,
          displayKey: created.displayKey,
          url: created.url,
        };
        if (scope.host === undefined || scope.host.trim() === "") {
          return yield* new TrailFeedbackAccessError({ reason: "issue_unavailable" });
        }
        const issueKey: ThreadIssueKey = {
          tracker: scope.tracker,
          host: scope.host,
          scope: scope.scope,
          key: created.key,
        };
        return yield* continueOnIssue({
          issueKey,
          projectId: destination.projectId,
          threadTitle: destination.title,
          manifest,
          screenshots,
          linkAfterCreate: { title: destination.title, issue: trailIssue },
        });
      }
      case "issue": {
        const host = destination.host?.trim() ?? "";
        if (host.length === 0) {
          return yield* new TrailFeedbackAccessError({ reason: "issue_unavailable" });
        }
        const issueKey: ThreadIssueKey = {
          tracker: destination.tracker,
          host,
          scope: destination.scope,
          key: destination.key,
        };
        return yield* continueOnIssue({
          issueKey,
          projectId: destination.projectId,
          threadTitle: `Feedback on ${destination.key}`,
          manifest,
          screenshots,
        });
      }
    }
  });

  const getContext = (query: TrailFeedbackContextQuery) =>
    Effect.gen(function* () {
      const projects = yield* projectStore
        .listShells(
          query.projectId === undefined ? undefined : { projectIds: [query.projectId] },
        )
        .pipe(Effect.mapError(() => new TrailFeedbackAccessError({ reason: "rejected" })));
      const snapshot = yield* (yield* threadManagement
        .readShellSnapshot({ location: "active" })
        .pipe(Effect.mapError(() => new TrailFeedbackAccessError({ reason: "rejected" }))));
      const activeThreads = snapshot.threads.filter(
        (thread) => thread.deletedAt === null && thread.archivedAt === null,
      );
      const threads =
        query.projectId === undefined
          ? activeThreads
          : activeThreads.filter((thread) => thread.projectId === query.projectId);

      let suggestedThreadId = null;
      let suggestedProjectId = null;
      if (query.pageUrl !== undefined) {
        const suggestion = suggestThreadForPreviewPort({
          pageUrl: query.pageUrl,
          projects,
          threads,
        });
        if (suggestion !== null) {
          suggestedThreadId = suggestion.threadId;
          suggestedProjectId = suggestion.projectId;
        }
      }

      let issueEntries: IssueListEntry[] = [];
      if (query.projectId !== undefined) {
        const listed = yield* Effect.gen(function* () {
          const issueService = yield* IssueService.IssueService;
          return yield* issueService.list({
            state: "open",
            projectId: query.projectId,
            limit: 40,
          });
        }).pipe(Effect.orElseSucceed(() => ({ entries: [] })));
        issueEntries = listed.entries;
      }

      return {
        projects: projects.map((project) => ({ id: project.id, title: project.title })),
        threads: threads.slice(0, 120).map((thread) => ({
          id: thread.id,
          projectId: thread.projectId,
          title: thread.title,
          status: thread.status,
        })),
        issues: issueEntries.map((entry) => ({
          projectId: entry.projectId,
          tracker: entry.tracker,
          host: entry.host,
          scope: entry.scope,
          key: entry.key,
          displayKey: entry.displayKey,
          title: entry.title,
        })),
        suggestedThreadId,
        suggestedProjectId,
      };
    });

  const submit = (
    manifest: TrailFeedbackSubmitManifest,
    screenshots: ReadonlyArray<FeedbackScreenshotUpload>,
  ) =>
    Effect.gen(function* () {
      const hasContent = manifest.annotations.some((annotation) => annotation.comment.trim() !== "");
      if (!hasContent) {
        return yield* new TrailFeedbackAccessError({ reason: "empty" });
      }
      return yield* submitToDestination(manifest, screenshots);
    }).pipe(
      Effect.mapError((cause) =>
        cause._tag === "TrailFeedbackAccessError" ? cause : uploadFailed,
      ),
    );

  return FeedbackService.of({ getContext, submit });
});

export const layer = Layer.effect(FeedbackService, make);