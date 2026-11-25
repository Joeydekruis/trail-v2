import { AuthOrchestrationReadScope, AuthOrchestrationOperateScope } from "@t3tools/contracts";
import * as EnvironmentAuth from "../../auth/EnvironmentAuth.ts";
import {
  failEnvironmentAuthInvalid,
  failEnvironmentInternal,
  failEnvironmentScopeRequired,
} from "../../auth/http.ts";
import {
  DesignFailure,
  DesignForIssueQuery,
  DesignForIssueResult,
  DesignGetQuery,
  DesignGetResult,
  DesignListQuery,
  DesignListResult,
  TRAIL_DESIGN_ROUTE_PREFIX,
} from "@t3tools/trail-contracts";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Schema from "effect/Schema";
import { HttpRouter, HttpServerRequest, HttpServerResponse } from "effect/http";

import * as DesignService from "./DesignService.ts";

const NO_STORE = { "cache-control": "no-store" };

const decodeListQuery = Schema.decodeUnknownEffect(DesignListQuery);
const decodeGetQuery = Schema.decodeUnknownEffect(DesignGetQuery);
const decodeForIssueQuery = Schema.decodeUnknownEffect(DesignForIssueQuery);
const encodeList = Schema.encodeEffect(Schema.toCodecJson(DesignListResult));
const encodeGet = Schema.encodeEffect(Schema.toCodecJson(DesignGetResult));
const encodeForIssue = Schema.encodeEffect(Schema.toCodecJson(DesignForIssueResult));

const designFailureResponse = (error: DesignFailure) =>
  HttpServerResponse.json(
    { code: error.code, message: error.message },
    {
      status:
        error.code === "project_not_found" || error.code === "not_found"
          ? 404
          : error.code === "invalid_request" || error.code === "validation_failed"
            ? 400
            : 500,
      headers: NO_STORE,
    },
  );

const authenticate = (scope: typeof AuthOrchestrationReadScope | typeof AuthOrchestrationOperateScope) =>
  Effect.gen(function* () {
    const auth = yield* EnvironmentAuth.EnvironmentAuth;
    const session = yield* auth
      .resolveCredentials(yield* HttpServerRequest.HttpServerRequest)
      .pipe(
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

const readQuery = (required: ReadonlyArray<string>) =>
  Effect.gen(function* () {
    const request = yield* HttpServerRequest.HttpServerRequest;
    const url = new URL(request.url, "http://trail.local");
    const record: Record<string, string> = {};
    for (const key of required) {
      const value = url.searchParams.get(key);
      if (value === null || value.length === 0) {
        return yield* Effect.fail(
          new DesignFailure({
            code: "invalid_request",
            message: `${key} is required.`,
          }),
        );
      }
      record[key] = value;
    }
    const version = url.searchParams.get("version");
    if (version !== null && version.length > 0) record.version = version;
    return record;
  });

const listHandler = Effect.gen(function* () {
  yield* authenticate(AuthOrchestrationReadScope);
  const raw = yield* readQuery(["projectId"]);
  const query = yield* decodeListQuery(raw).pipe(
    Effect.mapError(
      () =>
        new DesignFailure({
          code: "invalid_request",
          message: "projectId is not valid.",
        }),
    ),
  );
  const design = yield* DesignService.DesignService;
  const result = yield* design.list(query.projectId);
  const body = yield* encodeList(result);
  return HttpServerResponse.jsonUnsafe(body, { status: 200, headers: NO_STORE });
}).pipe(Effect.catchTags({ DesignFailure: designFailureResponse }));

const pageHandler = Effect.gen(function* () {
  yield* authenticate(AuthOrchestrationReadScope);
  const raw = yield* readQuery(["projectId", "folder", "page"]);
  const query = yield* decodeGetQuery(raw).pipe(
    Effect.mapError(
      () =>
        new DesignFailure({
          code: "invalid_request",
          message: "Query parameters are not valid.",
        }),
    ),
  );
  const design = yield* DesignService.DesignService;
  const result = yield* design.get({
    projectId: query.projectId,
    folder: query.folder,
    page: query.page,
    version: query.version,
  });
  const body = yield* encodeGet(result);
  return HttpServerResponse.jsonUnsafe(body, { status: 200, headers: NO_STORE });
}).pipe(Effect.catchTags({ DesignFailure: designFailureResponse }));

const forIssueHandler = Effect.gen(function* () {
  yield* authenticate(AuthOrchestrationReadScope);
  const raw = yield* readQuery(["projectId", "issue"]);
  const query = yield* decodeForIssueQuery(raw).pipe(
    Effect.mapError(
      () =>
        new DesignFailure({
          code: "invalid_request",
          message: "Query parameters are not valid.",
        }),
    ),
  );
  const design = yield* DesignService.DesignService;
  const result = yield* design.getForIssue({
    projectId: query.projectId,
    issue: query.issue,
  });
  const body = yield* encodeForIssue(result);
  return HttpServerResponse.jsonUnsafe(body, { status: 200, headers: NO_STORE });
}).pipe(Effect.catchTags({ DesignFailure: designFailureResponse }));

const listRoute = HttpRouter.add("GET", `${TRAIL_DESIGN_ROUTE_PREFIX}/list`, listHandler);
const pageRoute = HttpRouter.add("GET", `${TRAIL_DESIGN_ROUTE_PREFIX}/page`, pageHandler);
const forIssueRoute = HttpRouter.add("GET", `${TRAIL_DESIGN_ROUTE_PREFIX}/for-issue`, forIssueHandler);

export const layer = Layer.mergeAll(listRoute, pageRoute, forIssueRoute);