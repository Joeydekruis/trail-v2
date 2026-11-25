import { AuthOrchestrationOperateScope, AuthOrchestrationReadScope, AuthStandardClientScopes } from "@t3tools/contracts";
import * as EnvironmentAuth from "../../auth/EnvironmentAuth.ts";
import {
  failEnvironmentAuthInvalid,
  failEnvironmentInternal,
  failEnvironmentScopeRequired,
} from "../../auth/http.ts";
import {
  TRAIL_FEEDBACK_MAX_ANNOTATIONS,
  TRAIL_FEEDBACK_MAX_SCREENSHOT_BYTES,
  TRAIL_FEEDBACK_ROUTE_PREFIX,
  TrailFeedbackAccessError,
  TrailFeedbackContextQuery,
  TrailFeedbackContextResult,
  TrailFeedbackLocalBootstrapResult,
  TrailFeedbackSubmitManifest,
  TrailFeedbackSubmitResult,
} from "@t3tools/trail-contracts";
import * as Effect from "effect/Effect";
import * as Duration from "effect/Duration";
import * as Layer from "effect/Layer";
import * as Schema from "effect/Schema";
import { HttpRouter, HttpServerRequest, HttpServerResponse, Multipart } from "effect/http";
import { isLoopbackHost } from "../../startupAccess.ts";
import type { FeedbackScreenshotUpload } from "./FeedbackService.ts";
import { FeedbackService } from "./FeedbackService.ts";

const NO_STORE = { "cache-control": "no-store" };
const MANIFEST_MAX_BYTES = 256 * 1024;

const decodeManifest = Schema.decodeUnknownEffect(
  Schema.fromJsonString(TrailFeedbackSubmitManifest),
);
const decodeContextQuery = Schema.decodeUnknownEffect(TrailFeedbackContextQuery);
const encodeResult = Schema.encodeEffect(Schema.toCodecJson(TrailFeedbackSubmitResult));
const encodeContext = Schema.encodeEffect(Schema.toCodecJson(TrailFeedbackContextResult));
const encodeBootstrap = Schema.encodeEffect(Schema.toCodecJson(TrailFeedbackLocalBootstrapResult));

const errorResponse = (error: TrailFeedbackAccessError) =>
  HttpServerResponse.json(
    { reason: error.reason, message: error.message },
    {
      status:
        error.reason === "unauthorized"
          ? 401
          : error.reason === "thread_not_found" || error.reason === "project_not_found"
            ? 404
            : error.reason === "empty" ||
                error.reason === "too_many_files" ||
                error.reason === "too_large" ||
                error.reason === "unsupported_file" ||
                error.reason === "invalid" ||
                error.reason === "no_model" ||
                error.reason === "issue_unavailable"
              ? 400
              : 409,
      headers: NO_STORE,
    },
  );

const badRequest = HttpServerResponse.json(
  { reason: "invalid", message: "The request was not valid." },
  { status: 400, headers: NO_STORE },
);

const UPLOAD_LIMITS = Multipart.limitsServices({
  maxParts: TRAIL_FEEDBACK_MAX_ANNOTATIONS + 4,
  maxFileSize: TRAIL_FEEDBACK_MAX_SCREENSHOT_BYTES,
  maxTotalSize: TRAIL_FEEDBACK_MAX_SCREENSHOT_BYTES * TRAIL_FEEDBACK_MAX_ANNOTATIONS + MANIFEST_MAX_BYTES,
  fieldMimeTypes: ["application/json", "text/plain"],
});

const readSubmission = Effect.gen(function* () {
  const request = yield* HttpServerRequest.HttpServerRequest;
  if (!request.headers["content-type"]?.startsWith("multipart/form-data")) {
    return null;
  }
  const parts = yield* request.multipart.pipe(
    Effect.provideContext(UPLOAD_LIMITS),
    Effect.mapError(
      (error) =>
        new TrailFeedbackAccessError({
          reason:
            error.reason._tag === "TooManyParts"
              ? "too_many_files"
              : error.reason._tag === "Parse"
                ? "rejected"
                : "too_large",
        }),
    ),
  );
  const manifestRaw = parts.manifest;
  if (typeof manifestRaw !== "string") return null;
  const manifest = yield* decodeManifest(manifestRaw).pipe(Effect.option);
  if (manifest._tag === "None") return null;

  const fileEntries = parts.file;
  const files = Array.isArray(fileEntries)
    ? fileEntries.filter(Multipart.isPersistedFile)
    : fileEntries && Multipart.isPersistedFile(fileEntries)
      ? [fileEntries]
      : [];

  const uploadsByPartName = new Map(
    files.map((file) => [
      file.name,
      { name: file.name, contentType: file.contentType, path: file.path },
    ]),
  );

  const screenshots: FeedbackScreenshotUpload[] = [];
  for (const annotation of manifest.value.annotations) {
    if (annotation.screenshotPart === undefined) continue;
    const upload = uploadsByPartName.get(annotation.screenshotPart);
    if (upload) {
      screenshots.push({ annotationId: annotation.id, upload });
    }
  }

  return { manifest: manifest.value, screenshots };
});

const authenticate = (scope: typeof AuthOrchestrationOperateScope | typeof AuthOrchestrationReadScope) =>
  Effect.gen(function* () {
    const request = yield* HttpServerRequest.HttpServerRequest;
    const serverAuth = yield* EnvironmentAuth.EnvironmentAuth;
    const session = yield* serverAuth.authenticateHttpRequest(request).pipe(
      Effect.catchIf(EnvironmentAuth.isServerAuthCredentialError, (error) =>
        failEnvironmentAuthInvalid(
          EnvironmentAuth.serverAuthCredentialReason(error),
          EnvironmentAuth.serverAuthDpopFailureReason(error),
        ),
      ),
      Effect.catchIf(EnvironmentAuth.isServerAuthInternalError, (error) =>
        failEnvironmentInternal("internal_error", error),
      ),
    );
    const allowed =
      scope === AuthOrchestrationReadScope
        ? session.scopes.includes(AuthOrchestrationReadScope) ||
          session.scopes.includes(AuthOrchestrationOperateScope)
        : session.scopes.includes(AuthOrchestrationOperateScope);
    if (!allowed) return yield* failEnvironmentScopeRequired(scope);
  });

const parseContextQuery = Effect.gen(function* () {
  const request = yield* HttpServerRequest.HttpServerRequest;
  const url = new URL(request.url, "http://trail.local");
  const query = {
    ...(url.searchParams.get("pageUrl") ? { pageUrl: url.searchParams.get("pageUrl") } : {}),
    ...(url.searchParams.get("projectId") ? { projectId: url.searchParams.get("projectId") } : {}),
  };
  return yield* decodeContextQuery(query);
});

const contextHandler = Effect.gen(function* () {
  yield* authenticate(AuthOrchestrationReadScope);
  const query = yield* parseContextQuery.pipe(
    Effect.mapError(() => new TrailFeedbackAccessError({ reason: "invalid" })),
  );
  const feedback = yield* FeedbackService;
  const result = yield* feedback.getContext(query);
  const body = yield* encodeContext(result);
  return HttpServerResponse.jsonUnsafe(body, { status: 200, headers: NO_STORE });
}).pipe(Effect.catchTags({ TrailFeedbackAccessError: errorResponse }));

const submitHandler = Effect.gen(function* () {
  yield* authenticate(AuthOrchestrationOperateScope);
  const submission = yield* readSubmission;
  if (submission === null) return yield* badRequest;
  const feedback = yield* FeedbackService;
  const result = yield* feedback.submit(submission.manifest, submission.screenshots);
  const body = yield* encodeResult(result);
  return HttpServerResponse.jsonUnsafe(body, { status: 202, headers: NO_STORE });
}).pipe(
  Effect.catchTags({ TrailFeedbackAccessError: errorResponse }),
  Effect.scoped,
);

const loopbackRequestHostname = (request: HttpServerRequest.HttpServerRequest) => {
  const url = new URL(request.url, "http://trail.local");
  const fromHost = request.headers.host?.split(":")[0];
  return fromHost ?? url.hostname;
};

const loopbackServerUrl = (request: HttpServerRequest.HttpServerRequest) => {
  const host = request.headers.host?.trim();
  if (host && host.length > 0) {
    return `http://${host}`;
  }
  const url = new URL(request.url, "http://trail.local");
  const port = url.port.length > 0 ? `:${url.port}` : "";
  return `http://${url.hostname}${port}`;
};

const localBootstrapHandler = Effect.gen(function* () {
  const request = yield* HttpServerRequest.HttpServerRequest;
  if (!isLoopbackHost(loopbackRequestHostname(request))) {
    return HttpServerResponse.json(
      { reason: "rejected", message: "Loopback only." },
      { status: 403, headers: NO_STORE },
    );
  }
  const serverAuth = yield* EnvironmentAuth.EnvironmentAuth;
  const issued = yield* serverAuth
    .issueSession({
      scopes: [...AuthStandardClientScopes],
      subject: "trail-feedback-extension",
      label: "Trail Feedback (Chrome)",
      ttl: Duration.days(90),
    })
    .pipe(
      Effect.catchIf(EnvironmentAuth.isServerAuthInternalError, (error) =>
        failEnvironmentInternal("internal_error", error),
      ),
    );
  const body = yield* encodeBootstrap({
    serverUrl: loopbackServerUrl(request),
    accessToken: issued.token,
  });
  return HttpServerResponse.jsonUnsafe(body, { status: 200, headers: NO_STORE });
});

const contextRoute = HttpRouter.add(
  "GET",
  `${TRAIL_FEEDBACK_ROUTE_PREFIX}/context`,
  contextHandler,
);
const submitRoute = HttpRouter.add("POST", `${TRAIL_FEEDBACK_ROUTE_PREFIX}/submit`, submitHandler);
const localBootstrapRoute = HttpRouter.add(
  "GET",
  `${TRAIL_FEEDBACK_ROUTE_PREFIX}/local-bootstrap`,
  localBootstrapHandler,
);

export const layer = Layer.mergeAll(contextRoute, submitRoute, localBootstrapRoute);