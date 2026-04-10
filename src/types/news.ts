export type Cadence = 'daily' | 'weekly';
export type FetchKind = 'rss' | 'html';

export type NewsItem = {
  id: string;
  sourceId: string;
  sourceName: string;
  title: string;
  url: string;
  publishedAt: string;
  author?: string;
  rawSummary?: string;
  contentSnippet?: string;
  category: string;
  tags: string[];
};

export type SourceConfig = {
  id: string;
  name: string;
  category: 'frontend' | 'ai-engineering' | 'platform';
  cadence: Cadence;
  weight: number;
  fetch: FetchKind;
  url: string;
  enabled: boolean;
  notes?: string;
};

export type ScoreBreakdown = {
  sourceWeight: number;
  recencyScore: number;
  relevanceToFrontend: number;
  relevanceToAIEngineering: number;
  officialSourceBoost: number;
  actionableEngineeringBoost: number;
  interviewValueBoost: number;
};

export type ScoredNewsItem = NewsItem & {
  score: number;
  scoreBreakdown: ScoreBreakdown;
  reason: string;
};

export type DailyReportSection = {
  title: string;
  items: ScoredNewsItem[];
};

export type WeeklyTopicCluster = {
  topic: string;
  keywords: string[];
  items: ScoredNewsItem[];
  summary: string;
  impactForFrontend: string;
};

export type PipelineWindow = {
  from: Date;
  to: Date;
};

export type StoredRunData = {
  generatedAt: string;
  mode: 'daily' | 'weekly';
  raw: NewsItem[];
  cleaned: NewsItem[];
  scored: ScoredNewsItem[];
  selectedIds: string[];
};
