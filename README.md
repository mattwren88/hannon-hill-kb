# Hannon Hill KB (Component System)

Local documentation site for Cascade CMS content, styled with a reusable component system.

## Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later)
- npm (included with Node.js)

## Getting Started

```bash
# Clone the repo
git clone https://github.com/mattwren88/hannon-hill-kb.git
cd hannon-hill-kb

# Install dependencies
npm install

# Build the CSS bundle
npm run build:css
```

Open `index.html` in a browser to view the site locally.

## Development

### CSS Build

All individual CSS files are bundled into a single `_assets/css/bundle.min.css` via [PostCSS](https://postcss.org/). The entry point is `_assets/css/main.css`, which imports every stylesheet in the correct load order.

**Build once:**

```bash
npm run build:css
```

**Watch for changes** (auto-rebuilds on save):

```bash
npm run watch:css
```

If you use VS Code, the watch task starts automatically when you open the project (configured in `.vscode/tasks.json`).

### Adding or Editing CSS

1. Edit the source files in `_assets/css/` (never edit `bundle.min.css` directly)
2. If adding a new CSS file, add an `@import` line to `_assets/css/main.css`
3. Run `npm run build:css` or let the watcher rebuild automatically

### PostCSS Plugins

The PostCSS config lives in `config/postcss.config.js` and uses:

- **postcss-import** — resolves `@import` statements into a single file
- **cssnano** — minifies the output

## Project Structure

```
cascadecms-docs/
├── index.html                    Homepage
├── velocity-tools.html           Article
├── date-tool-essentials.html     Article
├── query-tool-directives.html    Article
├── velocity-best-practices.html  Article
├── component-showcase.html       Visual design system reference
├── search-index.json             Lunr.js search index
├── package.json                  npm scripts and dependencies
├── config/
│   └── postcss.config.js         PostCSS plugin configuration
├── .vscode/
│   └── tasks.json                VS Code auto-build task
└── _assets/
    ├── css/
    │   ├── main.css              PostCSS entry (imports all stylesheets)
    │   ├── bundle.min.css        Built output (do not edit)
    │   ├── print.css             Print-only styles
    │   ├── tokens.css            Design tokens (light/dark themes)
    │   ├── reset.css / layout.css / typography.css
    │   └── components/           Per-component stylesheets
    ├── js/                       Behavior scripts
    ├── vendor/                   Prism.js, Lunr.js
    └── fonts/
        ├── mononoki/             Monospace code font
        └── plus-jakarta-sans/    Heading font (self-hosted)
```

## Pages

Local paths:

- Homepage: `index.html`
- Velocity Tools: `velocity-tools.html`
- Date Tool Essentials: `date-tool-essentials.html`
- Query Tool Directives: `query-tool-directives.html`
- Velocity Best Practices: `velocity-best-practices.html`
- Showcase: `component-showcase.html`

Published URLs:

- [Homepage](https://mattwren88.github.io/hannon-hill-kb/)
- [Velocity Tools](https://mattwren88.github.io/hannon-hill-kb/velocity-tools.html)
- [Date Tool Essentials](https://mattwren88.github.io/hannon-hill-kb/date-tool-essentials.html)
- [Query Tool Directives](https://mattwren88.github.io/hannon-hill-kb/query-tool-directives.html)
- [Velocity Best Practices](https://mattwren88.github.io/hannon-hill-kb/velocity-best-practices.html)
- [Component Showcase](https://mattwren88.github.io/hannon-hill-kb/component-showcase.html)

## Design System

Core tokens: `_assets/css/tokens.css`

Shared layout: `reset.css`, `layout.css`, `typography.css`

Component styles cover: sidebar, breadcrumb, TOC, cards, callouts, accordions, tabs, steps, tables, code blocks, tooltips, badges, buttons, theme toggle, search overlay, footer.

Component behaviors: sidebar mobile drawer, theme persistence (light/dark/system), search overlay, TOC generation, accordion, code-block copy/line-numbers, tab switching.

Use `component-showcase.html` as the canonical visual reference.

## Git Remote

- `origin`: `https://github.com/mattwren88/hannon-hill-kb.git`
- GitHub Pages: `https://mattwren88.github.io/hannon-hill-kb/`
