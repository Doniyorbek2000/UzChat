import { storiesService } from "../modules/stories/stories.service";
import { logger } from "../utils/logger";
import { scheduleExclusiveJob } from "../utils/jobLock";

const INTERVAL_MS = 60 * 60 * 1000;

export function startStoryExpiryJob() {
  const run = () => storiesService.expireStories().catch((err) => logger.error("Story expiry job failed", { error: String(err) }));
  scheduleExclusiveJob("story-expiry", INTERVAL_MS, run, { immediate: true });
}
