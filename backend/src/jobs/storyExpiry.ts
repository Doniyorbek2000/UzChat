import { storiesService } from "../modules/stories/stories.service";

const INTERVAL_MS = 60 * 60 * 1000;

export function startStoryExpiryJob() {
  const run = () => storiesService.expireStories().catch((err) => console.error("Story expiry job failed:", err));
  run();
  setInterval(run, INTERVAL_MS);
}
