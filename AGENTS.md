# AGENTS Guidelines

## Project Goal
Build and evolve a maintainable Frontend / AI Engineering digest generator that produces high-signal daily and weekly Markdown reports.

## Code Organization Principles
- Keep modules focused: collectors, filters, dedupe, scoring, outputs, pipelines, storage.
- Prefer small composable functions over large procedural blocks.
- Preserve type safety in `src/types` and avoid leaking loosely-typed objects across boundaries.

## Constraints for Changes
- Do incremental edits; avoid rewrites unless necessary.
- Keep collectors resilient: source failure must not fail the whole pipeline.
- Any new scoring/filter logic should expose clear, tunable constants.
- Do not hardcode brittle parsing logic in pipeline files.

## How to Add a Source Adapter
1. Add source metadata in `src/config/sources.json`.
2. Choose fetch mode (`rss` first, then `html`).
3. For HTML sources, register parser in `src/collectors/html.ts` parser map.
4. Add/adjust filtering or scoring keywords only if necessary.
5. Run `pnpm typecheck && pnpm build && pnpm daily`.

## Validation Checklist
- `pnpm typecheck`
- `pnpm build`
- `pnpm daily`
- `pnpm weekly`
- Confirm new entries appear in `reports/` and run data persists in storage backend.
