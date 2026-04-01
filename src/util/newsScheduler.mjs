import path from "node:path";
import { pathToFileURL } from "node:url";

const RUN_HOURS = [9, 13, 17];

export async function startNewsScheduler() {
  const scheduleNextRun = () => {
    const now = new Date(
      new Date().getTime() +
        (Number(process.env.TIMEZONE_OFFSET) || 0) * 60 * 60 * 1000,
    );
    let nextRun = null;

    for (const hour of RUN_HOURS) {
      const candidate = new Date(now);
      candidate.setHours(hour, 0, 0, 0);
      if (candidate > now) {
        nextRun = candidate;
        break;
      }
    }

    if (!nextRun) {
      nextRun = new Date(now);
      nextRun.setDate(nextRun.getDate() + 1);
      nextRun.setHours(RUN_HOURS[0], 0, 0, 0);
    }

    const delay = Math.max(0, nextRun.getTime() - now.getTime());
    console.log(
      `[news-scheduler] Next run at ${nextRun.toISOString()} (in ${Math.round(delay / 1000)}s)`,
    );

    setTimeout(() => {
      runNewsSchedulerOnce()
        .catch((error) => {
          console.error(
            "[news-scheduler] Unexpected error:",
            error instanceof Error ? error.message : error,
          );
        })
        .finally(() => {
          scheduleNextRun();
        });
    }, delay);
  };

  scheduleNextRun();
}

const executedFilePath = process.argv[1]
  ? path.resolve(process.argv[1])
  : undefined;

if (
  executedFilePath &&
  pathToFileURL(executedFilePath).href === import.meta.url
) {
  startNewsScheduler().catch((error) => {
    console.error(
      "[news-scheduler] Failed to start:",
      error instanceof Error ? error.message : error,
    );
    process.exit(1);
  });
}
