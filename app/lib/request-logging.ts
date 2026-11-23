import { after, type NextRequest } from "next/server";
import { createLogger } from "@/app/lib/logger";

export const REQUEST_ID_HEADER = "x-request-id";
export const REQUEST_STARTED_HEADER = "x-borderless-buy-request-started";

const service = "borderless-buy";
const logger = createLogger(service);
const logEndpoints = new Set([
  "https://log-api.newrelic.com/log/v1",
  "https://log-api.eu.newrelic.com/log/v1",
  "https://log-api.jp.nr-data.net/log/v1",
  "https://gov-log-api.newrelic.com/log/v1",
]);

const loggedMethods = {
  "/api/add-item": ["POST"],
  "/api/auth/callback": ["POST"],
  "/api/rates": ["GET"],
  "/api/wishlist": ["GET", "POST", "PATCH", "DELETE"],
} satisfies Record<string, string[]>;

type LoggedRoute = keyof typeof loggedMethods;
type OutcomeEvent = "api.request_succeeded" | "api.request_failed" | "auth.sign_in_succeeded";

export function isLoggedRoute(route: string, method: string): route is LoggedRoute {
  return Object.hasOwn(loggedMethods, route) && loggedMethods[route as LoggedRoute].includes(method);
}

export async function logRequestOutcome(outcome: {
  event: OutcomeEvent;
  route: LoggedRoute;
  method: string;
  status: number;
  requestId: string;
  durationMs: number;
}) {
  const { event, route, method, status, requestId, durationMs } = outcome;
  const attributes = {
    "service.name": service,
    "event.name": event,
    "http.route": route,
    "http.method": method,
    "http.status_code": status,
    "duration.ms": Math.max(0, durationMs),
    "request.id": requestId,
  };

  if (status >= 500) {
    logger.error(event, undefined, attributes);
  } else {
    logger.info(event, attributes);
  }

  const key = process.env.NEW_RELIC_LICENSE_KEY;
  const url = process.env.NEW_RELIC_LOG_URL;
  if (!key || !url) return;
  if (!logEndpoints.has(url)) {
    logger.warn("New Relic Log API URL is invalid");
    return;
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Api-Key": key, "Content-Type": "application/json" },
      body: JSON.stringify({ message: event, ...attributes }),
      redirect: "error",
      signal: AbortSignal.timeout(2_000),
    });
    if (!response.ok) logger.warn("New Relic Log API rejected the request", { status: response.status });
  } catch {
    logger.warn("New Relic Log API request failed");
  }
}

export function withRequestLogging(
  route: LoggedRoute,
  handler: (request: NextRequest) => Promise<Response>,
  successEvent: OutcomeEvent = "api.request_succeeded",
) {
  return async (request: NextRequest): Promise<Response> => {
    const { method } = request;
    const requestId = request.headers.get(REQUEST_ID_HEADER);
    const startedAt = Number(request.headers.get(REQUEST_STARTED_HEADER));
    const response = await handler(request);

    if (!requestId || !startedAt || !isLoggedRoute(route, method)) return response;

    const { status } = response;
    response.headers.set(REQUEST_ID_HEADER, requestId);
    if (status >= 500 || (status >= 200 && status < 300)) {
      const event = status >= 500 ? "api.request_failed" : successEvent;
      const durationMs = Date.now() - startedAt;
      after(() => logRequestOutcome({ event, route, method, status, requestId, durationMs }));
    }
    return response;
  };
}
