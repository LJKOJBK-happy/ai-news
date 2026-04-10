import type { NewsItem, SourceConfig } from '../types/news.js';
import { logger } from '../utils/logger.js';
import { normalizeUrl, slug } from '../utils/text.js';

type ParsedFeedItem = {
  title?: string;
  link?: string;
  pubDate?: string;
  author?: string;
  summary?: string;
};

function extractTag(block: string, tag: string): string | undefined {
  const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return match?.[1]?.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function extractAtomLink(block: string): string | undefined {
  const linkTag = block.match(/<link[^>]*href=["']([^"']+)["'][^>]*\/?>(?:<\/link>)?/i);
  return linkTag?.[1];
}

function parseRss(xml: string): ParsedFeedItem[] {
  const entries: ParsedFeedItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  for (const match of xml.matchAll(itemRegex)) {
    const block = match[1];
    entries.push({
      title: extractTag(block, 'title'),
      link: extractTag(block, 'link'),
      pubDate: extractTag(block, 'pubDate') ?? extractTag(block, 'published') ?? extractTag(block, 'updated'),
      author: extractTag(block, 'dc:creator') ?? extractTag(block, 'author'),
      summary: extractTag(block, 'description') ?? extractTag(block, 'content:encoded'),
    });
  }
  return entries;
}

function parseAtom(xml: string): ParsedFeedItem[] {
  const entries: ParsedFeedItem[] = [];
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/gi;
  for (const match of xml.matchAll(entryRegex)) {
    const block = match[1];
    entries.push({
      title: extractTag(block, 'title'),
      link: extractAtomLink(block) ?? extractTag(block, 'id'),
      pubDate: extractTag(block, 'published') ?? extractTag(block, 'updated'),
      author: extractTag(block, 'name') ?? extractTag(block, 'author'),
      summary: extractTag(block, 'summary') ?? extractTag(block, 'content'),
    });
  }
  return entries;
}

function parseFeed(xml: string): ParsedFeedItem[] {
  return /<entry>/i.test(xml) ? parseAtom(xml) : parseRss(xml);
}

export async function collectRss(source: SourceConfig): Promise<NewsItem[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);

  try {
    const res = await fetch(source.url, { signal: controller.signal, headers: { 'user-agent': 'ai-news-rss/phase2' } });
    if (!res.ok) {
      logger.warn(`RSS fetch failed for ${source.id}: HTTP ${res.status}`);
      return [];
    }

    const xml = await res.text();
    const parsed = parseFeed(xml);
    const items = parsed.map((item) => {
      const publishedAt = item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString();
      const title = item.title?.trim() ?? '(untitled)';
      const rawUrl = item.link ?? source.url;
      const url = normalizeUrl(rawUrl);
      const id = `${source.id}-${slug(title)}-${Date.parse(publishedAt) || Date.now()}`;
      return {
        id,
        sourceId: source.id,
        sourceName: source.name,
        title,
        url,
        publishedAt,
        author: item.author,
        rawSummary: item.summary,
        contentSnippet: item.summary,
        category: source.category,
        tags: ['rss'],
      } satisfies NewsItem;
    });

    logger.info(`RSS collector parsed ${items.length} items from ${source.id}`);
    return items;
  } catch (error) {
    logger.warn(`RSS fetch failed for ${source.id}: ${String(error)}`);
    return [];
  } finally {
    clearTimeout(timer);
  }
}
