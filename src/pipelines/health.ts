import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sources from '../config/sources.json' with { type: 'json' };
import type { SourceConfig } from '../types/news.js';
import { logger } from '../utils/logger.js';
import { ymd } from '../utils/time.js';

export async function runHealthCheck(): Promise<void> {
  const list = (sources as SourceConfig[]).filter((s) => s.enabled);
  const results = await Promise.all(list.map(async (source) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const res = await fetch(source.url, { signal: controller.signal, headers: { 'user-agent': 'ai-news-health/1.0' } });
      return { id: source.id, name: source.name, fetch: source.fetch, ok: res.ok, status: res.status, url: source.url };
    } catch (error) {
      return { id: source.id, name: source.name, fetch: source.fetch, ok: false, status: 0, url: source.url, error: String(error) };
    } finally {
      clearTimeout(timer);
    }
  }));

  const okCount = results.filter((r) => r.ok).length;
  const failCount = results.length - okCount;

  const reportDir = path.resolve('reports/health');
  await mkdir(reportDir, { recursive: true });
  const date = ymd();
  const mdPath = path.join(reportDir, `${date}.md`);
  const jsonPath = path.join(reportDir, `${date}.json`);

  const markdown = [
    `# Source Health Report - ${date}`,
    '',
    `- Total: ${results.length}`,
    `- OK: ${okCount}`,
    `- Failed: ${failCount}`,
    '',
    '## Details',
    '',
    ...results.map((r) => `- ${r.ok ? '✅' : '❌'} **${r.name}** (${r.id}) [${r.fetch}] - ${r.status || 'N/A'} - ${r.url}`),
  ].join('\n');

  await writeFile(mdPath, markdown, 'utf8');
  await writeFile(jsonPath, JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2), 'utf8');
  logger.info(`Health report generated: ${mdPath}`);
}
