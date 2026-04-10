import sources from '../config/sources.json' with { type: 'json' };
import type { NewsItem, SourceConfig } from '../types/news.js';
import { collectHtml } from './html.js';
import { collectRss } from './rss.js';
import { logger } from '../utils/logger.js';

export function getEnabledSources(): SourceConfig[] {
  return (sources as SourceConfig[]).filter((source) => source.enabled);
}

async function collectWithRetry(source: SourceConfig, retries = 1): Promise<NewsItem[]> {
  const fetcher = source.fetch === 'rss' ? collectRss : collectHtml;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const items = await fetcher(source);
    if (items.length > 0 || attempt === retries) return items;
    logger.warn(`Retrying source ${source.id} (attempt ${attempt + 2}/${retries + 1})`);
  }
  return [];
}

export async function collectAll(cadence: 'daily' | 'weekly'): Promise<NewsItem[]> {
  const enabled = getEnabledSources().filter((s) => s.cadence === cadence || cadence === 'weekly');
  logger.info(`Collecting ${cadence} news from ${enabled.length} sources...`);

  const results = await Promise.all(
    enabled.map(async (source) => {
      const items = await collectWithRetry(source, 1);
      logger.info(`Source ${source.id} -> ${items.length} item(s)`);
      return items;
    }),
  );

  return results.flat();
}
