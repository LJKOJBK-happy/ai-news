import type { NewsItem, PipelineWindow } from '../types/news.js';
import { inWindow } from '../utils/time.js';
import { cleanTitle, normalizeUrl, normalizeTitle } from '../utils/text.js';

const blockedTitlePatterns = [
  /\b(sponsored|advertorial|promo|promotion)\b/i,
  /\b(webinar|register now|live event|meetup)\b/i,
  /\b(we('?| a)re hiring|job opening|careers?)\b/i,
  /\b(conference|tickets?)\b/i,
];

const blockedUrlPatterns = [/\/careers?\//i, /\/jobs?\//i, /utm_/i];

export const FilterParams = {
  minTitleLength: 12,
  minMeaningfulTokens: 3,
};

function isLowSignalTitle(title: string): boolean {
  const t = normalizeTitle(title);
  const tokenCount = t.split(/\s+/).filter(Boolean).length;
  return tokenCount < FilterParams.minMeaningfulTokens;
}

export function cleanAndFilter(items: NewsItem[], window: PipelineWindow): NewsItem[] {
  return items
    .map((item) => ({ ...item, title: cleanTitle(item.title), url: normalizeUrl(item.url) }))
    .filter((item) => Boolean(item.title) && Boolean(item.url) && Boolean(item.publishedAt))
    .filter((item) => item.title.length >= FilterParams.minTitleLength)
    .filter((item) => !isLowSignalTitle(item.title))
    .filter((item) => !blockedTitlePatterns.some((pattern) => pattern.test(item.title)))
    .filter((item) => !blockedUrlPatterns.some((pattern) => pattern.test(item.url)))
    .filter((item) => inWindow(item.publishedAt, window));
}
