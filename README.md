# 前端 / AI 工程日报与周报生成器（Phase-2）

一个面向长期维护的 Node.js + TypeScript 项目，用于自动生成：
- 每日 Markdown 日报
- 每周 Markdown 周报

项目目标是把分散在浏览器平台、前端工程、AI 工程中的高价值更新聚合成可执行的工程情报。

## 1) 快速开始

```bash
pnpm install
pnpm typecheck
pnpm build
pnpm daily
pnpm weekly
pnpm health
```

> 如果你所在环境无法访问外网源，流水线会优雅降级并继续生成报告（可能内容较少）。

## 2) 当前能力

- Source registry 管理（`src/config/sources.json`）
- RSS + HTML 两类抓取器（HTML 支持通用 parser + 站点覆写 parser map）
- 清洗、去重、打分（可调参数）
- 高质量日报与周报模板输出
- 存储层抽象：SQLite（默认）+ JSON fallback
- GitHub Actions 定时任务（日报/周报）

## 3) 目录结构

```text
.
├─ src/
│  ├─ config/sources.json
│  ├─ collectors/{rss.ts,html.ts,index.ts}
│  ├─ filters/index.ts
│  ├─ dedupe/index.ts
│  ├─ scoring/rules.ts
│  ├─ pipelines/{daily.ts,weekly.ts}
│  ├─ outputs/markdown.ts
│  ├─ storage/{types.ts,index.ts,json-store.ts,sqlite-store.ts}
│  ├─ types/news.ts
│  ├─ utils/{logger.ts,time.ts,text.ts}
│  ├─ llm/README.md
│  └─ main.ts
├─ scripts/sqlite_store.py
├─ .github/workflows/{daily-digest.yml,weekly-digest.yml}
├─ data/
├─ reports/
└─ AGENTS.md
```

## 4) Source Registry 说明

在 `src/config/sources.json` 中定义信息源。每个 source 包含：
- `id`
- `name`
- `category`
- `cadence` (`daily|weekly`)
- `weight`
- `fetch` (`rss|html`)
- `url`
- `enabled`
- `notes`（可选）

### 已接入源（Phase-2）

| Source | Fetch | Stability |
|---|---|---|
| web.dev | RSS | 高 |
| Chrome for Developers Blog | RSS | 高 |
| WebKit Blog | RSS | 高 |
| Anthropic Engineering | RSS | 中（偶发不稳定） |
| Frontend Focus | RSS | 高 |
| JavaScript Weekly | RSS | 高 |
| React Status | RSS | 高 |
| Bytes | RSS | 中（源结构可能变动） |
| Hugging Face Blog | RSS | 高 |
| Simon Willison | RSS/Atom | 高 |
| GitHub Blog AI & ML | RSS | 高 |
| OpenAI API Changelog | HTML parser map | 中（需关注页面结构变更） |
| OpenAI Codex Changelog | HTML parser map | 中（需关注页面结构变更） |

## 5) 如何新增一个信息源

1. 在 `src/config/sources.json` 新增 source。  
2. 优先配置 `fetch: rss`。  
3. 若 RSS 不稳定，改为 `fetch: html`，并在 `src/collectors/html.ts` 的 `siteParsers` 中注册站点 parser。  
4. 运行：
   ```bash
   pnpm typecheck && pnpm build && pnpm daily
   ```
5. 检查 `reports/` 和 `data/` 是否有预期输出。

## 6) 如何调试抓取失败

- 先看日志：`[WARN] RSS/HTML fetch failed ...`
- 检查 source URL 是否可访问
- 若为 HTML 源，优先检查 parser map 的提取规则
- 通过缩小时间窗口与单源开关 (`enabled: false`) 定位问题
- 环境网络受限时，允许降级输出（不会让流水线直接失败）

## 7) 存储说明（SQLite + JSON）

默认优先 SQLite（`data/news.db`），如果运行环境缺少 Python 或 SQLite 初始化失败，会自动回退到 JSON 文件存储。

可通过环境变量强制 JSON：

```bash
STORAGE_BACKEND=json pnpm daily
```

保存内容包括：
- 原始抓取结果
- 清洗后结果
- 打分结果
- 是否入选日报/周报
- 报告路径
- 生成时间

## 8) GitHub Actions

- `daily-digest.yml`
  - 定时：每天 `08:00 UTC`
  - 手动：`workflow_dispatch`
- `weekly-digest.yml`
  - 定时：每周日 `12:00 UTC`
  - 手动：`workflow_dispatch`

两个 workflow 都会：
1. checkout
2. 安装 pnpm + Node
3. 安装依赖
4. 运行日报/周报命令
5. 上传 `reports/` artifact

### 修改 cron

直接编辑 workflow 文件中 `on.schedule.cron`：
- `.github/workflows/daily-digest.yml`
- `.github/workflows/weekly-digest.yml`

## 9) 输出示例（节选）

日报包含：
- 今日最值得看
- 浏览器与平台
- AI 工程
- 其他补充
- 今日值得了解的 1 个概念
- 今日值得尝试的 1 个小实践

周报包含：
- 本周 3 个重点变化（含“对前端工程师意味着什么”）
- 本周最值得读的 5 篇
- 本周建议补的 2 个面试知识点
- 下周建议尝试的 3 个实践动作

## 10) 后续扩展方向

- 接入 OpenAI API 做摘要增强、趋势归纳、行动建议个性化
- 输出分发到飞书 / Telegram / 邮件
- 增加 source health dashboard 与失败重试策略
- 引入更精细的主题聚类与多语种支持

## 11) 近期升级（根据评审建议）

- 修复了 selection 持久化 runId 不一致的问题：现在 `markSelections` 与 `saveRun` 使用同一个 runId。
- 存储分层细化：JSON fallback 不再覆盖同一个 `items-latest.json`，而是按 stage 分文件保存。
- collector 增加了轻量重试与每源条数日志，方便排查“抓到了 0 条”的真实原因。
- workflow artifact 现同时上传 `reports/` 与 `data/`，便于回放与审计。


## 12) 测试

当前包含基础单元测试（text 规范化/相似度）：

```bash
pnpm build
pnpm test
```
