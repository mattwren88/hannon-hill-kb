#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

function parseArgs(argv) {
  const args = {
    queue: "_downloads/hannonhill-kb/review-queue.json",
    downloadRoot: "_downloads/hannonhill-kb",
    docsRoot: "docs",
    limit: 0,
    dryRun: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--queue") {
      args.queue = argv[++i] || "";
      continue;
    }
    if (token === "--download-root") {
      args.downloadRoot = argv[++i] || "";
      continue;
    }
    if (token === "--docs-root") {
      args.docsRoot = argv[++i] || "";
      continue;
    }
    if (token === "--limit") {
      args.limit = Number(argv[++i]);
      continue;
    }
    if (token === "--dry-run") {
      args.dryRun = true;
      continue;
    }
    if (token === "--help" || token === "-h") {
      printHelp();
      process.exit(0);
    }
    throw new Error(`Unknown argument: ${token}`);
  }

  if (!args.queue) throw new Error("Missing --queue");
  if (!args.downloadRoot) throw new Error("Missing --download-root");
  if (!args.docsRoot) throw new Error("Missing --docs-root");
  if (!Number.isFinite(args.limit) || args.limit < 0) {
    throw new Error("--limit must be a non-negative number");
  }
  return args;
}

function printHelp() {
  console.log(
    [
      "Apply live KB-to-component updates in batch, safely.",
      "",
      "Usage:",
      "  node scripts/apply-live-component-updates.mjs [options]",
      "",
      "Options:",
      "  --queue <file>          Review queue JSON (default: _downloads/hannonhill-kb/review-queue.json)",
      "  --download-root <dir>   Download root (default: _downloads/hannonhill-kb)",
      "  --docs-root <dir>       Local docs root (default: docs)",
      "  --limit <n>             Max pages to process (default: all)",
      "  --dry-run               Report only; do not write files",
    ].join("\n")
  );
}

function decodeEntities(str) {
  return str
    .replace(/&#(\\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function stripTags(str) {
  return str.replace(/<[^>]+>/g, "");
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function languageLabel(language) {
  if (language === "velocity") return "Velocity";
  if (language === "markup") return "Markup";
  if (language === "json") return "JSON";
  if (language === "sql") return "SQL";
  if (language === "plain") return "Plaintext";
  return language.charAt(0).toUpperCase() + language.slice(1);
}

function inferLanguageFromCode(code) {
  const text = String(code || "");
  const trimmed = text.trim();

  if (
    /#(set|if|elseif|else|foreach|end|macro|parse|include|import|queryexecute|queryfilter|querysortvalue)\b/i.test(trimmed) ||
    /\$[A-Za-z_][A-Za-z0-9_.]*/.test(trimmed)
  ) {
    return "velocity";
  }

  if (/<\/?[a-z][^>]*>/i.test(trimmed) || /&lt;\/?[a-z][^&]*&gt;/i.test(text)) {
    return "markup";
  }

  if ((trimmed.startsWith("{") || trimmed.startsWith("[")) && /:\s*/.test(trimmed)) {
    return "json";
  }

  if (/\bSELECT\b[\s\S]*\bFROM\b/i.test(trimmed)) {
    return "sql";
  }

  return "plain";
}

function cleanCode(codeHtml) {
  let text = stripTags(codeHtml);
  text = decodeEntities(text);
  text = text.replace(/\r/g, "");
  text = text
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/g, ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return text;
}

function extractLiveBody(liveHtml) {
  let start = liveHtml.indexOf('<section aria-label="Overview"');
  if (start < 0) {
    // Some pages do not have an "Overview" section; fall back to first anchor section in main article.
    start = liveHtml.indexOf('<section aria-label="');
  }
  if (start < 0) return "";
  const backToTop = liveHtml.indexOf('<a aria-label="Back to top"', start);
  const endMain = liveHtml.indexOf("</main>", start);
  const end = backToTop > -1 ? backToTop : endMain;
  if (end < 0) return "";
  return liveHtml.slice(start, end);
}

function replaceWithComponentCodeBlocks(html) {
  return html.replace(
    /<pre[^>]*>\s*(?:<button[^>]*>[\s\S]*?<\/button>\s*)?<code(?:\s+class="([^"]*)")?[^>]*>([\s\S]*?)<\/code>\s*<\/pre>/gi,
    (_m, codeClassRaw, codeInner) => {
      const codeClass = String(codeClassRaw || "");
      const langMatch = codeClass.match(/(?:^|\s)language-([a-z0-9-]+)(?:\s|$)/i);
      let language = String((langMatch && langMatch[1]) || "").toLowerCase();
      const cleaned = cleanCode(codeInner);
      const inferredLanguage = inferLanguageFromCode(cleaned);
      if (!language || language === "none" || language === "plain") {
        language = inferredLanguage;
      }
      if (!language || language === "none") language = "plain";
      const label = languageLabel(language);
      return `<div class="code-block">
  <div class="code-block__header">
    <span class="code-block__language">${label}</span>
    <button class="code-block__copy" aria-label="Copy code">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"></path></svg>
      <span>Copy</span>
    </button>
  </div>
  <pre class="code-block__pre"><code class="language-${language}">${escHtml(cleaned)}</code></pre>
</div>`;
    }
  );
}

function convertAlertsToCallouts(html) {
  let out = html;
  out = out.replace(
    /<div class="alert alert-warning"><strong>([^<]+)<\/strong>:\s*([\s\S]*?)<\/div>/gi,
    (_m, title, content) => `<div class="callout callout--warning">
  <div class="callout__content">
    <p class="callout__title">${decodeEntities(title).trim()}</p>
    <p>${content.trim()}</p>
  </div>
</div>`
  );

  out = out.replace(
    /<div class="alert alert-success"><strong>([^<]+)<\/strong>:\s*([\s\S]*?)<\/div>/gi,
    (_m, title, content) => `<div class="callout callout--tip">
  <div class="callout__content">
    <p class="callout__title">${decodeEntities(title).trim()}</p>
    <p>${content.trim()}</p>
  </div>
</div>`
  );
  return out;
}

function convertTables(html) {
  return html.replace(/<table[^>]*>([\s\S]*?)<\/table>/gi, (_m, inner) => {
    return `<div class="table-wrapper">
  <table class="table table--striped">${inner}</table>
</div>`;
  });
}

function convertDetailsAccordions(html) {
  let index = 0;
  return html.replace(
    /<details class="accordion"[^>]*>\s*<summary>([\s\S]*?)<\/summary>\s*<div class="accordion-inner">([\s\S]*?)<\/div>\s*<\/details>/gi,
    (_m, summaryInner, panelInner) => {
      index += 1;
      const title = decodeEntities(stripTags(summaryInner)).replace(/\s+/g, " ").trim();
      const panelId = `live-acc-${index}`;
      return `<div class="accordion">
  <button class="accordion__trigger" aria-expanded="false" aria-controls="${panelId}">
    <span class="accordion__title">${escHtml(title)}</span>
    <svg class="accordion__chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
  </button>
  <div class="accordion__panel" id="${panelId}" role="region" hidden>
    <div class="accordion__content">
${panelInner.trim()}
    </div>
  </div>
</div>`;
    }
  );
}

function normalizeHeadings(html, localH2Ids, localDocPath) {
  let index = 0;
  let out = html;
  out = out.replace(
    /<section aria-label="[^"]*" class="anchor-heading" id="[^"]*">\s*<h2>([\s\S]*?)<\/h2>/gi,
    (_m, h2Inner) => {
      const title = decodeEntities(stripTags(h2Inner)).replace(/\s+/g, " ").trim();
      const fallbackId = `${localDocPath.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase()}-section-${index + 1}`;
      const id = localH2Ids[index] || fallbackId;
      index += 1;
      return `<h2 id="${id}">${title}</h2>`;
    }
  );
  out = out.replace(/<\/section>\s*/gi, "\n");
  return out;
}

function cleanupHtml(html) {
  let out = html;
  out = out.replace(/<a name="[^"]*"><\/a>/gi, "");
  out = out.replace(/\s+style="[^"]*"/gi, "");
  out = out.replace(/\s+tabindex="[^"]*"/gi, "");
  out = out.replace(/\s+class="anchor-heading"/gi, "");
  out = out.replace(/<section\b[^>]*>/gi, "");
  out = out.replace(/<\/section>\s*/gi, "\n");
  out = out.replace(
    /<p class="callout">([\s\S]*?)<\/p>/gi,
    (_m, content) => `<div class="callout callout--info">
  <div class="callout__content">
    <p>${content.trim()}</p>
  </div>
</div>`
  );
  out = out.replace(/&nbsp;/g, " ");
  out = out.replace(/<\/div>\s+<div class="accordion">/g, "</div>\n<div class=\"accordion\">");
  out = out.replace(/\n{3,}/g, "\n\n");
  return out.trim();
}

function findBodyRange(localHtml) {
  const startMarker = '<div class="content__body">';
  const endMarker = '        </div>\n        <footer class="content__footer">';
  const start = localHtml.indexOf(startMarker);
  const end = localHtml.indexOf(endMarker);
  if (start < 0 || end < 0 || end <= start) return null;
  return {
    start,
    end,
    startMarker,
    endMarker,
    currentBody: localHtml.slice(start + startMarker.length, end),
  };
}

function listH2Ids(bodyHtml) {
  const ids = [];
  const regex = /<h2 id="([^"]+)">/gi;
  let match = regex.exec(bodyHtml);
  while (match) {
    ids.push(match[1]);
    match = regex.exec(bodyHtml);
  }
  return ids;
}

function validateConvertedBody(bodyHtml) {
  const forbidden = [
    "btn-copy",
    "token keyword",
    "<script",
    'class="anchor-heading"',
    "<main",
    "</main>",
  ];
  for (const token of forbidden) {
    if (bodyHtml.includes(token)) return `contains forbidden marker: ${token}`;
  }
  if (!bodyHtml.includes("<h2")) return "missing h2 headings";
  if (bodyHtml.length < 200) return "body too short";
  if (/<p>\s*<div class="code-block">/i.test(bodyHtml)) return "invalid nesting: code-block inside p";
  if (/<p>\s*<div class="card-grid">/i.test(bodyHtml)) return "invalid nesting: card-grid inside p";
  return "";
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const queuePath = path.resolve(args.queue);
  const downloadRoot = path.resolve(args.downloadRoot);
  const docsRoot = path.resolve(args.docsRoot);

  const queue = JSON.parse(await fs.readFile(queuePath, "utf8"));
  const matched = Array.isArray(queue.matched) ? queue.matched : [];
  const items = args.limit > 0 ? matched.slice(0, args.limit) : matched;

  const report = {
    generatedAt: new Date().toISOString(),
    dryRun: args.dryRun,
    processed: items.length,
    updated: 0,
    skipped: 0,
    errors: 0,
    entries: [],
  };

  for (const item of items) {
    const entryReport = {
      key: item.key,
      localDocPath: item.localDocPath,
      kbUrl: item.kbUrl,
      outcome: "skipped",
      reason: "",
    };
    try {
      const localPath = path.resolve(item.localDocPath);
      if (!localPath.startsWith(docsRoot)) {
        entryReport.reason = "local path outside docs root";
        report.skipped += 1;
        report.entries.push(entryReport);
        continue;
      }

      const downloadPath = path.resolve(downloadRoot, item.downloadedHtmlPath);
      const [localHtml, liveHtml] = await Promise.all([
        fs.readFile(localPath, "utf8"),
        fs.readFile(downloadPath, "utf8"),
      ]);

      const bodyRange = findBodyRange(localHtml);
      if (!bodyRange) {
        entryReport.reason = "could not locate content__body";
        report.skipped += 1;
        report.entries.push(entryReport);
        continue;
      }

      const liveBody = extractLiveBody(liveHtml);
      if (!liveBody) {
        entryReport.reason = "could not extract live body";
        report.skipped += 1;
        report.entries.push(entryReport);
        continue;
      }

      const localH2Ids = listH2Ids(bodyRange.currentBody);
      let converted = liveBody;
      converted = normalizeHeadings(converted, localH2Ids, item.localDocPath);
      converted = convertAlertsToCallouts(converted);
      converted = convertTables(converted);
      converted = convertDetailsAccordions(converted);
      converted = replaceWithComponentCodeBlocks(converted);
      converted = cleanupHtml(converted);

      const validationError = validateConvertedBody(converted);
      if (validationError) {
        entryReport.reason = validationError;
        report.skipped += 1;
        report.entries.push(entryReport);
        continue;
      }

      const rebuilt =
        localHtml.slice(0, bodyRange.start + bodyRange.startMarker.length) +
        "\n" +
        converted +
        "\n" +
        localHtml.slice(bodyRange.end);

      if (!args.dryRun) {
        await fs.writeFile(localPath, rebuilt, "utf8");
      }

      entryReport.outcome = "updated";
      report.updated += 1;
      report.entries.push(entryReport);
    } catch (error) {
      entryReport.outcome = "error";
      entryReport.reason = error.message || String(error);
      report.errors += 1;
      report.entries.push(entryReport);
    }
  }

  report.skipped = report.processed - report.updated - report.errors;

  const outReportPath = path.resolve(downloadRoot, "apply-live-updates-report.json");
  await fs.writeFile(outReportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.log(`processed: ${report.processed}`);
  console.log(`updated: ${report.updated}`);
  console.log(`skipped: ${report.skipped}`);
  console.log(`errors: ${report.errors}`);
  console.log(`report: ${path.relative(process.cwd(), outReportPath)}`);
}

main().catch((error) => {
  console.error(`error: ${error.message}`);
  process.exitCode = 1;
});
