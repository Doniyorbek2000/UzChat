import { storiesService } from "../modules/stories/stories.service";
import { logger } from "../utils/logger";

const INTERVAL_MS = 60 * 60 * 1000;

export function startStoryExpiryJob() {
  const run = () => storiesService.expireStories().catch((err) => logger.error("Story expiry job failed", { error: String(err) }));
  run();
  setInterval(run, INTERVAL_MS);
}
