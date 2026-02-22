# Hannon Hill KB (Component System)

Local documentation site for Cascade CMS content, styled with a reusable component system.

## Project Structure

```
cascadecms-docs/
├── index.html                    Homepage
├── date-tool-essentials.html     Article
├── query-tool-directives.html    Article
├── velocity-best-practices.html  Article
├── component-showcase.html       Visual design system reference
└── _assets/                      CSS, JS, fonts, vendor assets
    ├── css/
    │   ├── tokens.css            Design tokens
    │   ├── reset.css / layout.css / typography.css
    │   └── components/           Per-component stylesheets
    ├── js/                       Behavior scripts
    ├── vendor/                   Prism.js, Lunr.js
    └── fonts/                    Mononoki font
```

## Pages

Local paths:

- Homepage: `index.html`
- Showcase: `component-showcase.html`
- Date Tool Essentials: `date-tool-essentials.html`
- Query Tool Directives: `query-tool-directives.html`
- Velocity Best Practices: `velocity-best-practices.html`

Published URLs:

- [Homepage](https://mattwren88.github.io/hannon-hill-kb/)
- [Component Showcase](https://mattwren88.github.io/hannon-hill-kb/component-showcase.html)
- [Date Tool Essentials](https://mattwren88.github.io/hannon-hill-kb/date-tool-essentials.html)
- [Query Tool Directives](https://mattwren88.github.io/hannon-hill-kb/query-tool-directives.html)
- [Velocity Best Practices](https://mattwren88.github.io/hannon-hill-kb/velocity-best-practices.html)

## Design System

Core tokens: `_assets/css/tokens.css`

Shared layout: `reset.css`, `layout.css`, `typography.css`

Component styles cover: sidebar, breadcrumb, TOC, cards, callouts, accordions, tabs, steps, tables, code blocks, tooltips, badges, buttons, theme toggle, search overlay, footer.

Component behaviors: sidebar mobile drawer, theme persistence (light/dark/system), search overlay, TOC generation, accordion, code-block copy/line-numbers, tab switching.

Use `component-showcase.html` as the canonical visual reference.

## Git Remote

- `origin`: `https://github.com/mattwren88/hannon-hill-kb.git`
- GitHub Pages: `https://mattwren88.github.io/hannon-hill-kb/`
