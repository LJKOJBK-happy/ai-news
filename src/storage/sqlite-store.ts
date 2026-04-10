import path from 'node:path';
import { execFile } from 'node:child_process';
import type { NewsItem, StoredRunData } from '../types/news.js';
import { logger } from '../utils/logger.js';
import type { PersistedSelection, RunSavePayload, StorageAdapter } from './types.js';

const scriptPath = path.resolve('scripts/sqlite_store.py');
const dbPath = path.resolve('data/news.db');

function execPy(action: string, payload: Record<string, unknown>): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    execFile(
      'python3',
      [scriptPath, '--db', dbPath, '--action', action, '--payload', JSON.stringify(payload)],
      { timeout: 10_000 },
      (error, stdout) => {
        if (error) return reject(error);
        try {
          resolve(JSON.parse(stdout || '{}') as Record<string, unknown>);
        } catch (e) {
          reject(e);
        }
      },
    );
  });
}

export class SqliteStorageAdapter implements StorageAdapter {
  name: 'sqlite' = 'sqlite';

  async healthCheck(): Promise<boolean> {
    try {
      const result = await execPy('health', {});
      return Boolean(result.ok);
    } catch (error) {
      logger.warn(`SQLite storage unavailable, fallback suggested: ${String(error)}`);
      return false;
    }
  }

  async saveRun(runId: string, payload: RunSavePayload): Promise<void> {
    await execPy('save_run', { runId, generatedAt: payload.generatedAt, mode: payload.mode, reportPath: payload.reportPath, payload });
  }

  async readRecentRuns(mode: 'daily' | 'weekly', days: number): Promise<StoredRunData[]> {
    const result = await execPy('recent_runs', { mode, days });
    const runs = (result.runs ?? []) as RunSavePayload[];
    return runs.map((payload) => ({
      generatedAt: payload.generatedAt,
      mode: payload.mode,
      raw: payload.raw,
      cleaned: payload.cleaned,
      scored: payload.scored,
      selectedIds: payload.selectedIds,
    }));
  }

  async upsertItems(items: NewsItem[], stage: 'raw' | 'cleaned' | 'scored'): Promise<void> {
    await execPy('upsert_items', { items, stage });
  }

  async markSelections(runId: string, selections: PersistedSelection[]): Promise<void> {
    await execPy('mark_selections', { runId, selected: selections });
  }
}
