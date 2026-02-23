# Back to Top Button Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a CSS-only back-to-top button that fades in when the user scrolls down, using `animation-timeline: scroll()` with no JavaScript.

**Architecture:** A single `<a href="#top">` anchor fixed to the bottom-right corner of the viewport. Visibility is driven entirely by a CSS scroll-driven animation — `opacity` and `pointer-events` are animated via `animation-timeline: scroll(root)`, so the button appears only after the user has scrolled ~300px. No JS is needed because `scroll-behavior: smooth` is already set globally in `reset.css`.

**Tech Stack:** CSS `animation-timeline: scroll()`, CSS custom properties (design tokens), inline SVG icon, HTML anchor element.

---

### Task 1: Create the CSS component file

**Files:**
- Create: `_assets/css/components/back-to-top.css`

**Step 1: Create the file with this exact content**

```css
/* ==========================================================================
   Back to Top — Cascade CMS Knowledge Base
   Scroll-driven animation: fades in after user scrolls ~300px.
   Requires animation-timeline: scroll() (Chrome 115+, Firefox 110+, Safari 17.2+).
   On unsupported browsers the button never appears — graceful no-op.
   ========================================================================== */

@keyframes back-to-top-reveal {
    from {
        opacity: 0;
        pointer-events: none;
    }
    to {
        opacity: 1;
        pointer-events: auto;
    }
}

.back-to-top {
    position: fixed;
    bottom: var(--space-xl);
    right: var(--space-xl);
    z-index: calc(var(--z-sidebar) - 1);

    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: 50%;

    background: var(--color-bg);
    border: 1px solid var(--color-border);
    box-shadow: var(--shadow-md);
    color: var(--color-text-secondary);

    opacity: 0;
    pointer-events: none;

    animation: back-to-top-reveal linear both;
    animation-timeline: scroll(root);
    animation-range: 300px 400px;

    transition: background var(--transition-fast), color var(--transition-fast),
        border-color var(--transition-fast), box-shadow var(--transition-fast);
}

.back-to-top:hover {
    background: var(--color-bg-tertiary);
    color: var(--color-text);
    border-color: var(--color-primary);
    box-shadow: var(--shadow-lg);
}

.back-to-top svg {
    flex-shrink: 0;
}

/* Reduced motion: disable animation; button is always hidden (graceful no-op) */
@media (prefers-reduced-motion: reduce) {
    .back-to-top {
        animation: none;
        opacity: 0;
        pointer-events: none;
    }
}
```

**Step 2: Verify the file was created**

```bash
ls _assets/css/components/back-to-top.css
```
Expected: file listed with no error.

**Step 3: Commit**

```bash
git add _assets/css/components/back-to-top.css
git commit -m "feat: add back-to-top CSS component (scroll-driven animation)"
```

---

### Task 2: Add markup and CSS link to index.html

**Files:**
- Modify: `index.html`

**Step 1: Add the CSS link**

In `index.html`, find the last `<link>` tag (currently `transitions.css`) and add the new link after it:

```html
  <link rel="stylesheet" href="./_assets/css/transitions.css">
  <link rel="stylesheet" href="./_assets/css/components/back-to-top.css">
```

**Step 2: Add `id="top"` to `<body>`**

Find the opening `<body>` tag:
```html
<body>
```
Replace with:
```html
<body id="top">
```

**Step 3: Add the button element before `</body>`**

Find `</body>` and insert before it:

```html
  <a href="#top" class="back-to-top" aria-label="Back to top">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <polyline points="18 15 12 9 6 15"></polyline>
    </svg>
  </a>
</body>
```

**Step 4: Commit**

```bash
git add index.html
git commit -m "feat: add back-to-top button to index.html"
```

---

### Task 3: Add markup and CSS link to date-tool-essentials.html

**Files:**
- Modify: `date-tool-essentials.html`

Apply the same three changes as Task 2:
1. Add `<link rel="stylesheet" href="./_assets/css/components/back-to-top.css">` after `transitions.css` link
2. Add `id="top"` to `<body>`
3. Add the `<a href="#top" class="back-to-top" ...>` element before `</body>`

**Commit:**

```bash
git add date-tool-essentials.html
git commit -m "feat: add back-to-top button to date-tool-essentials.html"
```

---

### Task 4: Add markup and CSS link to query-tool-directives.html

**Files:**
- Modify: `query-tool-directives.html`

Apply the same three changes as Task 2.

**Commit:**

```bash
git add query-tool-directives.html
git commit -m "feat: add back-to-top button to query-tool-directives.html"
```

---

### Task 5: Add markup and CSS link to velocity-best-practices.html

**Files:**
- Modify: `velocity-best-practices.html`

Apply the same three changes as Task 2.

**Commit:**

```bash
git add velocity-best-practices.html
git commit -m "feat: add back-to-top button to velocity-best-practices.html"
```

---

### Task 6: Add markup and CSS link to component-showcase.html

**Files:**
- Modify: `component-showcase.html`

Apply the same three changes as Task 2.

**Commit:**

```bash
git add component-showcase.html
git commit -m "feat: add back-to-top button to component-showcase.html"
```

---

### Task 7: Manual verification

Open each page in a browser and confirm:

1. At page top — button is **not visible**
2. Scroll down ~300px — button **fades in**
3. Click button — page **smooth-scrolls to top**
4. Button **fades out** as page returns to top
5. In browser DevTools, set `prefers-reduced-motion: reduce` — button remains **invisible** at all scroll positions
