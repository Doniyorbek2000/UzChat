import { channelStatsService } from "../modules/chats/channelStats.service";
import { logger } from "../utils/logger";

const INTERVAL_MS = 24 * 60 * 60 * 1000;

export function startChannelStatsJob() {
  const run = async () => {
    try {
      await channelStatsService.recordDailyStats();
      logger.info("Channel stats recorded");
    } catch (err) {
      logger.error("Channel stats job failed", { error: String(err) });
    }
  };
  run();
  setInterval(run, INTERVAL_MS);
}
