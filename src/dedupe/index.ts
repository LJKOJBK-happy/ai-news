import type { NewsItem, SourceConfig } from '../types/news.js';
import sources from '../config/sources.json' with { type: 'json' };
import { normalizeTitle, similarity } from '../utils/text.js';

const sourceMap = new Map((sources as SourceConfig[]).map((s) => [s.id, s]));

const officialSourceIds = new Set(['webdev', 'chrome-dev-blog', 'webkit-blog', 'openai-api-changelog', 'openai-codex-changelog', 'github-blog-ai-ml']);

export const DedupeParams = {
  titleSimilarityThreshold: 0.84,
};

function qualityScore(item: NewsItem): number {
  const sourceWeight = sourceMap.get(item.sourceId)?.weight ?? 0;
  const officialBoost = officialSourceIds.has(item.sourceId) ? 0.15 : 0;
  const recencyBoost = Math.max(0, 0.2 - (Date.now() - new Date(item.publishedAt).getTime()) / (1000 * 3600 * 24 * 40));
  const depthBoost = Math.min(0.15, (item.rawSummary?.length ?? 0) / 1500);
  return sourceWeight + officialBoost + recencyBoost + depthBoost;
}

function pickBetter(a: NewsItem, b: NewsItem): NewsItem {
  return qualityScore(a) >= qualityScore(b) ? a : b;
}

export function dedupeNews(items: NewsItem[]): NewsItem[] {
  const byUrl = new Map<string, NewsItem>();
  for (const item of items) {
    const prev = byUrl.get(item.url);
    byUrl.set(item.url, prev ? pickBetter(prev, item) : item);
  }

  const urlDeduped = [...byUrl.values()].sort((a, b) => qualityScore(b) - qualityScore(a));
  const result: NewsItem[] = [];

  for (const item of urlDeduped) {
    const idx = result.findIndex((r) => {
      const sameNormalized = normalizeTitle(r.title) === normalizeTitle(item.title);
      const similar = similarity(r.title, item.title) >= DedupeParams.titleSimilarityThreshold;
      return sameNormalized || similar;
    });

    if (idx === -1) {
      result.push(item);
    } else {
      result[idx] = pickBetter(result[idx], item);
    }
  }

  return result.sort((a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt));
}
