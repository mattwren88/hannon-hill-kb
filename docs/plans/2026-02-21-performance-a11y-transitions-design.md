# Design: Performance, Accessibility, DRY Cleanup & Page Transitions

**Date:** 2026-02-21
**Status:** Approved

---

## Context

The Cascade CMS Knowledge Base docs site is a well-architected static documentation site with a clean CSS token system, lean vanilla JS, and solid accessibility foundations. This design covers four incremental improvements:

1. **Page transitions** — Progressive enhancement using the View Transitions API to animate only the `<main>` content area between page navigations
2. **Performance** — Targeted font/resource loading improvements
3. **DRY cleanup** — Conservative consolidation of repeated patterns in the generator and JS
4. **Accessibility gaps** — Targeted audit and fixes for ARIA, focus, and contrast issues

No structural changes to the CSS architecture, JS module system, or build pipeline.

---

## 1. Page Transitions (View Transitions API)

### Approach
Add a new `_assets/css/transitions.css` and a minimal `_assets/js/transitions.js`. The CSS uses the native `@view-transition` rule with a named `view-transition-name` on `<main>`. No JS routing required — the browser handles cross-document transitions natively.

### Animation
**Fade + subtle slide up** — old content fades out while drifting slightly up, new content fades in from slightly below.

```css
@view-transition { navigation: auto; }

@keyframes vt-slide-out {
  to { opacity: 0; transform: translateY(-6px); }
}
@keyframes vt-slide-in {
  from { opacity: 0; transform: translateY(8px); }
}

::view-transition-old(main-content) {
  animation: 200ms ease-out vt-slide-out;
}
::view-transition-new(main-content) {
  animation: 250ms ease-out vt-slide-in;
}

@media (prefers-reduced-motion: reduce) {
  ::view-transition-old(main-content),
  ::view-transition-new(main-content) { animation: none; }
}
```

### Scope
- Only `<main>` animates — sidebar, header, TOC remain static
- `view-transition-name: main-content` added to `main` selector in `layout.css`
- `transitions.css` linked in `index.html` and generator template in `generate-pages.mjs`
- `transitions.js` handles scroll-to-top after navigation (one edge case the API doesn't auto-handle)
- Fallback: unsupported browsers (Firefox < 130) get instant navigation, no JS required

---

## 2. Performance Enhancements

### Changes
- **`<link rel="preconnect" href="https://fonts.googleapis.com">`** — add to `<head>` in both `index.html` and the generator template; reduces DNS + TLS latency for Poppins
- **`font-display: optional`** on Mononoki `@font-face` declarations — eliminates layout shift on slow connections; the system monospace fallback is acceptable
- **`loading="lazy"`** — add to any `<img>` elements in generated page templates
- **Verify `content-visibility: auto`** — confirm it's applied consistently on `.page-content` in `layout.css` (already partially in use)

No bundling, no minification — this stays as-is per conservative scope.

---

## 3. DRY Code Cleanup (Conservative)

### `generate-pages.mjs` — extract `buildHead()` helper
The `<head>` block with 14 `<link>` and 8 `<script>` tags is currently inlined in the page template string. Extract to a `buildHead(options)` function so adding/removing assets happens in one place. Options can include `{ rootPath }` for relative path adjustment.

### `index.html` — align with generator head ordering
The root `index.html` maintains a parallel asset list manually. After `buildHead()` is established, document the canonical ordering in a comment so manual edits stay in sync.

### `sidebar.js` + `toc.js` — shared scroll utility
Both files independently track scroll position. Extract a one-liner `getScrollY()` into the file that needs it (or a tiny inline arrow function) — minor cleanup, not a shared module.

### CSS — no changes needed
The token system is already clean. No significant duplication found.

---

## 4. Accessibility Fixes

### Specific items to audit and fix

| Area | Fix |
|------|-----|
| Heading hierarchy | Audit generated article templates — ensure no h1→h3 skips |
| `<main>` on all pages | Verify generator emits `<main id="main-content">` (not just `index.html`) |
| Search results ARIA | Add `role="listbox"` to results container, `role="option"` to each result in `search.js` |
| `aria-live` on search | Add `aria-live="polite"` + `aria-atomic="true"` to a result-count element so screen readers announce changes |
| Focus indicators | Audit `_assets/css/` for any `outline: none` / `outline: 0` without replacement; add `:focus-visible` rules where missing |
| Color contrast | Spot-check `--text-muted` in light and dark themes against their backgrounds |
| TOC toggle button | Verify `aria-expanded` is toggled correctly and button has a visible accessible label |

---

## Files to Create or Modify

| File | Action |
|------|--------|
| `_assets/css/transitions.css` | **Create** — View Transitions styles |
| `_assets/js/transitions.js` | **Create** — scroll-reset after navigation |
| `_assets/css/layout.css` | **Edit** — add `view-transition-name: main-content` to `main` |
| `index.html` | **Edit** — add `<link>` for transitions.css, preconnect hints |
| `scripts/generate-pages.mjs` | **Edit** — extract `buildHead()`, add transitions.css + preconnect to template |
| `_assets/js/search.js` | **Edit** — add `aria-live`, `role="listbox"`, `role="option"` |
| `_assets/js/toc.js` | **Edit** — verify/fix `aria-expanded` on toggle |
| `_assets/css/` (multiple) | **Edit** — fix any `outline: none` without `:focus-visible` replacement |
| `_assets/fonts/` CSS | **Edit** — `font-display: optional` on Mononoki |

---

## Verification

1. **Page transitions** — navigate between docs pages in Chrome/Edge; confirm `<main>` animates, sidebar/header do not; test with `prefers-reduced-motion: reduce` in DevTools (animation should be suppressed); test in Firefox (should fall back to instant navigation)
2. **Performance** — run Lighthouse on a generated page before/after; confirm no regressions; check Network tab for font preconnect timing
3. **DRY** — run `node scripts/generate-pages.mjs --dry-run` after refactor; confirm output is identical to before
4. **Accessibility** — run axe DevTools or browser accessibility audit on `index.html` and one generated article page; confirm zero new violations; manually tab through page and verify focus indicators are visible throughout
