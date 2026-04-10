import { runDailyPipeline } from './pipelines/daily.js';
import { runWeeklyPipeline } from './pipelines/weekly.js';
import { runHealthCheck } from './pipelines/health.js';
import { logger } from './utils/logger.js';

async function main(): Promise<void> {
  const mode = process.argv[2] as 'daily' | 'weekly' | 'health' | undefined;

  if (mode === 'daily') {
    await runDailyPipeline();
    return;
  }

  if (mode === 'weekly') {
    await runWeeklyPipeline();
    return;
  }

  if (mode === 'health') {
    await runHealthCheck();
    return;
  }

  logger.warn('Usage: pnpm daily | pnpm weekly | pnpm health');
}

main().catch((err) => {
  logger.error(String(err));
  process.exitCode = 1;
});
