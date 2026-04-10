import type { DailyReportSection, ScoredNewsItem, WeeklyTopicCluster } from '../types/news.js';
import { whyWorthReading, oneSentenceSummary } from '../utils/text.js';

function renderItem(item: ScoredNewsItem): string {
  return [
    `### ${item.title}`,
    `- 来源：${item.sourceName}`,
    `- 链接：${item.url}`,
    `- 一句话摘要：${oneSentenceSummary(item.title, item.sourceName, item.category)}`,
    `- 为什么值得看：${whyWorthReading(item.category, item.title, item.reason)}`,
  ].join('\n');
}

export function renderDailyMarkdown(
  date: string,
  sections: DailyReportSection[],
  conceptOfDay: string,
  practiceOfDay: string,
): string {
  const body = sections
    .map((section) => `## ${section.title}\n\n${section.items.map(renderItem).join('\n\n') || '- 暂无内容'}`)
    .join('\n\n');

  return `# 前端 / AI 工程日报 - ${date}\n\n${body}\n\n## 今日值得了解的 1 个概念\n\n${conceptOfDay}\n\n## 今日值得尝试的 1 个小实践\n\n${practiceOfDay}\n`;
}

export function renderWeeklyMarkdown(
  year: number,
  week: number,
  topChanges: WeeklyTopicCluster[],
  mustReads: ScoredNewsItem[],
  interviewPoints: string[],
  actions: string[],
): string {
  const head = `# 前端 / AI 工程周报 - Week ${String(week).padStart(2, '0')} (${year})`;
  const changes = topChanges.slice(0, 3).map((cluster, idx) =>
    `### ${idx + 1}. ${cluster.topic}\n` +
    `- 发生了什么：${cluster.summary}\n` +
    `- 为什么重要：${cluster.items.length} 条高相关更新在本周集中出现。\n` +
    `- 对前端工程师意味着什么：${cluster.impactForFrontend}`,
  ).join('\n\n');

  const reads = mustReads
    .slice(0, 5)
    .map((item, i) => `${i + 1}. [${item.title}](${item.url})（${item.sourceName}，入选理由：${item.reason}）`)
    .join('\n') || '- 暂无内容';

  const interview = interviewPoints.map((x) => `- ${x}`).join('\n');
  const actionLines = actions.map((x) => `- ${x}`).join('\n');

  return `${head}\n\n## 本周 3 个重点变化\n\n${changes}\n\n## 本周最值得读的 5 篇\n\n${reads}\n\n## 本周建议补的 2 个面试知识点\n\n${interview}\n\n## 下周建议尝试的 3 个实践动作\n\n${actionLines}\n\n> 生成时间：${new Date().toISOString()}\n`;
}
