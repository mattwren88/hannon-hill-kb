#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

function printHelp() {
  const text = `
Download Hannon Hill KB HTML pages for local review/migration.

Usage:
  node scripts/download-kb-html.mjs [options]

Options:
  --start-url <url>      Root KB URL (default: https://www.hannonhill.com/cascadecms/latest/)
  --sitemap-url <url>    Sitemap/index URL to discover pages
                         (default: <start-url-origin>/cascadecms/latest/sitemap.html)
  --out <dir>            Output directory (default: _downloads/hannonhill-kb)
  --concurrency <n>      Parallel downloads (default: 4)
  --delay-ms <n>         Delay per request in ms (default: 100)
  --max-pages <n>        Max downloaded pages (default: 5000)
  --timeout-ms <n>       Request timeout in ms (default: 20000)
  --retries <n>          Request retries (default: 2)
  --dry-run              Discover and report only, do not write page files
  --help                 Show this help

Output:
  <out>/pages/...        Downloaded HTML files
  <out>/manifest.json    Download summary with source URL and local file path
  <out>/urls.txt         Discovered page URLs (one per line)
`;
  console.log(text.trim());
}

function parseArgs(argv) {
  const args = {
    startUrl: "https://www.hannonhill.com/cascadecms/latest/",
    sitemapUrl: "",
    outDir: "_downloads/hannonhill-kb",
    concurrency: 4,
    delayMs: 100,
    maxPages: 5000,
    timeoutMs: 20_000,
    retries: 2,
    dryRun: false,
    help: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--help" || token === "-h") {
      args.help = true;
      continue;
    }
    if (token === "--dry-run") {
      args.dryRun = true;
      continue;
    }
    if (token === "--start-url") {
      args.startUrl = argv[++i] || "";
      continue;
    }
    if (token === "--sitemap-url") {
      args.sitemapUrl = argv[++i] || "";
      continue;
    }
    if (token === "--out") {
      args.outDir = argv[++i] || "";
      continue;
    }
    if (token === "--concurrency") {
      args.concurrency = Number(argv[++i]);
      continue;
    }
    if (token === "--delay-ms") {
      args.delayMs = Number(argv[++i]);
      continue;
    }
    if (token === "--max-pages") {
      args.maxPages = Number(argv[++i]);
      continue;
    }
    if (token === "--timeout-ms") {
      args.timeoutMs = Number(argv[++i]);
      continue;
    }
    if (token === "--retries") {
      args.retries = Number(argv[++i]);
      continue;
    }
    throw new Error(`Unknown argument: ${token}`);
  }

  if (!args.startUrl) throw new Error("Missing value for --start-url");
  if (!args.outDir) throw new Error("Missing value for --out");
  if (!Number.isFinite(args.concurrency) || args.concurrency < 1) {
    throw new Error("--concurrency must be a positive number");
  }
  if (!Number.isFinite(args.delayMs) || args.delayMs < 0) {
    throw new Error("--delay-ms must be 0 or greater");
  }
  if (!Number.isFinite(args.maxPages) || args.maxPages < 1) {
    throw new Error("--max-pages must be 1 or greater");
  }
  if (!Number.isFinite(args.timeoutMs) || args.timeoutMs < 1) {
    throw new Error("--timeout-ms must be 1 or greater");
  }
  if (!Number.isFinite(args.retries) || args.retries < 0) {
    throw new Error("--retries must be 0 or greater");
  }

  const root = new URL(args.startUrl);
  const defaultSitemap = new URL("/cascadecms/latest/sitemap.html", root);
  args.sitemapUrl = args.sitemapUrl || defaultSitemap.href;
  args.startUrl = root.href;

  return args;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toPosixPath(value) {
  return value.split(path.sep).join("/");
}

function cleanUrl(input) {
  const url = new URL(input);
  url.hash = "";
  return url;
}

function inScope(url, scope) {
  return url.hostname === scope.hostname && url.pathname.startsWith(scope.pathname);
}

function isLikelyHtmlUrl(url) {
  if (url.pathname.endsWith("/")) return true;
  if (url.pathname.endsWith(".html")) return true;
  return !path.posix.extname(url.pathname);
}

function isLikelySitemap(url) {
  return (
    url.pathname.endsWith("/sitemap.xml") ||
    url.pathname.endsWith(".xml") ||
    url.pathname.endsWith("/sitemap.html")
  );
}

function extractLinksFromHtml(html, baseUrl) {
  const links = [];
  const hrefRegex = /<a\s+[^>]*href=(["'])(.*?)\1/gi;
  let match = hrefRegex.exec(html);
  while (match) {
    const raw = match[2]?.trim();
    if (raw && !raw.startsWith("javascript:") && !raw.startsWith("mailto:")) {
      try {
        const abs = new URL(raw, baseUrl).href;
        links.push(abs);
      } catch {
        // ignore malformed URLs
      }
    }
    match = hrefRegex.exec(html);
  }
  return links;
}

function extractLinksFromXml(xml) {
  const links = [];
  const locRegex = /<loc>([\s\S]*?)<\/loc>/gi;
  let match = locRegex.exec(xml);
  while (match) {
    const raw = match[1]?.trim();
    if (raw) links.push(raw);
    match = locRegex.exec(xml);
  }
  return links;
}

function titleFromHtml(html) {
  const match = html.match(/<title>([\s\S]*?)<\/title>/i);
  if (!match) return "";
  return match[1].replace(/\s+/g, " ").trim();
}

function urlToOutputPath(baseOutDir, pageUrl) {
  const hostname = pageUrl.hostname;
  let pathname = decodeURIComponent(pageUrl.pathname);
  if (pathname.endsWith("/")) pathname += "index.html";
  if (!pathname.endsWith(".html")) pathname += ".html";
  if (pathname.startsWith("/")) pathname = pathname.slice(1);
  const safePath = pathname
    .split("/")
    .filter(Boolean)
    .map((part) => part.replace(/[<>:"|?*]/g, "_"))
    .join(path.sep);
  return path.join(baseOutDir, "pages", hostname, safePath);
}

async function fetchWithRetry(url, options) {
  const {
    retries,
    timeoutMs,
    delayMs,
    userAgent = "cascadecms-docs-kb-downloader/1.0",
  } = options;
  let attempt = 0;
  while (attempt <= retries) {
    attempt += 1;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      if (delayMs > 0) await sleep(delayMs);
      const response = await fetch(url, {
        method: "GET",
        signal: controller.signal,
        redirect: "follow",
        headers: {
          "user-agent": userAgent,
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
      });
      clearTimeout(timeout);
      if (!response.ok) {
        const msg = `HTTP ${response.status} ${response.statusText}`;
        if (attempt > retries) throw new Error(msg);
        continue;
      }
      const contentType = response.headers.get("content-type") || "";
      const text = await response.text();
      return { text, contentType, finalUrl: response.url };
    } catch (error) {
      clearTimeout(timeout);
      if (attempt > retries) throw error;
    }
  }
  throw new Error("Unexpected fetch retry failure");
}

async function discoverPageUrls(args, scopeUrl) {
  const sitemapSeed = cleanUrl(args.sitemapUrl);
  const sitemapQueue = [sitemapSeed.href];
  const seenSitemaps = new Set();
  const pageUrls = new Set();

  while (sitemapQueue.length > 0) {
    const current = sitemapQueue.shift();
    if (!current || seenSitemaps.has(current)) continue;
    seenSitemaps.add(current);

    let payload;
    try {
      payload = await fetchWithRetry(current, {
        retries: args.retries,
        timeoutMs: args.timeoutMs,
        delayMs: args.delayMs,
      });
    } catch (error) {
      console.warn(`sitemap-fetch-failed: ${current} (${error.message})`);
      continue;
    }

    const base = new URL(payload.finalUrl || current);
    const isXml =
      payload.contentType.includes("xml") ||
      current.endsWith(".xml") ||
      payload.text.trimStart().startsWith("<?xml");

    const links = isXml
      ? extractLinksFromXml(payload.text)
      : extractLinksFromHtml(payload.text, base.href);

    for (const raw of links) {
      let link;
      try {
        link = cleanUrl(raw);
      } catch {
        continue;
      }
      if (!inScope(link, scopeUrl)) continue;
      if (isLikelySitemap(link)) {
        if (!seenSitemaps.has(link.href)) sitemapQueue.push(link.href);
        continue;
      }
      if (isLikelyHtmlUrl(link)) pageUrls.add(link.href);
    }
  }

  return Array.from(pageUrls).sort((a, b) => a.localeCompare(b));
}

async function runPool(items, concurrency, worker) {
  let index = 0;
  const results = [];

  async function runOne() {
    while (index < items.length) {
      const myIndex = index;
      index += 1;
      results[myIndex] = await worker(items[myIndex], myIndex);
    }
  }

  const runners = Array.from({ length: concurrency }, () => runOne());
  await Promise.all(runners);
  return results;
}

async function ensureDir(filePath) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

async function main() {
  const startedAt = Date.now();
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const scopeUrl = cleanUrl(args.startUrl);
  const outDir = path.resolve(args.outDir);

  console.log(`start-url: ${scopeUrl.href}`);
  console.log(`sitemap-url: ${args.sitemapUrl}`);
  console.log(`out: ${outDir}`);

  const discovered = await discoverPageUrls(args, scopeUrl);
  const urls = discovered.slice(0, args.maxPages);

  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(path.join(outDir, "urls.txt"), `${urls.join("\n")}\n`, "utf8");

  console.log(`discovered: ${discovered.length}`);
  if (urls.length !== discovered.length) {
    console.log(`capped-to-max-pages: ${urls.length}`);
  }

  const manifest = [];
  let ok = 0;
  let failed = 0;

  if (!args.dryRun) {
    await runPool(urls, args.concurrency, async (url) => {
      const entry = {
        url,
        status: "failed",
        statusCode: 0,
        title: "",
        outputPath: "",
        error: "",
      };
      try {
        const pageUrl = cleanUrl(url);
        const payload = await fetchWithRetry(pageUrl.href, {
          retries: args.retries,
          timeoutMs: args.timeoutMs,
          delayMs: args.delayMs,
        });
        const final = cleanUrl(payload.finalUrl || pageUrl.href);
        const outputPath = urlToOutputPath(outDir, final);
        await ensureDir(outputPath);
        await fs.writeFile(outputPath, payload.text, "utf8");
        entry.status = "ok";
        entry.statusCode = 200;
        entry.title = titleFromHtml(payload.text);
        entry.outputPath = toPosixPath(path.relative(outDir, outputPath));
        ok += 1;
      } catch (error) {
        failed += 1;
        entry.error = error.message || String(error);
      }
      manifest.push(entry);
      return entry;
    });
  }

  manifest.sort((a, b) => a.url.localeCompare(b.url));
  await fs.writeFile(
    path.join(outDir, "manifest.json"),
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        startUrl: scopeUrl.href,
        sitemapUrl: args.sitemapUrl,
        discoveredCount: discovered.length,
        attemptedCount: args.dryRun ? 0 : urls.length,
        okCount: ok,
        failedCount: failed,
        dryRun: args.dryRun,
        entries: manifest,
      },
      null,
      2
    )}\n`,
    "utf8"
  );

  const elapsedMs = Date.now() - startedAt;
  console.log(`written-manifest: ${path.join(outDir, "manifest.json")}`);
  console.log(`elapsed-ms: ${elapsedMs}`);
  if (args.dryRun) {
    console.log("dry-run: no page files written");
  } else {
    console.log(`downloaded-ok: ${ok}`);
    console.log(`downloaded-failed: ${failed}`);
  }
}

main().catch((error) => {
  console.error(`error: ${error.message}`);
  process.exitCode = 1;
});
