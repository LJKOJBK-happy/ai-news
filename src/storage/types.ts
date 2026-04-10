import type { NewsItem, ScoredNewsItem, StoredRunData } from '../types/news.js';

export type PersistedSelection = {
  itemId: string;
  selectedFor: 'daily' | 'weekly';
};

export type RunSavePayload = StoredRunData & {
  reportPath: string;
  selected: PersistedSelection[];
  sourceStats?: {
    totalFetched: number;
    afterFilter: number;
    afterDedupe: number;
    selected: number;
  };
};

export interface StorageAdapter {
  name: 'json' | 'sqlite';
  saveRun(runId: string, payload: RunSavePayload): Promise<void>;
  readRecentRuns(mode: 'daily' | 'weekly', days: number): Promise<StoredRunData[]>;
  upsertItems(items: NewsItem[], stage: 'raw' | 'cleaned' | 'scored'): Promise<void>;
  markSelections(runId: string, selections: PersistedSelection[]): Promise<void>;
  healthCheck(): Promise<boolean>;
}

export type ScoredRow = ScoredNewsItem;
