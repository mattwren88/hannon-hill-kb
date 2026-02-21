# Hannon Hill KB (Generator + Component System)

Local documentation site for Cascade CMS content, generated from `data.json` and styled with a reusable component system.

## What This Repo Does

- Generates docs pages into `docs/` from `data.json`
- Uses a shared design system in `_assets/css/components/`
- Supports three page types:
  - Homepage (`docs/index.html`)
  - Section landing pages (`docs/<section>/index.html`)
  - Article pages (`docs/<article.path>/index.html`)
- Builds search data at `docs/search-index.json`
- Includes scripts for downloading live KB HTML and building a review queue for migration work

## Project Structure

- `data.json`: Source content (articles)
- `docs/`: Generated output
- `_assets/`: CSS, JS, fonts, vendor assets
- `_examples/component-showcase.html`: Visual reference for components
- `scripts/generate-pages.mjs`: Main page generator
- `scripts/download-kb-html.mjs`: Download live KB HTML pages
- `scripts/build-kb-review-queue.mjs`: Match live downloads to local docs pages
- `scripts/apply-live-component-updates.mjs`: Apply component updates using the review queue

## Requirements

- Node.js 18+ (uses native `fetch`)

## Quick Start

Generate all pages:

```bash
node scripts/generate-pages.mjs
```

Generate only selected article paths:

```bash
node scripts/generate-pages.mjs --include-paths developing-in-cascade/script-formats/date-tool-essentials,developing-in-cascade/script-formats/query-tool-directives,developing-in-cascade/script-formats/velocity-best-practices
```

Dry run:

```bash
node scripts/generate-pages.mjs --dry-run
```

## Generator CLI (`scripts/generate-pages.mjs`)

```bash
node scripts/generate-pages.mjs [options]
```

Options:

- `--input <file>`: Input JSON (default: `data.json`)
- `--out <dir>`: Output directory (default: `docs`)
- `--dry-run`: Report actions only, no writes
- `--include-paths <csv>`: Only generate matching `articles[].path` values
- `--generate-home [true|false]`: Generate homepage (default: `true`)
- `--generate-landings [true|false]`: Generate section landing pages (default: `true`)

Notes:

- Search index output remains article-only.
- Generator is deterministic and rerunnable.
- Stale generated `index.html` files under `docs/` are pruned when no longer expected.

## Design System

Core tokens:

- `_assets/css/tokens.css`

Shared typography/layout:

- `_assets/css/reset.css`
- `_assets/css/layout.css`
- `_assets/css/typography.css`

Component style coverage:

- Navigation styles for header, sidebar trees, breadcrumb, and table of contents
- Content presentation styles for typography, tables, tabs, steps, and cards
- Utility UI styles for callouts, accordions, tooltips, badges/pills, and semantic buttons
- Code presentation styles for syntax blocks, copy actions, line-number gutter, and footer strip
- Site shell styles for theme toggle, search overlay, and global footer

Component behavior coverage:

- Sidebar expand/collapse behavior and mobile drawer handling
- Theme initialization + persisted light/dark/system switching
- Search overlay keyboard interactions and result rendering
- TOC generation from in-page headings
- Accordion interaction and legacy-to-details normalization
- Code block enhancements (copy to clipboard, line-number decoration)
- Tab switching for tabbed content and multi-language code samples

Use `_examples/component-showcase.html` as the canonical visual reference.

## Live KB Migration Workflow

1. Download live HTML:

```bash
node scripts/download-kb-html.mjs --out _downloads/hannonhill-kb
```

2. Build review queue:

```bash
node scripts/build-kb-review-queue.mjs --manifest _downloads/hannonhill-kb/manifest.json --docs-root docs --out-dir _downloads/hannonhill-kb
```

3. Apply component-oriented updates from queue:

```bash
node scripts/apply-live-component-updates.mjs --queue _downloads/hannonhill-kb/review-queue.json --download-root _downloads/hannonhill-kb --docs-root docs
```

Use `--dry-run` on scripts that support it before writing changes.

## Git Remote

This repo is configured with:

- `origin`: `https://github.com/mattwren88/hannon-hill-kb.git`

## Common Commands

Generate current 3-article script-format subset:

```bash
node scripts/generate-pages.mjs --include-paths developing-in-cascade/script-formats/date-tool-essentials,developing-in-cascade/script-formats/query-tool-directives,developing-in-cascade/script-formats/velocity-best-practices
```

Download and inspect only (no file writes):

```bash
node scripts/download-kb-html.mjs --dry-run
```

## Authoring Guidelines

- Prefer component classes over ad hoc inline styling.
- Keep content intact when refactoring structure.
- Use callouts/accordions/code-blocks consistently across articles.
- Run generator after structural/template changes to keep `docs/` in sync.
