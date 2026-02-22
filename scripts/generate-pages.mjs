#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

function parseArgs(argv) {
  const args = {
    input: "data.json",
    out: "docs",
    dryRun: false,
    includePaths: null,
    generateHome: true,
    generateLandings: true,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];

    if (token === "--dry-run") {
      args.dryRun = true;
      continue;
    }

    if (token === "--input") {
      args.input = argv[i + 1];
      i += 1;
      continue;
    }

    if (token === "--out") {
      args.out = argv[i + 1];
      i += 1;
      continue;
    }

    if (token === "--include-paths") {
      const raw = argv[i + 1];
      if (typeof raw !== "string") {
        throw new Error("Missing value for --include-paths");
      }
      const parts = raw.split(",");
      const normalized = parts.map((part) => normalizeArticlePath(part));
      if (normalized.some((part) => part.length === 0)) {
        throw new Error('Invalid --include-paths value: empty path token found. Use a comma-separated list of non-empty paths.');
      }
      args.includePaths = normalized;
      i += 1;
      continue;
    }

    if (token === "--generate-home") {
      const next = argv[i + 1];
      if (typeof next === "string" && !next.startsWith("--")) {
        args.generateHome = parseBooleanArg(next, "--generate-home");
        i += 1;
      } else {
        args.generateHome = true;
      }
      continue;
    }

    if (token === "--generate-landings") {
      const next = argv[i + 1];
      if (typeof next === "string" && !next.startsWith("--")) {
        args.generateLandings = parseBooleanArg(next, "--generate-landings");
        i += 1;
      } else {
        args.generateLandings = true;
      }
      continue;
    }

    throw new Error(`Unknown argument: ${token}`);
  }

  if (!args.input) throw new Error("Missing value for --input");
  if (!args.out) throw new Error("Missing value for --out");
  return args;
}

function parseBooleanArg(raw, flag) {
  const value = String(raw || "").trim().toLowerCase();
  if (value === "true") return true;
  if (value === "false") return false;
  throw new Error(`Invalid value for ${flag}: ${raw}. Expected true or false.`);
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function titleCaseFromSegment(segment) {
  return segment
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function decodeEntities(value) {
  return String(value)
    .replace(/&#160;|&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function normalizeWhitespace(value) {
  return value.replace(/\r\n/g, "\n").replace(/\t/g, "  ");
}

function cleanText(value) {
  return normalizeWhitespace(decodeEntities(String(value)))
    .replace(/[ \u00a0]+/g, " ")
    .trim();
}

function isUnorderedLine(line) {
  return /^[-*•]\s+/.test(line.trim());
}

function isOrderedLine(line) {
  return /^\d+[.)]\s+/.test(line.trim());
}

function stripListMarker(line) {
  return line.replace(/^([-*•]|\d+[.)])\s+/, "").trim();
}

function splitContentToParagraphsAndLists(raw) {
  const normalized = normalizeWhitespace(String(raw || ""));
  const groups = normalized.split(/\n\s*\n/).map((g) => g.trim()).filter(Boolean);
  const blocks = [];

  for (const group of groups) {
    const lines = group.split("\n").map((line) => line.trim()).filter(Boolean);
    if (lines.length === 0) continue;

    const unordered = lines.every(isUnorderedLine);
    if (unordered) {
      blocks.push({
        type: "ul",
        items: lines.map((line) => stripListMarker(cleanText(line))).filter(Boolean),
      });
      continue;
    }

    const ordered = lines.every(isOrderedLine);
    if (ordered) {
      blocks.push({
        type: "ol",
        items: lines.map((line) => stripListMarker(cleanText(line))).filter(Boolean),
      });
      continue;
    }

    const paragraphText = cleanText(lines.join(" "));
    if (paragraphText) blocks.push({ type: "p", text: paragraphText });
  }

  return blocks;
}

function toPosixPath(value) {
  return String(value).split(path.sep).join("/");
}

function normalizeArticlePath(value) {
  return toPosixPath(String(value || ""))
    .trim()
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");
}

function relativeHref(fromDir, toDir) {
  const rel = toPosixPath(path.relative(fromDir, toDir));
  if (!rel) return "./";
  return rel.endsWith("/") ? rel : `${rel}/`;
}

function assetPrefix(depthSegments) {
  return "../".repeat(depthSegments + 1);
}

function searchIndexPrefix(depthSegments) {
  return "../".repeat(depthSegments);
}

function homeHref(depthSegments) {
  return `${"../".repeat(depthSegments)}./`;
}

function normalizeLanguage(language) {
  const raw = String(language || "").trim().toLowerCase();
  if (!raw) return "none";
  const known = new Set([
    "markup",
    "html",
    "xml",
    "css",
    "javascript",
    "js",
    "json",
    "bash",
    "shell",
    "yaml",
    "yml",
    "sql",
    "velocity",
    "java",
    "python",
    "php",
  ]);
  if (!known.has(raw)) return "none";
  if (raw === "js") return "javascript";
  if (raw === "shell") return "bash";
  if (raw === "yml") return "yaml";
  if (raw === "html") return "markup";
  return raw;
}

function codeTitle(language) {
  const lang = normalizeLanguage(language);
  if (lang === "none") return "Plain Text";
  return lang.charAt(0).toUpperCase() + lang.slice(1);
}

function renderCodeBlocks(section, pageId, sectionIndex) {
  const items = Array.isArray(section.codeBlocks) ? section.codeBlocks : [];
  const rendered = [];

  for (let i = 0; i < items.length; i += 1) {
    const block = items[i] || {};
    const code = String(block.code || "");
    const explanation = cleanText(block.explanation || "");
    const hasCode = code.trim().length > 0;

    if (!hasCode && !explanation) continue;

    if (hasCode) {
      const language = normalizeLanguage(block.language);
      const blockId = `${pageId}-s${sectionIndex + 1}-c${i + 1}`;
      rendered.push(`
<div class="code-block">
  <div class="code-block__header">
    <span class="code-block__language">${escapeHtml(codeTitle(block.language))}</span>
    <button class="code-block__copy" aria-label="Copy code" data-copy-target="${escapeHtml(blockId)}">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"></path></svg>
      <span>Copy</span>
    </button>
  </div>
  <pre class="code-block__pre"><code id="${escapeHtml(blockId)}" class="language-${escapeHtml(language)}">${escapeHtml(code)}</code></pre>
</div>`.trim());
    }

    if (explanation) {
      rendered.push(`<p>${escapeHtml(explanation)}</p>`);
    }
  }

  return rendered.join("\n");
}

function renderSectionContent(section, pageId, sectionIndex) {
  const parts = [];
  const cloudText = cleanText(section.isCloud || "");
  if (cloudText) {
    parts.push(`
<div class="callout callout--info">
  <div class="callout__icon">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
  </div>
  <div class="callout__content">
    <p class="callout__title">Cloud</p>
    <p>${escapeHtml(cloudText)}</p>
  </div>
</div>`.trim());
  }

  const blocks = splitContentToParagraphsAndLists(section.content || "");
  for (const block of blocks) {
    if (block.type === "p") {
      parts.push(`<p>${escapeHtml(block.text)}</p>`);
      continue;
    }
    const itemHtml = block.items.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
    if (block.type === "ul") parts.push(`<ul>${itemHtml}</ul>`);
    if (block.type === "ol") parts.push(`<ol>${itemHtml}</ol>`);
  }

  const codeHtml = renderCodeBlocks(section, pageId, sectionIndex);
  if (codeHtml) parts.push(codeHtml);
  return parts.join("\n");
}

function buildSectionModels(articles) {
  const map = new Map();

  for (const article of articles) {
    const segment = article.path.split("/").filter(Boolean)[0] || "misc";
    if (!map.has(segment)) {
      map.set(segment, {
        key: segment,
        label: titleCaseFromSegment(segment),
        path: segment,
        articles: [],
        count: 0,
      });
    }
    map.get(segment).articles.push(article);
  }

  const sections = [...map.values()]
    .map((section) => {
      const sorted = section.articles.slice().sort((a, b) => a.title.localeCompare(b.title));
      return {
        ...section,
        articles: sorted,
        count: sorted.length,
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label));

  return sections;
}

function buildHomePageModel(sections) {
  const totalArticles = sections.reduce((sum, section) => sum + section.count, 0);
  return {
    title: "Cascade CMS Knowledge Base",
    description: `Browse ${totalArticles} documentation article${totalArticles === 1 ? "" : "s"} across ${sections.length} section${sections.length === 1 ? "" : "s"}.`,
    sections,
    totalArticles,
  };
}

function buildSectionLandingModels(sections) {
  return sections.map((section) => ({
    ...section,
    title: section.label,
    description: `${section.count} article${section.count === 1 ? "" : "s"} in ${section.label}.`,
  }));
}

function buildSearchIndexDoc(article) {
  const categorySegment = article.path.split("/").filter(Boolean)[0] || "misc";
  const category = titleCaseFromSegment(categorySegment);
  const sections = Array.isArray(article.sections) ? article.sections : [];
  const body = sections
    .map((section) => {
      const header = cleanText(section.header || "");
      const content = cleanText(section.content || "");
      const explanation = (Array.isArray(section.codeBlocks) ? section.codeBlocks : [])
        .map((block) => cleanText(block.explanation || ""))
        .filter(Boolean)
        .join(" ");
      return [header, content, explanation].filter(Boolean).join(" ");
    })
    .join(" ")
    .replace(/[ \u00a0]+/g, " ")
    .trim();

  return {
    id: slugify(article.path),
    title: article.title,
    category,
    body,
    url: `/${toPosixPath(article.path).replace(/^\/+/, "").replace(/\/+$/, "")}/`,
  };
}

function renderSidebar(active, sections, pageDir, siteRootDir) {
  return sections
    .map((section) => {
      const sectionDir = path.join(siteRootDir, section.path);
      const sectionHref = relativeHref(pageDir, sectionDir);
      const sectionActive = active.type === "landing" && active.sectionKey === section.key;
      const articleActive = active.type === "article" && active.sectionKey === section.key;
      const hasActive = sectionActive || articleActive;

      const pageLinks = [
        `<li><a href="${escapeHtml(sectionHref)}" class="sidebar__link${sectionActive ? " sidebar__link--active" : ""}"${sectionActive ? ' aria-current="page"' : ""}>${escapeHtml(section.label)} Overview</a></li>`,
        ...section.articles.map((article) => {
          const isActive = active.type === "article" && active.articlePath === article.path;
          const href = relativeHref(pageDir, path.join(siteRootDir, ...article.path.split("/")));
          return `<li><a href="${escapeHtml(href)}" class="sidebar__link${isActive ? " sidebar__link--active" : ""}"${isActive ? ' aria-current="page"' : ""}>${escapeHtml(article.title)}</a></li>`;
        }),
      ].join("\n");

      return `
<div class="sidebar__section">
  <button class="sidebar__category" aria-expanded="${hasActive ? "true" : "false"}">
    ${escapeHtml(section.label)}
    <svg class="sidebar__chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
  </button>
  <ul class="sidebar__pages"${hasActive ? "" : " hidden"}>
    ${pageLinks}
  </ul>
</div>`.trim();
    })
    .join("\n");
}

function renderBreadcrumb(parts, depth) {
  const listItems = [
    `<li class="breadcrumb__item"><a href="${escapeHtml(homeHref(depth))}" class="breadcrumb__link">Home</a></li>`,
    ...parts.map((part, index) => {
      const isLast = index === parts.length - 1;
      if (isLast || !part.href) {
        return `<li class="breadcrumb__item${isLast ? " breadcrumb__item--current" : ""}"${isLast ? ' aria-current="page"' : ""}>${escapeHtml(part.label)}</li>`;
      }
      return `<li class="breadcrumb__item"><a href="${escapeHtml(part.href)}" class="breadcrumb__link">${escapeHtml(part.label)}</a></li>`;
    }),
  ].join("\n    ");

  return `
<nav class="breadcrumb" aria-label="Breadcrumb">
  <ol class="breadcrumb__list">
    ${listItems}
  </ol>
</nav>`.trim();
}

function renderPagination(currentArticle, articles, pageDir, siteRootDir) {
  const index = articles.findIndex((item) => item.path === currentArticle.path);
  const previous = index > 0 ? articles[index - 1] : null;
  const next = index >= 0 && index < articles.length - 1 ? articles[index + 1] : null;

  function renderItem(item, cls, label) {
    if (!item) return `<span class="${cls}" aria-disabled="true"><span>${label}</span><span>None</span></span>`;
    const href = relativeHref(pageDir, path.join(siteRootDir, ...item.path.split("/")));
    return `<a href="${escapeHtml(href)}" class="${cls}"><span>${label}</span><span>${escapeHtml(item.title)}</span></a>`;
  }

  return `
<footer class="content__footer">
  <div class="content__meta">
    <span>Last updated: ${escapeHtml(new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }))}</span>
  </div>
  <nav class="content__pagination">
    ${renderItem(previous, "content__prev", "Previous")}
    ${renderItem(next, "content__next", "Next")}
  </nav>
</footer>`.trim();
}

function renderSharedHead({ title, description, assetRoot, includeTocCss }) {
  return `<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)} - Cascade CMS Knowledge Base</title>
  <meta name="description" content="${escapeHtml(description)}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@600;700&display=swap" rel="stylesheet">
  <script>
  (function () {
    var pref = localStorage.getItem('theme-preference');
    var theme;
    if (pref === 'dark') { theme = 'dark'; }
    else if (pref === 'light') { theme = 'light'; }
    else { theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'; }
    document.documentElement.setAttribute('data-theme', theme);
  })();
  </script>
  <link rel="stylesheet" href="${assetRoot}_assets/css/tokens.css">
  <link rel="stylesheet" href="${assetRoot}_assets/css/reset.css">
  <link rel="stylesheet" href="${assetRoot}_assets/css/layout.css">
  <link rel="stylesheet" href="${assetRoot}_assets/css/typography.css">
  <link rel="stylesheet" href="${assetRoot}_assets/css/components/sidebar.css">
  ${includeTocCss ? `<link rel="stylesheet" href="${assetRoot}_assets/css/components/toc.css">` : ""}
  <link rel="stylesheet" href="${assetRoot}_assets/css/components/breadcrumb.css">
  <link rel="stylesheet" href="${assetRoot}_assets/css/components/code-block.css">
  <link rel="stylesheet" href="${assetRoot}_assets/css/components/callout.css">
  <link rel="stylesheet" href="${assetRoot}_assets/css/components/accordion.css">
  <link rel="stylesheet" href="${assetRoot}_assets/css/components/steps.css">
  <link rel="stylesheet" href="${assetRoot}_assets/css/components/tabs.css">
  <link rel="stylesheet" href="${assetRoot}_assets/css/components/table.css">
  <link rel="stylesheet" href="${assetRoot}_assets/css/components/search.css">
  <link rel="stylesheet" href="${assetRoot}_assets/css/components/theme-toggle.css">
  <link rel="stylesheet" href="${assetRoot}_assets/css/components/cards.css">
  <link rel="stylesheet" href="${assetRoot}_assets/css/components/footer.css">
  <link rel="stylesheet" href="${assetRoot}_assets/css/components/buttons.css">
  <link rel="stylesheet" href="${assetRoot}_assets/css/components/badges.css">
  <link rel="stylesheet" href="${assetRoot}_assets/css/components/tooltip.css">
  <link rel="stylesheet" href="${assetRoot}_assets/css/utilities.css">
  <link rel="stylesheet" href="${assetRoot}_assets/css/print.css" media="print">
  <link rel="stylesheet" href="${assetRoot}_assets/vendor/prism/prism-theme.css">
  <link rel="stylesheet" href="${assetRoot}_assets/css/transitions.css">
</head>`;
}

function renderHeader(depth) {
  return `<header class="header" role="banner">
    <div class="header__left">
      <button class="header__menu-toggle" aria-label="Toggle navigation" aria-expanded="false">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
      </button>
      <a href="${escapeHtml(homeHref(depth))}" class="header__logo"><span style="color: var(--color-primary-vivid); font-weight: 700;">Cascade</span>&nbsp;CMS Docs</a>
    </div>
    <nav class="header__nav" aria-label="Top navigation">
      <a href="#" class="header__nav-link header__nav-link--active">Knowledge Base</a>
      <a href="#" class="header__nav-link">Release Notes</a>
      <a href="#" class="header__nav-link">Support</a>
    </nav>
    <div class="header__right">
      <button class="header__search-trigger" aria-label="Search documentation">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        <span class="header__search-text">Search...</span>
        <kbd class="header__search-kbd">⌘K</kbd>
      </button>
      <div class="theme-toggle">
        <button class="theme-toggle__button" aria-label="Toggle color theme" aria-expanded="false" aria-haspopup="true">
          <svg class="theme-toggle__icon theme-toggle__icon--light" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
          <svg class="theme-toggle__icon theme-toggle__icon--dark" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
          <svg class="theme-toggle__icon theme-toggle__icon--system" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
        </button>
        <div class="theme-toggle__dropdown" role="menu" hidden>
          <button class="theme-toggle__option" role="menuitem" data-theme="light">Light</button>
          <button class="theme-toggle__option" role="menuitem" data-theme="dark">Dark</button>
          <button class="theme-toggle__option theme-toggle__option--active" role="menuitem" data-theme="system">System</button>
        </div>
      </div>
    </div>
  </header>`;
}

function renderSearchOverlay(searchRoot) {
  return `<div class="search-overlay" role="dialog" aria-modal="true" aria-label="Search documentation" data-search-index="${searchRoot}search-index.json" hidden>
    <div class="search-overlay__backdrop"></div>
    <div class="search-overlay__dialog">
      <div class="search-overlay__header">
        <svg class="search-overlay__icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        <input type="search" class="search-overlay__input" placeholder="Search documentation..." autocomplete="off">
        <kbd class="search-overlay__shortcut">ESC</kbd>
      </div>
      <div class="search-overlay__live" role="status" aria-live="polite" aria-atomic="true" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;"></div>
      <div class="search-overlay__results"><div class="search-overlay__empty">Start typing to search...</div></div>
      <div class="search-overlay__footer"><span>Navigate with <kbd>&uarr;</kbd><kbd>&darr;</kbd></span><span>Open with <kbd>&crarr;</kbd></span></div>
    </div>
  </div>`;
}

function renderScripts(assetRoot, { includeTocScript }) {
  return `  <script src="${assetRoot}_assets/vendor/prism/prism.min.js" defer></script>
  <script src="${assetRoot}_assets/vendor/prism/prism-markup.min.js" defer></script>
  <script src="${assetRoot}_assets/vendor/prism/prism-css.min.js" defer></script>
  <script src="${assetRoot}_assets/vendor/prism/prism-javascript.min.js" defer></script>
  <script src="${assetRoot}_assets/vendor/prism/prism-java.min.js" defer></script>
  <script src="${assetRoot}_assets/vendor/prism/prism-python.min.js" defer></script>
  <script src="${assetRoot}_assets/vendor/prism/prism-json.min.js" defer></script>
  <script src="${assetRoot}_assets/vendor/prism/prism-bash.min.js" defer></script>
  <script src="${assetRoot}_assets/vendor/prism/prism-yaml.min.js" defer></script>
  <script src="${assetRoot}_assets/vendor/prism/prism-sql.min.js" defer></script>
  <script src="${assetRoot}_assets/vendor/prism/prism-markup-templating.min.js" defer></script>
  <script src="${assetRoot}_assets/vendor/prism/prism-velocity.min.js" defer></script>
  <script src="${assetRoot}_assets/vendor/lunr/lunr.min.js" defer></script>
  <script src="${assetRoot}_assets/js/theme.js" defer></script>
  <script src="${assetRoot}_assets/js/sidebar.js" defer></script>
${includeTocScript ? `  <script src="${assetRoot}_assets/js/toc.js" defer></script>\n` : ""}  <script src="${assetRoot}_assets/js/tabs.js" defer></script>
  <script src="${assetRoot}_assets/js/accordion.js" defer></script>
  <script src="${assetRoot}_assets/js/code-block.js" defer></script>
  <script src="${assetRoot}_assets/js/search.js" defer></script>`;
}

function renderFooter() {
  const year = new Date().getFullYear();
  return `<footer class="site-footer" role="contentinfo">
  <div class="site-footer__inner">
    <nav class="site-footer__primary" aria-label="Footer primary links">
      <a class="site-footer__primary-link" href="https://www.hannonhill.com/cascadecms/latest/">Documentation Home</a>
      <a class="site-footer__primary-link" href="https://www.hannonhill.com/cascadecms/latest/release-notes/index.html">Release Notes</a>
      <a class="site-footer__primary-link" href="https://support.hannonhill.com/">Support</a>
      <a class="site-footer__primary-link" href="https://www.hannonhill.com/cascadecms/latest/rss/index.html">RSS</a>
    </nav>
    <div class="site-footer__bottom">
      <p class="site-footer__copyright">All content &copy; ${year} Hannon Hill. All rights reserved.</p>
      <nav class="site-footer__links" aria-label="Footer links">
        <a class="site-footer__link" href="https://www.hannonhill.com/about-us">About Us</a>
        <a class="site-footer__link" href="https://www.hannonhill.com/careers">Careers</a>
        <a class="site-footer__link" href="https://www.hannonhill.com/compliance">Compliance</a>
        <a class="site-footer__link" href="https://www.hannonhill.com/resources">Resources</a>
        <a class="site-footer__link" href="https://hannonhill.ideas.aha.io/">Idea Portal</a>
        <a class="site-footer__link" href="https://www.hannonhill.com/site-index">Site Index</a>
        <a class="site-footer__link" href="https://github.com/hannonhill">Github</a>
        <a class="site-footer__link" href="https://www.hannonhill.com/accessibility-policy">Accessibility</a>
        <a class="site-footer__link" href="https://www.hannonhill.com/privacy-policy">Privacy Policy</a>
        <a class="site-footer__link" href="https://www.hannonhill.com/legal">Legal</a>
      </nav>
    </div>
  </div>
</footer>`;
}

function renderArticlePageHtml(article, articles, sections, siteRootDir) {
  const segments = article.path.split("/").filter(Boolean);
  const depth = segments.length;
  const pageDir = path.join(siteRootDir, ...segments);
  const assetRoot = assetPrefix(depth);
  const searchRoot = searchIndexPrefix(depth);
  const pageId = slugify(article.path) || "page";

  const sectionHtml = (Array.isArray(article.sections) ? article.sections : [])
    .map((section, sectionIndex) => {
      const header = cleanText(section.header || "");
      const heading = header ? `<h2 id="${escapeHtml(`${pageId}-section-${sectionIndex + 1}`)}">${escapeHtml(header)}</h2>` : "";
      const body = renderSectionContent(section, pageId, sectionIndex);
      if (!heading && !body) return "";
      return `${heading}\n${body}`.trim();
    })
    .filter(Boolean)
    .join("\n\n");

  const firstSegment = segments[0] || "docs";
  const categoryLabel = titleCaseFromSegment(firstSegment);
  const sidebar = renderSidebar({ type: "article", sectionKey: firstSegment, articlePath: article.path }, sections, pageDir, siteRootDir);
  const sectionLandingHref = relativeHref(pageDir, path.join(siteRootDir, firstSegment));
  const breadcrumb = renderBreadcrumb([{ label: categoryLabel, href: sectionLandingHref }, { label: article.title }], depth);
  const pagination = renderPagination(article, articles, pageDir, siteRootDir);

  return `<!DOCTYPE html>
<html lang="en" data-theme="light">
${renderSharedHead({
    title: article.title,
    description: cleanText((article.sections?.[0]?.content || "").slice(0, 180)),
    assetRoot,
    includeTocCss: true,
  })}
<body>
  <a href="#main-content" class="skip-link">Skip to main content</a>
  ${renderHeader(depth)}

  <div class="sidebar-overlay"></div>
  <div class="docs-layout">
    <aside class="sidebar" aria-label="Documentation navigation">
      <nav class="sidebar__nav">
        ${sidebar}
      </nav>
    </aside>

    <main id="main-content" class="main">
      <article class="content">
        ${breadcrumb}
        <header class="content__header">
          <span class="content__category-label">${escapeHtml(categoryLabel)}</span>
          <h1 class="content__title">${escapeHtml(article.title)}</h1>
        </header>
        <div class="content__body">
          ${sectionHtml || "<p>No content available.</p>"}
        </div>
        ${pagination}
      </article>
    </main>

    <aside class="toc" aria-label="Table of contents">
      <div class="toc__sticky">
        <h2 class="toc__title">ON THIS PAGE</h2>
        <nav class="toc__nav"></nav>
      </div>
    </aside>

    <button class="toc-toggle" aria-label="Table of contents" aria-expanded="false">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
    </button>
  </div>

  ${renderFooter()}
  ${renderSearchOverlay(searchRoot)}

${renderScripts(assetRoot, { includeTocScript: true })}
</body>
</html>`;
}

function renderHomePageHtml(model, sections, siteRootDir) {
  const depth = 0;
  const pageDir = siteRootDir;
  const assetRoot = assetPrefix(depth);
  const searchRoot = searchIndexPrefix(depth);
  const sidebar = renderSidebar({ type: "home" }, sections, pageDir, siteRootDir);
  const sectionCards = model.sections
    .map((section) => {
      const href = relativeHref(pageDir, path.join(siteRootDir, section.path));
      return `<a href="${escapeHtml(href)}" class="card card--link">
  <h3 class="card__title">${escapeHtml(section.label)}</h3>
  <p class="card__description">${escapeHtml(`${section.count} article${section.count === 1 ? "" : "s"}`)}</p>
</a>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en" data-theme="light">
${renderSharedHead({
    title: model.title,
    description: model.description,
    assetRoot,
    includeTocCss: false,
  })}
<body>
  <a href="#main-content" class="skip-link">Skip to main content</a>
  ${renderHeader(depth)}

  <div class="sidebar-overlay"></div>
  <div class="docs-layout docs-layout--two-column">
    <aside class="sidebar" aria-label="Documentation navigation">
      <nav class="sidebar__nav">
        ${sidebar}
      </nav>
    </aside>

    <main id="main-content" class="main">
      <article class="content">
        <header class="content__header">
          <span class="content__category-label">Knowledge Base</span>
          <h1 class="content__title">${escapeHtml(model.title)}</h1>
          <p class="content__description" data-generated-copy="placeholder">${escapeHtml(model.description)}</p>
        </header>
        <div class="content__body">
          <div class="callout callout--info" data-generated-copy="placeholder">
            <div class="callout__icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
            </div>
            <div class="callout__content">
              <p class="callout__title">Placeholder Copy</p>
              <p>Replace this intro with your preferred homepage messaging. This block is intentionally generated for editorial refinement.</p>
            </div>
          </div>

          <h2>Browse by Section</h2>
          <div class="card-grid card-grid--2col">
            ${sectionCards || "<p>No sections available.</p>"}
          </div>
        </div>
      </article>
    </main>
  </div>

  ${renderFooter()}
  ${renderSearchOverlay(searchRoot)}

${renderScripts(assetRoot, { includeTocScript: false })}
</body>
</html>`;
}

function renderSectionLandingHtml(section, sections, siteRootDir) {
  const depth = 1;
  const pageDir = path.join(siteRootDir, section.path);
  const assetRoot = assetPrefix(depth);
  const searchRoot = searchIndexPrefix(depth);
  const sidebar = renderSidebar({ type: "landing", sectionKey: section.key }, sections, pageDir, siteRootDir);

  const articleCards = section.articles
    .map((article) => {
      const href = relativeHref(pageDir, path.join(siteRootDir, ...article.path.split("/")));
      const preview = cleanText(article.sections?.[0]?.content || "").slice(0, 140);
      return `<a href="${escapeHtml(href)}" class="card card--link">
  <h3 class="card__title">${escapeHtml(article.title)}</h3>
  <p class="card__description">${escapeHtml(preview || "Open article")}</p>
</a>`;
    })
    .join("\n");

  const breadcrumb = renderBreadcrumb([{ label: section.label }], depth);

  return `<!DOCTYPE html>
<html lang="en" data-theme="light">
${renderSharedHead({
    title: section.title,
    description: section.description,
    assetRoot,
    includeTocCss: false,
  })}
<body>
  <a href="#main-content" class="skip-link">Skip to main content</a>
  ${renderHeader(depth)}

  <div class="sidebar-overlay"></div>
  <div class="docs-layout docs-layout--two-column">
    <aside class="sidebar" aria-label="Documentation navigation">
      <nav class="sidebar__nav">
        ${sidebar}
      </nav>
    </aside>

    <main id="main-content" class="main">
      <article class="content">
        ${breadcrumb}
        <header class="content__header">
          <span class="content__category-label">Section Landing</span>
          <h1 class="content__title">${escapeHtml(section.title)}</h1>
          <p class="content__description" data-generated-copy="placeholder">${escapeHtml(section.description)}</p>
        </header>
        <div class="content__body">
          <div class="callout callout--tip" data-generated-copy="placeholder">
            <div class="callout__icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6"></path><path d="M10 22h4"></path><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0018 8 6 6 0 006 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 018.91 14"></path></svg>
            </div>
            <div class="callout__content">
              <p class="callout__title">Placeholder Copy</p>
              <p>Replace this section intro with overview guidance for ${escapeHtml(section.label)}.</p>
            </div>
          </div>

          <h2>Articles in ${escapeHtml(section.label)}</h2>
          <div class="card-grid card-grid--2col">
            ${articleCards || "<p>No articles in this section.</p>"}
          </div>
        </div>
      </article>
    </main>
  </div>

  ${renderFooter()}
  ${renderSearchOverlay(searchRoot)}

${renderScripts(assetRoot, { includeTocScript: false })}
</body>
</html>`;
}

async function loadData(filePath) {
  let raw;
  try {
    raw = await fs.readFile(filePath, "utf8");
  } catch (error) {
    throw new Error(`Could not read input file "${filePath}": ${error.message}`);
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(`Input file "${filePath}" is not valid JSON: ${error.message}`);
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Input root must be an object.");
  }

  if (!Array.isArray(parsed.articles)) {
    throw new Error('Input schema error: root must include an "articles" array.');
  }

  parsed.articles.forEach((article, index) => {
    const prefix = `articles[${index}]`;
    if (!article || typeof article !== "object") {
      throw new Error(`${prefix} must be an object.`);
    }
    if (typeof article.path !== "string" || !article.path.trim()) {
      throw new Error(`${prefix}.path must be a non-empty string.`);
    }
    if (typeof article.title !== "string" || !article.title.trim()) {
      throw new Error(`${prefix}.title must be a non-empty string.`);
    }
    if (!Array.isArray(article.sections)) {
      throw new Error(`${prefix}.sections must be an array.`);
    }
    article.sections.forEach((section, sectionIndex) => {
      const sectionPrefix = `${prefix}.sections[${sectionIndex}]`;
      if (!section || typeof section !== "object") {
        throw new Error(`${sectionPrefix} must be an object.`);
      }
      if (!Object.hasOwn(section, "header")) throw new Error(`${sectionPrefix}.header is required.`);
      if (!Object.hasOwn(section, "isCloud")) throw new Error(`${sectionPrefix}.isCloud is required.`);
      if (!Object.hasOwn(section, "content")) throw new Error(`${sectionPrefix}.content is required.`);
      if (!Array.isArray(section.codeBlocks)) throw new Error(`${sectionPrefix}.codeBlocks must be an array.`);

      section.codeBlocks.forEach((codeBlock, codeIndex) => {
        const codePrefix = `${sectionPrefix}.codeBlocks[${codeIndex}]`;
        if (!codeBlock || typeof codeBlock !== "object") {
          throw new Error(`${codePrefix} must be an object.`);
        }
        if (!Object.hasOwn(codeBlock, "code")) throw new Error(`${codePrefix}.code is required.`);
        if (!Object.hasOwn(codeBlock, "language")) throw new Error(`${codePrefix}.language is required.`);
        if (!Object.hasOwn(codeBlock, "explanation")) throw new Error(`${codePrefix}.explanation is required.`);
      });
    });
  });

  return parsed;
}

async function ensureDir(dirPath, dryRun) {
  if (dryRun) return;
  await fs.mkdir(dirPath, { recursive: true });
}

async function writeTextFile(filePath, content, dryRun) {
  if (dryRun) return;
  await fs.writeFile(filePath, content, "utf8");
}

async function listFilesRecursive(dirPath) {
  let entries;
  try {
    entries = await fs.readdir(dirPath, { withFileTypes: true });
  } catch (error) {
    if (error && error.code === "ENOENT") return [];
    throw error;
  }

  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFilesRecursive(fullPath)));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }
  return files;
}

async function removeFile(filePath, dryRun) {
  if (dryRun) return;
  await fs.unlink(filePath);
}

async function removeDirIfEmptyRecursive(dirPath, stopDir, dryRun) {
  const removed = [];
  let current = dirPath;
  const stop = path.resolve(stopDir);

  while (current.startsWith(stop) && current !== stop) {
    let entries;
    try {
      entries = await fs.readdir(current);
    } catch (error) {
      if (error && error.code === "ENOENT") break;
      throw error;
    }
    if (entries.length > 0) break;
    if (!dryRun) {
      await fs.rmdir(current);
    }
    removed.push(current);
    current = path.dirname(current);
  }

  return removed;
}

async function run() {
  const started = Date.now();
  const args = parseArgs(process.argv.slice(2));
  const outDir = path.resolve(process.cwd(), args.out);
  const inputPath = path.resolve(process.cwd(), args.input);

  const data = await loadData(inputPath);
  const requestedIncludePaths = args.includePaths ? args.includePaths.map(normalizeArticlePath) : null;
  const requestedIncludeSet = requestedIncludePaths ? new Set(requestedIncludePaths) : null;

  const seenPaths = new Set();
  const uniqueArticles = [];
  const duplicateWarnings = [];

  for (const article of data.articles) {
    const normalizedPath = normalizeArticlePath(article.path);
    if (seenPaths.has(normalizedPath)) {
      duplicateWarnings.push(normalizedPath);
      continue;
    }
    seenPaths.add(normalizedPath);
    uniqueArticles.push({
      ...article,
      path: normalizedPath,
      title: cleanText(article.title),
    });
  }

  let selectedArticles = uniqueArticles;
  if (requestedIncludeSet) {
    selectedArticles = uniqueArticles.filter((article) => requestedIncludeSet.has(article.path));
    const found = new Set(selectedArticles.map((article) => article.path));
    const missing = requestedIncludePaths.filter((p) => !found.has(p));
    if (missing.length > 0) {
      throw new Error(`Unknown include path(s): ${missing.join(", ")}`);
    }
  }

  const sortedArticles = selectedArticles.slice().sort((a, b) => a.path.localeCompare(b.path));
  const sections = buildSectionModels(sortedArticles);
  const homePageModel = buildHomePageModel(sections);
  const sectionLandingModels = buildSectionLandingModels(sections);

  const searchDocs = [];
  let articleWrittenCount = 0;
  let homeWrittenCount = 0;
  let landingWrittenCount = 0;

  if (args.generateHome) {
    const homeFile = path.join(outDir, "index.html");
    const homeHtml = renderHomePageHtml(homePageModel, sections, outDir);
    await ensureDir(outDir, args.dryRun);
    await writeTextFile(homeFile, homeHtml, args.dryRun);
    homeWrittenCount += 1;
  }

  if (args.generateLandings) {
    for (const section of sectionLandingModels) {
      const targetDir = path.join(outDir, section.path);
      const targetFile = path.join(targetDir, "index.html");
      const html = renderSectionLandingHtml(section, sections, outDir);
      await ensureDir(targetDir, args.dryRun);
      await writeTextFile(targetFile, html, args.dryRun);
      landingWrittenCount += 1;
    }
  }

  for (const article of sortedArticles) {
    const targetDir = path.join(outDir, ...article.path.split("/"));
    const targetFile = path.join(targetDir, "index.html");
    const html = renderArticlePageHtml(article, sortedArticles, sections, outDir);
    searchDocs.push(buildSearchIndexDoc(article));
    await ensureDir(targetDir, args.dryRun);
    await writeTextFile(targetFile, html, args.dryRun);
    articleWrittenCount += 1;
  }

  const expectedIndexFiles = new Set();
  if (args.generateHome) {
    expectedIndexFiles.add(path.resolve(path.join(outDir, "index.html")));
  }
  if (args.generateLandings) {
    for (const section of sectionLandingModels) {
      expectedIndexFiles.add(path.resolve(path.join(outDir, section.path, "index.html")));
    }
  }
  for (const article of sortedArticles) {
    expectedIndexFiles.add(path.resolve(path.join(outDir, ...article.path.split("/"), "index.html")));
  }

  const allFiles = await listFilesRecursive(outDir);
  const staleIndexFiles = allFiles
    .filter((filePath) => path.basename(filePath) === "index.html")
    .map((filePath) => path.resolve(filePath))
    .filter((filePath) => !expectedIndexFiles.has(filePath));

  let staleDeletedCount = 0;
  const staleDirectoriesRemoved = new Set();
  for (const staleFile of staleIndexFiles) {
    await removeFile(staleFile, args.dryRun);
    staleDeletedCount += 1;
    const removedDirs = await removeDirIfEmptyRecursive(path.dirname(staleFile), outDir, args.dryRun);
    removedDirs.forEach((dir) => staleDirectoriesRemoved.add(dir));
  }

  const searchIndexPath = path.join(outDir, "search-index.json");
  await ensureDir(outDir, args.dryRun);
  await writeTextFile(searchIndexPath, `${JSON.stringify(searchDocs, null, 2)}\n`, args.dryRun);

  const skippedCount = data.articles.length - sortedArticles.length;
  const elapsed = ((Date.now() - started) / 1000).toFixed(2);
  const modeLabel = args.dryRun ? "DRY RUN" : "WRITE";

  if (duplicateWarnings.length > 0) {
    console.warn(`Duplicate article paths skipped (${duplicateWarnings.length}):`);
    duplicateWarnings.slice(0, 20).forEach((entry) => console.warn(`  - ${entry}`));
    if (duplicateWarnings.length > 20) {
      console.warn(`  ... and ${duplicateWarnings.length - 20} more`);
    }
  }

  console.log(`[${modeLabel}] Generation complete`);
  console.log(`Input: ${args.input}`);
  console.log(`Output: ${args.out}`);
  console.log(`Include paths: ${requestedIncludePaths ? requestedIncludePaths.join(", ") : "all"}`);
  console.log(`Generate home: ${args.generateHome}`);
  console.log(`Generate landings: ${args.generateLandings}`);
  console.log(`Total input articles: ${data.articles.length}`);
  console.log(`Selected articles: ${sortedArticles.length}`);
  console.log(`Pages written: ${homeWrittenCount + landingWrittenCount + articleWrittenCount}`);
  console.log(`Home pages written: ${homeWrittenCount}`);
  console.log(`Landing pages written: ${landingWrittenCount}`);
  console.log(`Article pages written: ${articleWrittenCount}`);
  console.log(`Stale pages deleted: ${staleDeletedCount}`);
  console.log(`Stale dirs removed: ${staleDirectoriesRemoved.size}`);
  console.log(`Skipped: ${skippedCount}`);
  console.log(`Search index docs: ${searchDocs.length}`);
  console.log(`Elapsed: ${elapsed}s`);
}

run().catch((error) => {
  console.error(`Error: ${error.message}`);
  process.exitCode = 1;
});
