import type { PipelineWindow } from '../types/news.js';

export function createWindow(hoursBack: number): PipelineWindow {
  const to = new Date();
  const from = new Date(to.getTime() - hoursBack * 60 * 60 * 1000);
  return { from, to };
}

export function createDaysWindow(daysBack: number): PipelineWindow {
  return createWindow(daysBack * 24);
}

export function inWindow(input: string, window: PipelineWindow): boolean {
  const t = new Date(input).getTime();
  return Number.isFinite(t) && t >= window.from.getTime() && t <= window.to.getTime();
}

export function ymd(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function isoWeek(date = new Date()): { year: number; week: number } {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return { year: d.getUTCFullYear(), week };
}
