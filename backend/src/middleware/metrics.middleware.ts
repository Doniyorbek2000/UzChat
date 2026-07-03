import { Request, Response, NextFunction } from "express";
import client from "prom-client";
import { env } from "../config/env";

// Prometheus instrumentation: default process metrics, an HTTP latency
// histogram per route/method/status, and a live socket connection gauge.
// Scraping requires METRICS_TOKEN so the endpoint leaks nothing publicly.

export const metricsRegistry = new client.Registry();
client.collectDefaultMetrics({ register: metricsRegistry });

const httpRequestDuration = new client.Histogram({
  name: "uzchat_http_request_duration_seconds",
  help: "HTTP request duration in seconds",
  labelNames: ["method", "route", "status"] as const,
  buckets: [0.005, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [metricsRegistry],
});

new client.Gauge({
  name: "uzchat_socket_connections",
  help: "Currently connected Socket.io clients on this node",
  registers: [metricsRegistry],
  collect() {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { getIo } = require("../sockets");
      this.set(getIo().engine.clientsCount ?? 0);
    } catch {
      this.set(0);
    }
  },
});

export const socketEventsCounter = new client.Counter({
  name: "uzchat_socket_events_total",
  help: "Processed Socket.io events by name",
  labelNames: ["event"] as const,
  registers: [metricsRegistry],
});

export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const end = httpRequestDuration.startTimer();
  res.on("finish", () => {
    // req.route is set by Express only after routing; falls back to the
    // mount path so unmatched requests don't explode label cardinality.
    const route = req.route?.path
      ? `${req.baseUrl}${req.route.path}`
      : req.baseUrl || "(unmatched)";
    end({ method: req.method, route, status: String(res.statusCode) });
  });
  next();
}

export async function metricsHandler(req: Request, res: Response) {
  if (!env.metrics.token) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Topilmadi" } });
    return;
  }
  const header = req.headers.authorization ?? "";
  if (header !== `Bearer ${env.metrics.token}`) {
    res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Token noto'g'ri" } });
    return;
  }
  res.set("Content-Type", metricsRegistry.contentType);
  res.send(await metricsRegistry.metrics());
}
