import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { collectAll } from '../collectors/index.js';
import { dedupeNews } from '../dedupe/index.js';
import { cleanAndFilter } from '../filters/index.js';
import { renderWeeklyMarkdown } from '../outputs/markdown.js';
import { scoreItems } from '../scoring/rules.js';
import { createStorage } from '../storage/index.js';
import type { ScoredNewsItem, WeeklyTopicCluster } from '../types/news.js';
import { logger } from '../utils/logger.js';
import { createDaysWindow, isoWeek } from '../utils/time.js';

function clusterTopics(items: ScoredNewsItem[]): WeeklyTopicCluster[] {
  const clusters: WeeklyTopicCluster[] = [
    {
      topic: '浏览器平台能力持续前移',
      keywords: ['browser', 'chrome', 'webkit', 'baseline'],
      items: [],
      summary: '浏览器能力更新更快地影响到前端技术选型与兼容性策略。',
      impactForFrontend: '建议把新 API 引入流程标准化（兼容性校验 + 渐进增强 + 回归测试）。',
    },
    {
      topic: 'AI coding 工具链进入工程化阶段',
      keywords: ['agent', 'tool', 'codex', 'eval', 'api'],
      items: [],
      summary: 'AI 工程资讯从“模型能力”转向“工具链稳定性与可运营性”。',
      impactForFrontend: '可优先在前端脚手架、测试生成与文档同步上做可控试点。',
    },
    {
      topic: '性能与可维护性再次成为主线',
      keywords: ['performance', 'render', 'accessibility', 'typescript'],
      items: [],
      summary: '性能、可访问性与工程可维护性仍是高频关键词。',
      impactForFrontend: '把性能预算、可访问性检查与 TS 约束纳入 CI 常规门禁。',
    },
  ];

  for (const item of items) {
    const text = `${item.title} ${item.rawSummary ?? ''}`.toLowerCase();
    let best = clusters[2];
    if (/(browser|chrome|webkit|baseline|web api)/.test(text)) best = clusters[0];
    else if (/(agent|tool|eval|llm|codex|api)/.test(text)) best = clusters[1];
    best.items.push(item);
  }

  return clusters.sort((a, b) => b.items.length - a.items.length);
}

export async function runWeeklyPipeline(): Promise<void> {
  const storage = await createStorage();
  logger.info(`Storage backend: ${storage.name}`);

  const window = createDaysWindow(7);
  const raw = await collectAll('weekly');
  const cleaned = cleanAndFilter(raw, window);
  const deduped = dedupeNews(cleaned);
  const scored = scoreItems(deduped);

  await storage.upsertItems(raw, 'raw');
  await storage.upsertItems(cleaned, 'cleaned');
  await storage.upsertItems(scored, 'scored');

  const history = await storage.readRecentRuns('daily', 7);
  const historical = history.flatMap((run) => run.scored).filter((x) => new Date(x.publishedAt).getTime() >= window.from.getTime());
  const merged = scoreItems(dedupeNews([...scored, ...historical]));

  const clusters = clusterTopics(merged);
  const mustReads = merged.slice(0, 5);

  const interviewPoints = [
    '如何在前端工程中设计“渐进增强 + 兼容性回退”策略，并量化风险？',
    '当引入 AI coding agent 时，如何定义 eval 指标与上线门槛？',
  ];

  const actions = [
    '把 1 条本周浏览器能力更新转成团队内可复用模板（含回归用例）。',
    '针对 AI coding 场景建立最小 eval 集合（10~20 条真实任务）。',
    '在现有项目中新增一次可访问性 + 性能联合巡检。',
  ];

  const { year, week } = isoWeek();
  const md = renderWeeklyMarkdown(year, week, clusters, mustReads, interviewPoints, actions);

  const reportDir = path.resolve('reports/weekly');
  await mkdir(reportDir, { recursive: true });
  const reportName = `${year}-W${String(week).padStart(2, '0')}.md`;
  const reportPath = path.join(reportDir, reportName);
  await writeFile(reportPath, md, 'utf8');

  const runId = `weekly-${year}-W${String(week).padStart(2, '0')}-${Date.now()}`;
  await storage.saveRun(runId, {
    generatedAt: new Date().toISOString(),
    mode: 'weekly',
    raw,
    cleaned,
    scored: merged,
    selectedIds: mustReads.map((x) => x.id),
    selected: mustReads.map((x) => ({ itemId: x.id, selectedFor: 'weekly' as const })),
    reportPath,
    sourceStats: { totalFetched: raw.length, afterFilter: cleaned.length, afterDedupe: deduped.length, selected: mustReads.length },
  });
  await storage.markSelections(runId, mustReads.map((x) => ({ itemId: x.id, selectedFor: 'weekly' as const })));

  logger.info(`Weekly report generated: ${reportPath}`);
}
