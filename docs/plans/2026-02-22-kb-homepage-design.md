# KB Homepage Design

**Date:** 2026-02-22
**File modified:** `index.html`

## Problem

The existing `index.html` was a placeholder with a minimal 2-card grid and a project-navigation callout. It did not represent the actual Cascade CMS Knowledge Base homepage.

## Goal

Replace the placeholder with a proper KB homepage that mirrors the structure and content of the original Hannon Hill KB (`https://www.hannonhill.com/cascadecms/latest/`) while using the current design system tokens, components, and layout.

## Design Decisions

### Layout
- Kept `docs-layout--two-column` (sidebar + main, no TOC column) — correct for a homepage where no in-page TOC is needed.
- All `<head>` content, JS scripts, header, search overlay, and back-to-top button are unchanged.

### Sidebar
- Replaced the placeholder "Current Pages" section with 7 real KB top-level categories: Cascade Basics, Content Authoring, Design in Cascade, Developing in Cascade, Content Management, Cascade Administration, Resources.
- All categories are collapsed by default (`aria-expanded="false"`) on the homepage since no page is active.
- Placeholder `href="#"` for most links (prototype, not a live site). Real pages in the project (`date-tool-essentials.html`, `query-tool-directives.html`, `velocity-best-practices.html`, `component-showcase.html`) use real hrefs.

### Page Header
- Used compact `content__header` pattern (category label + h1 + description) consistent with all other doc pages.
- No jumbotron/hero — the compact header matches our design system and avoids the dated Bootstrap jumbotron pattern.

### Card Grid
- 9 cards in `card-grid--3col` using `card card--link` — all from `_assets/css/components/cards.css`.
- Each card has a stroke-based inline SVG icon (`viewBox="0 0 24 24"`, `stroke-width="2"`, no fill), matching the icon style used throughout the site.
- Cards stack to 1 column below 768px via the existing `cards.css` breakpoint.

### Featured Section
- Simple `<h2>Featured</h2>` + three `<h3>` + `<p>` pairs using standard typography — no new components.
- Mirrors the exact three articles from the original: Announcements, Velocity Tools, LDAP/Active Directory.

### Popular and New
- Two-column layout via `.two-col-lists` class defined in a `<style>` block in `<head>` (no utility class existed for this pattern in `utilities.css`).
- Collapses to single column at 768px.
- Real links used for pages that exist in the project; `#` for others.

## Components Reused

| Component | CSS file |
|---|---|
| `docs-layout--two-column` | `layout.css` |
| `card-grid--3col`, `card card--link` | `components/cards.css` |
| `sidebar__section`, `sidebar__category`, `sidebar__pages`, `sidebar__link` | `components/sidebar.css` |
| `content__header`, `content__category-label`, `content__title`, `content__description` | `typography.css` |
| `site-footer`, `site-footer__inner`, etc. | `components/footer.css` |
| `search-overlay` | `components/search.css` |
| `back-to-top` | `components/back-to-top.css` |
| `theme-toggle` | `components/theme-toggle.css` |
