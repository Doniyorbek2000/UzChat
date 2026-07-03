import https from "https";
import { URL } from "url";
import { logger } from "../utils/logger";

// Centralised exception capture. When SENTRY_DSN is set, unhandled errors are
// forwarded to Sentry's store endpoint over its documented HTTP API (no SDK
// dependency, so the bundle stays lean); otherwise it's a no-op beyond the
// existing structured log. This gives production the one thing the audit
// flagged as missing — knowing *where* a crash happened — without coupling to
// a specific vendor SDK version.

interface ParsedDsn {
  host: string;
  projectId: string;
  publicKey: string;
  protocol: string;
}

function parseDsn(dsn: string): ParsedDsn | null {
  try {
    // https://<publicKey>@<host>/<projectId>
    const u = new URL(dsn);
    const projectId = u.pathname.replace(/^\//, "");
    if (!u.username || !projectId) return null;
    return { host: u.host, projectId, publicKey: u.username, protocol: u.protocol.replace(":", "") };
  } catch {
    return null;
  }
}

const dsn = process.env.SENTRY_DSN ? parseDsn(process.env.SENTRY_DSN) : null;
const environment = process.env.NODE_ENV ?? "development";
const release = process.env.APP_VERSION ?? "1.0.0";

export interface CaptureContext {
  requestId?: string;
  method?: string;
  url?: string;
  userId?: string;
}

function send(payload: Record<string, unknown>): void {
  if (!dsn) return;
  const body = JSON.stringify(payload);
  const auth =
    `Sentry sentry_version=7, sentry_client=uzchat/1.0, sentry_key=${dsn.publicKey}`;
  const req = https.request(
    {
      method: "POST",
      host: dsn.host,
      path: `/api/${dsn.projectId}/store/`,
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
        "X-Sentry-Auth": auth,
      },
      timeout: 3000,
    },
    (res) => res.resume() // drain
  );
  req.on("error", () => {}); // never let telemetry break the request
  req.on("timeout", () => req.destroy());
  req.write(body);
  req.end();
}

export const errorTracking = {
  get enabled(): boolean {
    return dsn !== null;
  },

  captureException(err: unknown, context: CaptureContext = {}): void {
    const error = err instanceof Error ? err : new Error(String(err));
    if (!dsn) return; // logging is already handled by the caller
    try {
      send({
        event_id: crypto.randomUUID().replace(/-/g, ""),
        timestamp: new Date().toISOString(),
        platform: "node",
        level: "error",
        environment,
        release,
        transaction: context.url,
        tags: { requestId: context.requestId ?? "", method: context.method ?? "" },
        user: context.userId ? { id: context.userId } : undefined,
        exception: {
          values: [
            {
              type: error.name,
              value: error.message,
              stacktrace: error.stack
                ? { frames: error.stack.split("\n").slice(1, 30).map((line) => ({ filename: line.trim() })) }
                : undefined,
            },
          ],
        },
      });
    } catch (e) {
      logger.warn("errorTracking.captureException failed", { error: String(e) });
    }
  },
};

// Node's global crypto (18+); referenced lazily so tests without it don't break.
declare const crypto: { randomUUID(): string };
