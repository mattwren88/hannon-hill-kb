# Cascade CMS Knowledge Base

Documentation site for Cascade CMS, built with a hand-crafted component system using vanilla CSS, vanilla JavaScript, and static HTML.

## Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- npm (included with Node.js)

## Getting Started

```bash
git clone https://github.com/mattwren88/hannon-hill-kb.git
cd hannon-hill-kb
npm install
npm run build:css
```

Open `index.html` in a browser to view the site locally.

## Development

### CSS Build

All source CSS files are bundled into `_assets/css/bundle.min.css` via [PostCSS](https://postcss.org/). The entry point is `_assets/css/main.css`, which imports every stylesheet in the correct load order.

```bash
npm run build:css       # Build once
npm run watch:css       # Watch for changes (auto-rebuilds on save)
```

If you use VS Code, the watch task starts automatically when you open the project (configured in `.vscode/tasks.json`).

### Adding or Editing CSS

1. Edit the source files in `_assets/css/` (never edit `bundle.min.css` directly)
2. If adding a new CSS file, add an `@import` line to `_assets/css/main.css`
3. Run `npm run build:css` or let the watcher rebuild automatically

### PostCSS Plugins

Config: `config/postcss.config.js`

- **postcss-import** — resolves `@import` statements into a single file
- **cssnano** — minifies the output

## Project Structure

```
cascadecms-docs/
├── index.html                       Homepage
├── velocity-tools.html              Article
├── date-tool-essentials.html        Article
├── query-tool-directives.html       Article
├── velocity-best-practices.html     Article
├── component-showcase.html          Visual design system reference
├── search-index.json                Lunr.js pre-built search index
├── package.json                     npm scripts and dependencies
├── config/
│   └── postcss.config.js            PostCSS plugin configuration
├── .vscode/
│   └── tasks.json                   VS Code auto-build task
├── docs/
│   └── plans/                       Design planning documents
└── _assets/
    ├── css/                         Stylesheets (source)
    │   ├── main.css                 PostCSS entry point (imports all files)
    │   ├── bundle.min.css           Built output — do not edit
    │   ├── tokens.css               Design tokens (colors, spacing, typography, light/dark themes)
    │   ├── reset.css                Minimal CSS reset (box-sizing, smooth scroll, antialiasing)
    │   ├── layout.css               3-column grid, header, sidebar, TOC, responsive breakpoints
    │   ├── typography.css           Headings, body text, links, lists, blockquotes, code, pagination
    │   ├── utilities.css            Helpers: sr-only, text alignment, margins, display
    │   ├── transitions.css          View Transitions API (page-to-page fade/slide)
    │   ├── print.css                Print stylesheet (single column, expanded accordions)
    │   └── components/              Per-component stylesheets (see below)
    ├── js/                          Behavior scripts (see below)
    ├── fonts/
    │   ├── mononoki/                Monospace code font (SIL OFL)
    │   └── plus-jakarta-sans/       Heading font (SIL OFL)
    └── vendor/
        ├── prism/                   Syntax highlighting (MIT)
        ├── lunr/                    Full-text search (MIT)
        └── NOTICES                  Third-party license attributions
```

## CSS Architecture

### Design Tokens (`tokens.css`)

All colors, spacing, typography, shadows, borders, and z-index values are defined as CSS custom properties on `:root`. Light and dark themes are handled via `html[data-theme="light"]` and `html[data-theme="dark"]` selectors. No hardcoded values in component files — everything references tokens.

### Naming Convention

All classes use **flat/kebab-case** with an `hh-` namespace prefix on component names:

```
.hh-sidebar              Block (component root)
.hh-sidebar-category     Element (child of block)
.hh-card-active          Modifier (variant of block)
```

Utility classes (`.sr-only`, `.text-center`, `.mt-lg`, `.hidden`, `.flex`) are unprefixed.

### Component Stylesheets

Each component has its own file in `_assets/css/components/`:

| File | Component | Description |
|------|-----------|-------------|
| `accordion.css` | `hh-accordion` | Collapsible sections using native `<details>/<summary>` |
| `back-to-top.css` | `hh-back-to-top` | Scroll-driven reveal button (`animation-timeline: scroll()`) |
| `badges.css` | `hh-badge`, `hh-pill` | Inline status indicators with color variants |
| `breadcrumb.css` | `hh-breadcrumb` | Navigation breadcrumb trail |
| `buttons.css` | `hh-btn` | Button styles with info/warning/tip/danger variants |
| `callout.css` | `hh-callout` | Admonition boxes (info, warning, tip, danger) |
| `cards.css` | `hh-card`, `hh-card-grid` | Link cards with icons in 2/3-column grids |
| `code-block.css` | `hh-code-block` | Syntax-highlighted code with copy button, line numbers, tabs |
| `footer.css` | `hh-site-footer` | Site footer with social links and copyright |
| `search.css` | `hh-search-overlay` | Cmd+K search modal with result highlighting |
| `sidebar.css` | `hh-sidebar` | Collapsible navigation sidebar with active state |
| `steps.css` | `hh-steps` | Numbered step-by-step instructions |
| `table.css` | `hh-table` | Styled tables with striped/bordered variants |
| `tabs.css` | `hh-tabs` | Tab panels with keyboard navigation |
| `theme-toggle.css` | `hh-theme-toggle` | Light/dark/system theme dropdown |
| `toc.css` | `hh-toc` | Table of contents with scroll spy |
| `tooltip.css` | `hh-tooltip` | CSS-only tooltips via `data-tooltip` attribute |

## JavaScript

All scripts are vanilla JS (no frameworks, no bundler). Each file is a self-contained IIFE.

| File | Purpose |
|------|---------|
| `theme-init.js` | Inlined in `<head>` to prevent flash of unstyled content — reads theme from localStorage |
| `theme.js` | Theme toggle dropdown (light/dark/system) with localStorage persistence |
| `sidebar.js` | Sidebar category expand/collapse, mobile drawer with overlay and focus trap |
| `search.js` | Cmd+K/Ctrl+K search overlay with Lunr.js, debounced input, keyboard navigation |
| `toc.js` | Auto-generates table of contents from h2/h3 headings, IntersectionObserver scroll spy |
| `accordion.js` | Upgrades legacy accordion markup to native `<details>/<summary>` |
| `tabs.js` | Tab switching with arrow key navigation for both `hh-tabs` and `hh-code-block` tabs |
| `code-block.js` | Copy-to-clipboard button and line number generation |
| `heading-anchor.js` | Adds anchor links to headings with click-to-copy URL |

## Fonts

Both fonts are self-hosted and licensed under the [SIL Open Font License](https://openfontlicense.org/):

- **Plus Jakarta Sans** — Heading font (600–700 weight, WOFF2). Designed by Gumpita Rahayu / Tokotype.
- **Mononoki** — Monospace code font (Regular, Italic, Bold, BoldItalic in OTF+TTF). Designed by Matthias Tellen.

License files are included in each font directory.

## Vendor Libraries

Bundled in `_assets/vendor/` with license attributions in `_assets/vendor/NOTICES`:

- **[Prism.js](https://prismjs.com/)** (MIT) — Syntax highlighting for Velocity, Java, JavaScript, CSS, HTML, Python, JSON, Bash, YAML, SQL, XML, PHP
- **[Lunr.js](https://lunrjs.com/)** (MIT) — Client-side full-text search. Index data lives in `search-index.json`.

## Pages

| Page | Local Path | Description |
|------|-----------|-------------|
| Homepage | `index.html` | Category cards, featured articles, popular/new lists |
| Velocity Tools | `velocity-tools.html` | Velocity tool reference for Cascade CMS |
| Date Tool Essentials | `date-tool-essentials.html` | DateTool formatting guide |
| Query Tool Directives | `query-tool-directives.html` | QueryTool directive reference |
| Velocity Best Practices | `velocity-best-practices.html` | Coding standards and patterns |
| Component Showcase | `component-showcase.html` | Visual reference for every component in the design system |

Published: [mattwren88.github.io/hannon-hill-kb](https://mattwren88.github.io/hannon-hill-kb/)

## Git Remote

- `origin`: `https://github.com/mattwren88/hannon-hill-kb.git`
- GitHub Pages: `https://mattwren88.github.io/hannon-hill-kb/`
