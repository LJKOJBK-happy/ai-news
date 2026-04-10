import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { NewsItem, StoredRunData } from '../types/news.js';
import type { PersistedSelection, RunSavePayload, StorageAdapter } from './types.js';

const dataDir = path.resolve('data');
const runsDir = path.join(dataDir, 'runs');
const indexPath = path.join(dataDir, 'index.json');

async function ensureDirs(): Promise<void> {
  await mkdir(runsDir, { recursive: true });
}

async function readIndex(): Promise<string[]> {
  try {
    return JSON.parse(await readFile(indexPath, 'utf8')) as string[];
  } catch {
    return [];
  }
}

async function writeIndex(entries: string[]): Promise<void> {
  await writeFile(indexPath, JSON.stringify(entries, null, 2), 'utf8');
}

export class JsonStorageAdapter implements StorageAdapter {
  name: 'json' = 'json';

  async healthCheck(): Promise<boolean> {
    await ensureDirs();
    return true;
  }

  async saveRun(runId: string, payload: RunSavePayload): Promise<void> {
    await ensureDirs();
    const fileName = `${runId}.json`;
    await writeFile(path.join(runsDir, fileName), JSON.stringify(payload, null, 2), 'utf8');
    const index = await readIndex();
    if (!index.includes(fileName)) {
      index.push(fileName);
      await writeIndex(index);
    }
  }

  async readRecentRuns(mode: 'daily' | 'weekly', days: number): Promise<StoredRunData[]> {
    await ensureDirs();
    const index = await readIndex();
    const cutoff = Date.now() - days * 24 * 3600 * 1000;

    const runs: StoredRunData[] = [];
    for (const fileName of index) {
      try {
        const payload = JSON.parse(await readFile(path.join(runsDir, fileName), 'utf8')) as RunSavePayload;
        if (payload.mode !== mode) continue;
        if (new Date(payload.generatedAt).getTime() < cutoff) continue;
        runs.push({
          generatedAt: payload.generatedAt,
          mode: payload.mode,
          raw: payload.raw,
          cleaned: payload.cleaned,
          scored: payload.scored,
          selectedIds: payload.selectedIds,
        });
      } catch {
        continue;
      }
    }

    return runs.sort((a, b) => +new Date(b.generatedAt) - +new Date(a.generatedAt));
  }

  async upsertItems(items: NewsItem[], stage: 'raw' | 'cleaned' | 'scored'): Promise<void> {
    await ensureDirs();
    const file = path.join(dataDir, `items-${stage}-latest.json`);
    await writeFile(file, JSON.stringify(items, null, 2), 'utf8');
  }

  async markSelections(runId: string, selections: PersistedSelection[]): Promise<void> {
    await ensureDirs();
    const file = path.join(dataDir, `selections-${runId}.json`);
    await writeFile(file, JSON.stringify(selections, null, 2), 'utf8');
  }
}
