import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { collectAll } from '../collectors/index.js';
import { dedupeNews } from '../dedupe/index.js';
import { cleanAndFilter } from '../filters/index.js';
import { renderDailyMarkdown } from '../outputs/markdown.js';
import { scoreItems } from '../scoring/rules.js';
import { createStorage } from '../storage/index.js';
import type { DailyReportSection } from '../types/news.js';
import { logger } from '../utils/logger.js';
import { createWindow, ymd } from '../utils/time.js';

function buildSections(items: ReturnType<typeof scoreItems>): DailyReportSection[] {
  const hot = items.slice(0, 4);
  const browser = items.filter((x) => x.category === 'frontend').slice(0, 4);
  const ai = items.filter((x) => x.category === 'ai-engineering').slice(0, 4);
  const others = items.filter((x) => x.category !== 'frontend' && x.category !== 'ai-engineering').slice(0, 3);

  return [
    { title: '今日最值得看', items: hot },
    { title: '浏览器与平台', items: browser },
    { title: 'AI 工程', items: ai },
    { title: '其他补充', items: others },
  ];
}

export async function runDailyPipeline(): Promise<void> {
  const storage = await createStorage();
  logger.info(`Storage backend: ${storage.name}`);

  const window = createWindow(36);
  const raw = await collectAll('daily');
  const cleaned = cleanAndFilter(raw, window);
  const deduped = dedupeNews(cleaned);
  const scored = scoreItems(deduped);
  const selected = scored.slice(0, 12);

  await storage.upsertItems(raw, 'raw');
  await storage.upsertItems(cleaned, 'cleaned');
  await storage.upsertItems(selected, 'scored');

  const sections = buildSections(selected);
  const concept = 'Baseline 与浏览器发布节奏：如何判断新能力何时适合进入生产环境。';
  const practice = '把今天 1 条更新转成团队 ADR（问题、方案、风险、回滚）。';

  const date = ymd();
  const md = renderDailyMarkdown(date, sections, concept, practice);

  const reportDir = path.resolve('reports/daily');
  await mkdir(reportDir, { recursive: true });
  const reportPath = path.join(reportDir, `${date}.md`);
  await writeFile(reportPath, md, 'utf8');

  const runId = `daily-${date}-${Date.now()}`;
  await storage.saveRun(runId, {
    generatedAt: new Date().toISOString(),
    mode: 'daily',
    raw,
    cleaned,
    scored,
    selectedIds: selected.map((x) => x.id),
    selected: selected.map((x) => ({ itemId: x.id, selectedFor: 'daily' as const })),
    reportPath,
    sourceStats: { totalFetched: raw.length, afterFilter: cleaned.length, afterDedupe: deduped.length, selected: selected.length },
  });

  await storage.markSelections(runId, selected.map((x) => ({ itemId: x.id, selectedFor: 'daily' as const })));
  logger.info(`Daily report generated: ${reportPath}`);
}
