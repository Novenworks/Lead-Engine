/**
 * Browser QA sweep.
 *
 * Loads every screen at three widths, captures a screenshot, and fails on:
 *   - page-level horizontal overflow (the mobile killer)
 *   - console errors
 *   - failed network requests
 *   - missing expected content
 *
 * Run with:  node scripts/qa.mjs [baseUrl]
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";

const BASE = process.argv[2] ?? "http://localhost:3100";
const OUT = "qa-screenshots";

const VIEWPORTS = [
  { name: "1440", width: 1440, height: 900 },
  { name: "1024", width: 1024, height: 768 },
  { name: "390", width: 390, height: 844 },
];

const PAGES = [
  { path: "/discover", expect: "Discover" },
  { path: "/prospects", expect: "Prospects" },
  { path: "/prospects?view=matrix", expect: "Opportunity matrix", name: "prospects-matrix" },
  { path: "/pipeline", expect: "Pipeline" },
  { path: "/duplicates", expect: "Possible duplicate" },
  { path: "/saved", expect: "Saved searches" },
  { path: "/activity", expect: "Activity" },
  { path: "/settings", expect: "Scoring model" },
];

const failures = [];

async function checkPage(page, target, viewport) {
  const label = `${target.name ?? target.path.replace(/[/?=]/g, "_")} @ ${viewport.name}`;
  const consoleErrors = [];
  const networkErrors = [];

  const onConsole = (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  };
  const onResponse = (response) => {
    if (response.status() >= 400) networkErrors.push(`${response.status()} ${response.url()}`);
  };
  page.on("console", onConsole);
  page.on("response", onResponse);

  await page.goto(`${BASE}${target.path}`, { waitUntil: "networkidle", timeout: 30_000 });

  const body = await page.textContent("body");
  if (target.expect && !body.includes(target.expect)) {
    failures.push(`${label}: expected text "${target.expect}" not found`);
  }

  const overflow = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  if (overflow.scrollWidth > overflow.clientWidth + 1) {
    failures.push(
      `${label}: horizontal overflow — scrollWidth ${overflow.scrollWidth} > clientWidth ${overflow.clientWidth}`,
    );
  }

  for (const error of consoleErrors) failures.push(`${label}: console error — ${error}`);
  for (const error of networkErrors) failures.push(`${label}: request failed — ${error}`);

  await page.screenshot({
    path: `${OUT}/${(target.name ?? target.path.replace(/[/?=]/g, "_")).replace(/^_/, "")}-${viewport.name}.png`,
    fullPage: false,
  });

  page.off("console", onConsole);
  page.off("response", onResponse);
}

// This environment ships a pinned Chromium build that may not match the
// installed Playwright's expected revision, so dial it directly.
const executablePath =
  process.env.QA_CHROMIUM_PATH ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const browser = await chromium.launch(existsSync(executablePath) ? { executablePath } : {});
await mkdir(OUT, { recursive: true });

for (const viewport of VIEWPORTS) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  for (const target of PAGES) {
    try {
      await checkPage(page, target, viewport);
    } catch (error) {
      failures.push(`${target.path} @ ${viewport.name}: ${error.message}`);
    }
  }
  await context.close();
}

await browser.close();

if (failures.length > 0) {
  console.error(`\n${failures.length} QA failure(s):\n`);
  for (const failure of failures) console.error(`  ✕ ${failure}`);
  process.exit(1);
}
console.log(
  `\nQA passed: ${PAGES.length} pages × ${VIEWPORTS.length} viewports, no overflow or errors.`,
);
