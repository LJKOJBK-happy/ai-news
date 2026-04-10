export function normalizeUrl(url: string): string {
  try {
    const u = new URL(url.trim());
    u.hash = '';

    const blocked = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'ref', 'ref_src', 'fbclid', 'gclid', 'mc_cid', 'mc_eid'];
    blocked.forEach((key) => u.searchParams.delete(key));

    const params: Array<[string, string]> = [];
    u.searchParams.forEach((value, key) => params.push([key, value]));
    const sorted = params.sort(([a], [b]) => a.localeCompare(b));
    u.search = '';
    for (const [k, v] of sorted) {
      if (k.startsWith('utm_')) continue;
      u.searchParams.append(k, v);
    }

    return u.toString().replace(/\/$/, '').toLowerCase();
  } catch {
    return url.trim();
  }
}

export function slug(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80);
}

export function cleanTitle(title: string): string {
  return title
    .replace(/<[^>]+>/g, ' ')
    .replace(/[|｜]([^|｜]{0,40})$/g, '')
    .replace(/[【】\[\]]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeTitle(title: string): string {
  return cleanTitle(title)
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5\s]/g, ' ')
    .replace(/\b(the|a|an|to|for|and|of|in|on|with|from|by|vs)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function similarity(a: string, b: string): number {
  const sa = new Set(normalizeTitle(a).split(/\s+/).filter(Boolean));
  const sb = new Set(normalizeTitle(b).split(/\s+/).filter(Boolean));
  const intersection = [...sa].filter((x) => sb.has(x)).length;
  const union = new Set([...sa, ...sb]).size;
  return union === 0 ? 0 : intersection / union;
}

export function oneSentenceSummary(title: string, sourceName: string, category: string): string {
  if (category === 'frontend') return `${sourceName} 发布了「${title}」，重点可关注浏览器能力、工程实践或性能影响。`;
  if (category === 'ai-engineering') return `${sourceName} 更新了「${title}」，适合用于优化 AI 工程工具链与交付效率。`;
  return `${sourceName} 发布了「${title}」，值得快速评估其技术影响。`;
}

export function whyWorthReading(category: string, title: string, reason: string): string {
  if (category === 'frontend') return `和前端平台能力强相关：${title}。可直接用于性能、兼容性或可维护性决策（${reason}）。`;
  if (category === 'ai-engineering') return `和 AI 工程落地强相关：${title}。可用于改进 agent/tool/eval 实践（${reason}）。`;
  return `该更新具有跨栈参考价值，可辅助技术路线判断（${reason}）。`;
}
