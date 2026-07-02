import { logger } from "./logger";

// Distributed lock for background jobs: when several backend replicas run,
// each periodic job still executes on exactly one node per interval. Without
// Redis (single-node dev) jobs simply run locally, matching old behaviour.

function redis(): any {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require("../config/redis").getRedis();
  } catch {
    return null;
  }
}

const PREFIX = "uzchat:joblock:";

/**
 * Runs fn only if this node wins the Redis lock for jobName. The lock is
 * intentionally NOT released on completion — it expires by TTL, so replicas
 * whose timers fire a few seconds apart don't re-run the same interval's work.
 */
export async function runExclusive(jobName: string, ttlMs: number, fn: () => Promise<unknown>): Promise<boolean> {
  const r = redis();
  if (r) {
    try {
      const acquired = await r.set(`${PREFIX}${jobName}`, "1", { NX: true, PX: ttlMs });
      if (acquired === null) return false;
    } catch (err) {
      // Redis hiccup: running the job anyway beats silently skipping it —
      // all jobs here are idempotent cleanups/refunds.
      logger.warn("Job lock unavailable, running without lock", { jobName, error: String(err) });
    }
  }
  await fn();
  return true;
}

/**
 * setInterval + runExclusive in one call. TTL is slightly shorter than the
 * interval so the next interval's winner can always acquire the lock.
 */
export function scheduleExclusiveJob(
  jobName: string,
  intervalMs: number,
  fn: () => Promise<unknown>,
  opts: { immediate?: boolean } = {}
): NodeJS.Timeout {
  const ttlMs = Math.max(Math.floor(intervalMs * 0.9), 5_000);
  const tick = () => {
    runExclusive(jobName, ttlMs, fn).catch((err) => {
      logger.error("Background job tick failed", { jobName, error: String(err) });
    });
  };
  if (opts.immediate) tick();
  const handle = setInterval(tick, intervalMs);
  handle.unref?.();
  return handle;
}
