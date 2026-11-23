import type { Instrumentation } from "next";
import { isLoggedRoute, logRequestOutcome, REQUEST_ID_HEADER, REQUEST_STARTED_HEADER } from "@/app/lib/request-logging";

export const onRequestError: Instrumentation.onRequestError = async (_error, request, context) => {
  const route = context.routePath.replace(/\/route$/, "");
  if (context.routeType !== "route" || !isLoggedRoute(route, request.method)) return;

  const requestId = request.headers[REQUEST_ID_HEADER];
  const startedAt = Number(request.headers[REQUEST_STARTED_HEADER]);
  if (typeof requestId !== "string" || !startedAt) return;

  await logRequestOutcome({
    event: "api.request_failed",
    route,
    method: request.method,
    status: 500,
    requestId,
    durationMs: Date.now() - startedAt,
  });
};
