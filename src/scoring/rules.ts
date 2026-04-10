import sources from '../config/sources.json' with { type: 'json' };
import type { ScoredNewsItem, NewsItem, SourceConfig } from '../types/news.js';

const sourceMap = new Map((sources as SourceConfig[]).map((s) => [s.id, s]));
const officialSourceIds = new Set(['webdev', 'chrome-dev-blog', 'webkit-blog', 'openai-api-changelog', 'openai-codex-changelog', 'github-blog-ai-ml', 'hf-blog']);

const frontendKeywords = ['browser', 'chrome', 'webkit', 'css', 'render', 'performance', 'accessibility', 'typescript', 'javascript', 'react', 'web api'];
const aiKeywords = ['agent', 'tool', 'eval', 'context', 'prompt', 'codex', 'api', 'model', 'inference', 'changelog', 'llm'];
const actionableKeywords = ['how to', 'guide', 'migration', 'benchmark', 'best practice', 'step-by-step', 'tutorial', 'example'];
const interviewKeywords = ['tradeoff', 'architecture', 'performance', 'consistency', 'latency', 'scalability', 'debug', 'evaluation'];

function keywordScore(text: string, keywords: string[]): number {
  const lower = text.toLowerCase();
  const hits = keywords.filter((k) => lower.includes(k)).length;
  return Math.min(1, hits / 3);
}

function recencyScore(publishedAt: string): number {
  const ageHours = (Date.now() - new Date(publishedAt).getTime()) / 36e5;
  if (ageHours < 12) return 1;
  if (ageHours < 36) return 0.85;
  if (ageHours < 72) return 0.65;
  if (ageHours < 7 * 24) return 0.4;
  return 0.15;
}

export function scoreItems(items: NewsItem[]): ScoredNewsItem[] {
  return items.map((item) => {
    const sourceWeight = sourceMap.get(item.sourceId)?.weight ?? 0.5;
    const text = `${item.title} ${item.rawSummary ?? ''} ${item.contentSnippet ?? ''}`;

    const breakdown = {
      sourceWeight,
      recencyScore: recencyScore(item.publishedAt),
      relevanceToFrontend: keywordScore(text, frontendKeywords),
      relevanceToAIEngineering: keywordScore(text, aiKeywords),
      officialSourceBoost: officialSourceIds.has(item.sourceId) ? 1 : 0.2,
      actionableEngineeringBoost: keywordScore(text, actionableKeywords),
      interviewValueBoost: keywordScore(text, interviewKeywords),
    };

    const score =
      breakdown.sourceWeight * 0.24 +
      breakdown.recencyScore * 0.2 +
      breakdown.relevanceToFrontend * 0.16 +
      breakdown.relevanceToAIEngineering * 0.16 +
      breakdown.officialSourceBoost * 0.12 +
      breakdown.actionableEngineeringBoost * 0.07 +
      breakdown.interviewValueBoost * 0.05;

    return {
      ...item,
      score: Number(score.toFixed(4)),
      scoreBreakdown: breakdown,
      reason:
        `source=${breakdown.sourceWeight.toFixed(2)}, recency=${breakdown.recencyScore.toFixed(2)}, ` +
        `fe=${breakdown.relevanceToFrontend.toFixed(2)}, ai=${breakdown.relevanceToAIEngineering.toFixed(2)}, ` +
        `official=${breakdown.officialSourceBoost.toFixed(2)}, actionable=${breakdown.actionableEngineeringBoost.toFixed(2)}, interview=${breakdown.interviewValueBoost.toFixed(2)}`,
    };
  }).sort((a, b) => b.score - a.score);
}
