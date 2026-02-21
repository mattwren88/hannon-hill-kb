#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

function parseArgs(argv) {
  const args = {
    manifest: "_downloads/hannonhill-kb/manifest.json",
    docsRoot: "docs",
    outDir: "_downloads/hannonhill-kb",
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--manifest") {
      args.manifest = argv[++i] || "";
      continue;
    }
    if (token === "--docs-root") {
      args.docsRoot = argv[++i] || "";
      continue;
    }
    if (token === "--out-dir") {
      args.outDir = argv[++i] || "";
      continue;
    }
    if (token === "--help" || token === "-h") {
      printHelp();
      process.exit(0);
    }
    throw new Error(`Unknown argument: ${token}`);
  }

  if (!args.manifest) throw new Error("Missing --manifest");
  if (!args.docsRoot) throw new Error("Missing --docs-root");
  if (!args.outDir) throw new Error("Missing --out-dir");
  return args;
}

function printHelp() {
  console.log(
    [
      "Build KB review queue by matching downloaded Hannon Hill URLs to local docs pages.",
      "",
      "Usage:",
      "  node scripts/build-kb-review-queue.mjs [options]",
      "",
      "Options:",
      "  --manifest <file>   Manifest JSON from downloader (default: _downloads/hannonhill-kb/manifest.json)",
      "  --docs-root <dir>   Local docs root (default: docs)",
      "  --out-dir <dir>     Output directory (default: _downloads/hannonhill-kb)",
      "",
      "Output:",
      "  <out-dir>/review-queue.json",
      "  <out-dir>/review-queue.csv",
      "  <out-dir>/review-queue.md",
    ].join("\n")
  );
}

function toPosixPath(value) {
  return value.split(path.sep).join("/");
}

function normalizeSegments(segments) {
  return segments.filter(Boolean).map((part) => part.trim()).filter(Boolean);
}

function localDocKeyFromPath(localPath) {
  const posix = toPosixPath(localPath);
  const prefix = "docs/";
  if (!posix.startsWith(prefix) || !posix.endsWith("/index.html")) return "";
  const middle = posix.slice(prefix.length, -"/index.html".length);
  return normalizeSegments(middle.split("/")).join("/");
}

function kbKeyFromUrl(urlString) {
  const url = new URL(urlString);
  const prefix = "/cascadecms/latest/";
  if (!url.pathname.startsWith(prefix)) return "";
  let rest = url.pathname.slice(prefix.length);
  if (rest.endsWith("/")) rest += "index.html";

  const ext = path.posix.extname(rest);
  if (ext && ext !== ".html") return "";

  const parts = normalizeSegments(rest.split("/"));
  if (parts.length === 0) return "";

  if (parts[parts.length - 1] === "index.html") {
    parts.pop();
    return parts.join("/");
  }

  const last = parts[parts.length - 1];
  if (last.endsWith(".html")) {
    parts[parts.length - 1] = last.slice(0, -".html".length);
  }
  return parts.join("/");
}

async function findFilesRecursive(rootDir) {
  const results = [];

  async function walk(current) {
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else if (entry.isFile()) {
        results.push(full);
      }
    }
  }

  await walk(rootDir);
  return results;
}

function csvEscape(value) {
  const s = String(value ?? "");
  if (s.includes('"') || s.includes(",") || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const manifestPath = path.resolve(args.manifest);
  const docsRoot = path.resolve(args.docsRoot);
  const outDir = path.resolve(args.outDir);

  const manifestRaw = await fs.readFile(manifestPath, "utf8");
  const manifest = JSON.parse(manifestRaw);
  const entries = Array.isArray(manifest.entries) ? manifest.entries : [];

  const docFiles = await findFilesRecursive(docsRoot);
  const indexFiles = docFiles.filter((f) => toPosixPath(f).endsWith("/index.html"));

  const localByKey = new Map();
  for (const fullPath of indexFiles) {
    const rel = toPosixPath(path.relative(process.cwd(), fullPath));
    const key = localDocKeyFromPath(rel);
    if (key && !localByKey.has(key)) {
      localByKey.set(key, rel);
    }
  }

  const kbByKey = new Map();
  const unmatchedKb = [];
  for (const entry of entries) {
    if (entry.status !== "ok" || !entry.url) continue;
    const key = kbKeyFromUrl(entry.url);
    if (!key) continue;
    if (!kbByKey.has(key)) kbByKey.set(key, entry);
  }

  const matched = [];
  for (const [key, kbEntry] of kbByKey.entries()) {
    const localPath = localByKey.get(key);
    if (!localPath) {
      unmatchedKb.push({
        key,
        kbUrl: kbEntry.url,
        kbTitle: kbEntry.title || "",
        downloadedHtmlPath: kbEntry.outputPath || "",
      });
      continue;
    }
    matched.push({
      key,
      kbUrl: kbEntry.url,
      kbTitle: kbEntry.title || "",
      downloadedHtmlPath: kbEntry.outputPath || "",
      localDocPath: localPath,
      status: "pending",
    });
  }

  const unmatchedLocal = [];
  for (const [key, localPath] of localByKey.entries()) {
    if (!kbByKey.has(key)) {
      unmatchedLocal.push({
        key,
        localDocPath: localPath,
      });
    }
  }

  matched.sort((a, b) => a.key.localeCompare(b.key));
  unmatchedKb.sort((a, b) => a.key.localeCompare(b.key));
  unmatchedLocal.sort((a, b) => a.key.localeCompare(b.key));

  await fs.mkdir(outDir, { recursive: true });

  const queueJsonPath = path.join(outDir, "review-queue.json");
  const queueCsvPath = path.join(outDir, "review-queue.csv");
  const queueMdPath = path.join(outDir, "review-queue.md");

  const queueJson = {
    generatedAt: new Date().toISOString(),
    sourceManifest: toPosixPath(path.relative(process.cwd(), manifestPath)),
    docsRoot: toPosixPath(path.relative(process.cwd(), docsRoot)),
    counts: {
      manifestEntries: entries.length,
      localDocs: localByKey.size,
      matched: matched.length,
      unmatchedKb: unmatchedKb.length,
      unmatchedLocal: unmatchedLocal.length,
    },
    matched,
    unmatchedKb,
    unmatchedLocal,
  };

  await fs.writeFile(queueJsonPath, `${JSON.stringify(queueJson, null, 2)}\n`, "utf8");

  const csvHeader = [
    "status",
    "key",
    "kb_url",
    "kb_title",
    "downloaded_html_path",
    "local_doc_path",
  ];
  const csvRows = [csvHeader.join(",")];
  for (const row of matched) {
    csvRows.push(
      [
        csvEscape(row.status),
        csvEscape(row.key),
        csvEscape(row.kbUrl),
        csvEscape(row.kbTitle),
        csvEscape(row.downloadedHtmlPath),
        csvEscape(row.localDocPath),
      ].join(",")
    );
  }
  await fs.writeFile(queueCsvPath, `${csvRows.join("\n")}\n`, "utf8");

  const mdLines = [];
  mdLines.push("# KB Review Queue");
  mdLines.push("");
  mdLines.push(`Generated: ${queueJson.generatedAt}`);
  mdLines.push("");
  mdLines.push("## Counts");
  mdLines.push("");
  mdLines.push(`- Matched: ${matched.length}`);
  mdLines.push(`- Unmatched KB: ${unmatchedKb.length}`);
  mdLines.push(`- Unmatched Local: ${unmatchedLocal.length}`);
  mdLines.push("");
  mdLines.push("## Matched Pages");
  mdLines.push("");
  mdLines.push("| Status | Key | Local Doc | Downloaded HTML | KB URL |");
  mdLines.push("|---|---|---|---|---|");
  for (const row of matched) {
    mdLines.push(
      `| ${row.status} | \`${row.key}\` | \`${row.localDocPath}\` | \`${row.downloadedHtmlPath}\` | ${row.kbUrl} |`
    );
  }

  if (unmatchedKb.length > 0) {
    mdLines.push("");
    mdLines.push("## Unmatched KB");
    mdLines.push("");
    for (const row of unmatchedKb) {
      mdLines.push(`- \`${row.key}\` -> ${row.kbUrl}`);
    }
  }

  if (unmatchedLocal.length > 0) {
    mdLines.push("");
    mdLines.push("## Unmatched Local");
    mdLines.push("");
    for (const row of unmatchedLocal) {
      mdLines.push(`- \`${row.key}\` -> \`${row.localDocPath}\``);
    }
  }

  await fs.writeFile(queueMdPath, `${mdLines.join("\n")}\n`, "utf8");

  console.log(`review-queue-json: ${toPosixPath(path.relative(process.cwd(), queueJsonPath))}`);
  console.log(`review-queue-csv: ${toPosixPath(path.relative(process.cwd(), queueCsvPath))}`);
  console.log(`review-queue-md: ${toPosixPath(path.relative(process.cwd(), queueMdPath))}`);
  console.log(`matched: ${matched.length}`);
  console.log(`unmatched-kb: ${unmatchedKb.length}`);
  console.log(`unmatched-local: ${unmatchedLocal.length}`);
}

main().catch((error) => {
  console.error(`error: ${error.message}`);
  process.exitCode = 1;
});
