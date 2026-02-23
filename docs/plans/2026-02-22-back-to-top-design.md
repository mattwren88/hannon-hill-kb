# Back to Top Button — Design Doc

**Date:** 2026-02-22

## Overview

Add a "back to top" button that appears only when the user has scrolled down the page. Implemented entirely in CSS using `animation-timeline: scroll()` — no JavaScript required.

## Approach

**CSS scroll-driven animation (Option C)**

`animation-timeline: scroll()` drives the button's visibility based on document scroll position. At 0px scroll the button is invisible; past a threshold it fades in. Clicking scrolls back to the top via a plain `<a href="#top">` anchor.

## Visual Design

- Fixed position, bottom-right corner of viewport
- 40×40px circular button
- Uses existing design tokens: `--color-primary`, `--color-bg`, `--color-border`, `--shadow-md`
- Up-arrow SVG icon
- Fade in/out controlled by `@keyframes` + `animation-timeline: scroll(root)`
- `animation-fill-mode: both` keeps it hidden at top, visible when scrolled

## Behavior

- Hidden at page top (opacity 0, pointer-events none)
- Fades in after ~300px of scroll (expressed via `animation-range`)
- Click smooth-scrolls to top via native anchor behavior + CSS `scroll-behavior: smooth`
- `@media (prefers-reduced-motion: reduce)`: animation disabled; button always visible as static fallback

## Browser Support

`animation-timeline: scroll()` requires Chrome 115+, Firefox 110+, Safari 17.2+. On unsupported browsers the button never appears — a graceful no-op. Acceptable for an internal docs site.

## Files

| Action | File |
|--------|------|
| Create | `_assets/css/components/back-to-top.css` |
| Edit   | Each HTML page — add CSS `<link>`, `id="top"` on `<body>`, and `<a>` element before `</body>` |

## HTML Snippet (per page)

```html
<a href="#top" class="back-to-top" aria-label="Back to top">
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="18 15 12 9 6 15"></polyline>
  </svg>
</a>
```

`<body>` gets `id="top"`.
