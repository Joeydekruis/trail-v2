import * as Schema from "effect/Schema";

import {
  IssueTrackerKind,
  PickedElementPayloadSchema,
  MessageId,
  ProjectId,
  ThreadId,
  TrimmedNonEmptyString,
  TrimmedString,
} from "@t3tools/contracts";

export const TRAIL_FEEDBACK_ROUTE_PREFIX = "/api/trail/feedback";

export const TRAIL_FEEDBACK_MAX_ANNOTATIONS = 20;
export const TRAIL_FEEDBACK_MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024;
export const TRAIL_FEEDBACK_MAX_INTRO_CHARS = 8_000;

export const TrailFeedbackThreadDestination = Schema.Struct({
  mode: Schema.Literal("thread"),
  threadId: ThreadId,
});
export type TrailFeedbackThreadDestination = typeof TrailFeedbackThreadDestination.Type;

export const TrailFeedbackNewThreadDestination = Schema.Struct({
  mode: Schema.Literal("new_thread"),
  projectId: ProjectId,
  title: Schema.optional(TrimmedNonEmptyString.check(Schema.isMaxLength(200))),
});
export type TrailFeedbackNewThreadDestination = typeof TrailFeedbackNewThreadDestination.Type;

export const TrailFeedbackNewIssueDestination = Schema.Struct({
  mode: Schema.Literal("new_issue"),
  projectId: ProjectId,
  title: TrimmedNonEmptyString.check(Schema.isMaxLength(1024)),
  labels: Schema.optional(
    Schema.Array(TrimmedNonEmptyString.check(Schema.isMaxLength(200))).check(Schema.isMaxLength(20)),
  ),
  /** When false, only the tracker issue is created; the default is to start a linked thread. */
  startThread: Schema.optional(Schema.Boolean),
});
export type TrailFeedbackNewIssueDestination = typeof TrailFeedbackNewIssueDestination.Type;

export const TrailFeedbackIssueDestination = Schema.Struct({
  mode: Schema.Literal("issue"),
  projectId: ProjectId,
  tracker: IssueTrackerKind,
  host: Schema.optional(TrimmedNonEmptyString),
  scope: TrimmedNonEmptyString,
  key: TrimmedNonEmptyString,
});
export type TrailFeedbackIssueDestination = typeof TrailFeedbackIssueDestination.Type;

export const TrailFeedbackDestination = Schema.Union([
  TrailFeedbackThreadDestination,
  TrailFeedbackNewThreadDestination,
  TrailFeedbackNewIssueDestination,
  TrailFeedbackIssueDestination,
]);
export type TrailFeedbackDestination = typeof TrailFeedbackDestination.Type;

export const TrailFeedbackAnnotationWire = Schema.Struct({
  id: TrimmedNonEmptyString.check(Schema.isMaxLength(128)),
  pageUrl: TrimmedNonEmptyString.check(Schema.isMaxLength(2048)),
  pageTitle: Schema.NullOr(TrimmedString.check(Schema.isMaxLength(512))),
  comment: TrimmedString.check(Schema.isMaxLength(8_000)),
  element: Schema.optionalKey(PickedElementPayloadSchema),
  /** Names the matching multipart `file` part for this annotation's cropped screenshot. */
  screenshotPart: Schema.optionalKey(TrimmedNonEmptyString.check(Schema.isMaxLength(255))),
});
export type TrailFeedbackAnnotationWire = typeof TrailFeedbackAnnotationWire.Type;

export const TrailFeedbackSubmitManifest = Schema.Struct({
  destination: TrailFeedbackDestination,
  annotations: Schema.Array(TrailFeedbackAnnotationWire).check(
    Schema.isMinLength(1),
    Schema.isMaxLength(TRAIL_FEEDBACK_MAX_ANNOTATIONS),
  ),
  intro: Schema.optionalKey(
    TrimmedString.check(Schema.isMaxLength(TRAIL_FEEDBACK_MAX_INTRO_CHARS)),
  ),
});
export type TrailFeedbackSubmitManifest = typeof TrailFeedbackSubmitManifest.Type;

export const TrailFeedbackCreatedIssue = Schema.Struct({
  key: TrimmedNonEmptyString,
  displayKey: TrimmedNonEmptyString,
  url: TrimmedNonEmptyString,
});
export type TrailFeedbackCreatedIssue = typeof TrailFeedbackCreatedIssue.Type;

export const TrailFeedbackSubmitResult = Schema.Struct({
  threadId: ThreadId,
  messageId: MessageId,
  createdThread: Schema.optional(Schema.Boolean),
  issue: Schema.optional(TrailFeedbackCreatedIssue),
});
export type TrailFeedbackSubmitResult = typeof TrailFeedbackSubmitResult.Type;

export const TrailFeedbackContextQuery = Schema.Struct({
  pageUrl: Schema.optional(TrimmedNonEmptyString.check(Schema.isMaxLength(2048))),
  projectId: Schema.optional(ProjectId),
});
export type TrailFeedbackContextQuery = typeof TrailFeedbackContextQuery.Type;

export const TrailFeedbackContextProject = Schema.Struct({
  id: ProjectId,
  title: TrimmedNonEmptyString,
});
export type TrailFeedbackContextProject = typeof TrailFeedbackContextProject.Type;

export const TrailFeedbackContextThread = Schema.Struct({
  id: ThreadId,
  projectId: ProjectId,
  title: TrimmedString.check(Schema.isMaxLength(512)),
  status: Schema.optional(TrimmedString),
});
export type TrailFeedbackContextThread = typeof TrailFeedbackContextThread.Type;

export const TrailFeedbackContextIssue = Schema.Struct({
  projectId: ProjectId,
  tracker: IssueTrackerKind,
  host: TrimmedNonEmptyString,
  scope: TrimmedNonEmptyString,
  key: TrimmedNonEmptyString,
  displayKey: TrimmedNonEmptyString,
  title: TrimmedNonEmptyString,
});
export type TrailFeedbackContextIssue = typeof TrailFeedbackContextIssue.Type;

export const TrailFeedbackContextResult = Schema.Struct({
  projects: Schema.Array(TrailFeedbackContextProject),
  threads: Schema.Array(TrailFeedbackContextThread),
  issues: Schema.Array(TrailFeedbackContextIssue),
  suggestedThreadId: Schema.NullOr(ThreadId),
  suggestedProjectId: Schema.NullOr(ProjectId),
});
export type TrailFeedbackContextResult = typeof TrailFeedbackContextResult.Type;

/** Loopback-only dev helper for the Trail Feedback Chrome extension. */
export const TrailFeedbackLocalBootstrapResult = Schema.Struct({
  serverUrl: TrimmedNonEmptyString.check(Schema.isMaxLength(2048)),
  accessToken: TrimmedNonEmptyString.check(Schema.isMaxLength(4096)),
});
export type TrailFeedbackLocalBootstrapResult = typeof TrailFeedbackLocalBootstrapResult.Type;

export const TRAIL_FEEDBACK_FAILURE_REASONS = [
  "invalid",
  "unauthorized",
  "too_many_files",
  "too_large",
  "unsupported_file",
  "rejected",
  "thread_not_found",
  "project_not_found",
  "issue_unavailable",
  "no_model",
  "empty",
] as const;

export class TrailFeedbackAccessError extends Schema.TaggedError<TrailFeedbackAccessError>()(
  "TrailFeedbackAccessError",
  {
    reason: Schema.Literals(TRAIL_FEEDBACK_FAILURE_REASONS),
    message: Schema.optional(Schema.String),
  },
) {
  override get message(): string {
    switch (this.reason) {
      case "invalid":
        return "The feedback request was not valid.";
      case "unauthorized":
        return "Pair with Trail before sending feedback.";
      case "too_many_files":
        return "Too many screenshot attachments.";
      case "too_large":
        return "A screenshot exceeds the size limit.";
      case "unsupported_file":
        return "Only PNG, JPEG, GIF, or WebP screenshots are supported.";
      case "rejected":
        return "The feedback request was rejected.";
      case "thread_not_found":
        return "That thread was not found.";
      case "project_not_found":
        return "That project was not found.";
      case "issue_unavailable":
        return "This project cannot file issues right now.";
      case "no_model":
        return "Choose a default model for this project before starting a thread.";
      case "empty":
        return "Add at least one comment.";
      default:
        return "Could not send feedback.";
    }
  }
}