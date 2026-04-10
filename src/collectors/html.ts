import type { NewsItem, SourceConfig } from '../types/news.js';
import { logger } from '../utils/logger.js';
import { normalizeUrl, slug } from '../utils/text.js';

type HtmlParsedItem = {
  title?: string;
  url?: string;
  publishedAt?: string;
  summary?: string;
};

type SiteParser = (html: string, source: SourceConfig) => HtmlParsedItem[];

function stripTags(input: string): string {
  return input.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function tryParseDate(raw?: string): string | undefined {
  if (!raw) return undefined;
  const d = new Date(raw.trim());
  if (!Number.isNaN(d.getTime())) return d.toISOString();
  return undefined;
}

function parseAnchors(html: string, source: SourceConfig): HtmlParsedItem[] {
  const items: HtmlParsedItem[] = [];
  const pattern = /<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  for (const m of html.matchAll(pattern)) {
    const href = m[1];
    const text = stripTags(m[2]);
    if (!text || text.length < 12) continue;
    if (href.startsWith('#') || href.startsWith('mailto:')) continue;

    const fullUrl = href.startsWith('http') ? href : new URL(href, source.url).toString();
    items.push({ title: text, url: fullUrl });
    if (items.length >= 80) break;
  }
  return items;
}

function parseOpenAiDocsChangelog(html: string, source: SourceConfig): HtmlParsedItem[] {
  const items: HtmlParsedItem[] = [];
  const sectionPattern = /<h2[^>]*id=["']([^"']+)["'][^>]*>([\s\S]*?)<\/h2>/gi;

  for (const m of html.matchAll(sectionPattern)) {
    const id = m[1];
    const title = stripTags(m[2]);
    if (!title) continue;
    const near = html.slice(Math.max(0, m.index ?? 0), (m.index ?? 0) + 600);
    const publishedAt = tryParseDate((near.match(/\b\d{4}-\d{2}-\d{2}\b/) ?? [])[0]);
    items.push({ title, url: `${source.url}#${id}`, publishedAt, summary: 'OpenAI API changelog entry' });
  }

  return items;
}

function parseOpenAiCodexTopic(html: string, source: SourceConfig): HtmlParsedItem[] {
  const items: HtmlParsedItem[] = [];
  const articlePattern = /<article[\s\S]*?<\/article>/gi;
  for (const m of html.matchAll(articlePattern)) {
    const block = m[0];
    const href = block.match(/href=["']([^"']+)["']/i)?.[1];
    const title = stripTags(block.match(/<h[1-4][^>]*>([\s\S]*?)<\/h[1-4]>/i)?.[1] ?? '');
    const dt = block.match(/datetime=["']([^"']+)["']/i)?.[1];
    if (!href || !title) continue;
    const fullUrl = href.startsWith('http') ? href : new URL(href, source.url).toString();
    items.push({ title, url: fullUrl, publishedAt: tryParseDate(dt), summary: 'OpenAI Codex topic update' });
  }
  return items;
}

const siteParsers: Record<string, SiteParser> = {
  'openai-api-changelog': parseOpenAiDocsChangelog,
  'openai-codex-changelog': parseOpenAiCodexTopic,
};

function mapToNews(source: SourceConfig, parsed: HtmlParsedItem[]): NewsItem[] {
  return parsed
    .filter((x) => x.title && x.url)
    .map((item) => {
      const publishedAt = item.publishedAt ?? new Date().toISOString();
      const title = stripTags(item.title ?? '');
      const url = normalizeUrl(item.url ?? source.url);
      return {
        id: `${source.id}-${slug(title)}-${Date.parse(publishedAt) || Date.now()}`,
        sourceId: source.id,
        sourceName: source.name,
        title,
        url,
        publishedAt,
        rawSummary: item.summary,
        contentSnippet: item.summary,
        category: source.category,
        tags: ['html-collector'],
      } satisfies NewsItem;
    });
}

export async function collectHtml(source: SourceConfig): Promise<NewsItem[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);

  try {
    const res = await fetch(source.url, {
      signal: controller.signal,
      headers: { 'user-agent': 'ai-news-collector/phase2 (+https://github.com)' },
    });
    if (!res.ok) {
      logger.warn(`HTML fetch failed for ${source.id}: HTTP ${res.status}`);
      return [];
    }

    const html = await res.text();
    const parser = siteParsers[source.id] ?? parseAnchors;
    const parsed = parser(html, source);
    const news = mapToNews(source, parsed).slice(0, 50);

    logger.info(`HTML collector parsed ${news.length} items from ${source.id}`);
    return news;
  } catch (error) {
    logger.warn(`HTML fetch failed for ${source.id}: ${String(error)}`);
    return [];
  } finally {
    clearTimeout(timer);
  }
}
