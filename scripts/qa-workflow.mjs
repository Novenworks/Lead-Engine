/**
 * End-to-end workflow QA.
 *
 * Drives the workflow the spec calls the product test:
 *   search a market → review results → add a prospect → inspect the site →
 *   read the Signal Stack → qualify → see RUN AUDIT become the next action →
 *   confirm the unavailable-integration state is honest.
 *
 * Run with:  node scripts/qa-workflow.mjs [baseUrl]
 */
import { chromium } from "playwright";
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";

const BASE = process.argv[2] ?? "http://localhost:3100";
const OUT = "qa-screenshots";
const steps = [];
const failures = [];

// A unique business per run, so a re-run starts from a clean prospect rather
// than inheriting the previous run's audit request and stage.
const RUN_ID = Date.now().toString(36).slice(-6);
const BUSINESS = `Willow Creek Garage Doors ${RUN_ID}`;
const DOMAIN = `willowcreek-${RUN_ID}.example`;
// A distinct phone too: phone number is a strong dedupe identifier, so reusing
// one would (correctly) reopen the previous run's prospect instead of creating one.
const PHONE = `(909) 555-${String(Date.now() % 10000).padStart(4, "0")}`;

function check(label, condition, detail = "") {
  if (condition) steps.push(`✓ ${label}`);
  else failures.push(`✕ ${label}${detail ? ` — ${detail}` : ""}`);
}

const executablePath =
  process.env.QA_CHROMIUM_PATH ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const browser = await chromium.launch(existsSync(executablePath) ? { executablePath } : {});
await mkdir(OUT, { recursive: true });

const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
page.on("console", (m) => {
  if (m.type() === "error") failures.push(`✕ console error: ${m.text()}`);
});

try {
  // 1 — Run a market search.
  await page.goto(`${BASE}/discover`, { waitUntil: "networkidle" });
  await page.fill("#category", "Plumber");
  await page.fill("#locationText", "Redlands, CA");
  await page.selectOption("#radiusMeters", "48280");
  await page.click('button:has-text("Search market")');
  await page.waitForURL(/\/discover\?run=/, { timeout: 20_000 });
  await page.waitForLoadState("networkidle");

  const resultsText = await page.textContent("body");
  check("discovery search returns results", resultsText.includes("Cedar Peak Plumbing"));
  check("demo results are labelled as fictional", resultsText.includes("demo data — fictional"));
  await page.screenshot({ path: `${OUT}/flow-1-discovery.png` });

  // 2 — Results already tracked are shown as such rather than re-offered.
  check(
    "already-tracked results are marked, not duplicated",
    resultsText.includes("already tracked"),
  );

  // 3 — Add a brand-new prospect by hand.
  await page.goto(`${BASE}/prospects`, { waitUntil: "networkidle" });
  await page.click('button:has-text("Add prospect")');
  await page.waitForSelector("#name", { state: "visible" });
  await page.fill("#name", BUSINESS);
  await page.fill("#websiteUrl", DOMAIN);
  await page.fill("#category", "Garage door supplier");
  await page.fill("#phone", PHONE);
  await page.fill("#city", "Redlands");
  await page.fill("#region", "CA");
  await page.click('button:has-text("Create prospect")');
  await page.waitForURL(/\/prospects\/[a-z0-9]+/, { timeout: 20_000 });
  await page.waitForLoadState("networkidle");

  const detail = await page.textContent("body");
  check("manual prospect is created and opened", detail.includes(BUSINESS));
  check("a prospect starts scored", /\d+\s*\/100/.test(detail));
  await page.screenshot({ path: `${OUT}/flow-2-detail.png` });

  // 4 — Duplicate prevention: entering the same business again must not create a second record.
  const firstUrl = page.url();
  await page.goto(`${BASE}/prospects`, { waitUntil: "networkidle" });
  await page.click('button:has-text("Add prospect")');
  await page.waitForSelector("#name", { state: "visible" });
  await page.fill("#name", `${BUSINESS} LLC`);
  await page.fill("#websiteUrl", `https://www.${DOMAIN}/home`);
  await page.click('button:has-text("Create prospect")');
  await page.waitForURL(/\/prospects\/[a-z0-9]+/, { timeout: 20_000 });
  check(
    "re-entering the same business opens the existing record",
    page.url() === firstUrl,
    `expected ${firstUrl}, got ${page.url()}`,
  );

  // 5 — Inspect the website. The worker does the fetch; the fixture domains use
  // the reserved .example TLD, so this exercises the honest failure path
  // (unreachable site) rather than pretending a site loaded.
  await page.goto(firstUrl, { waitUntil: "networkidle" });
  await page.click('aside button:has-text("Inspect website")');
  await page.waitForTimeout(1500);
  const queued = await page.textContent("body");
  check("website inspection is queued to the worker", queued.includes("queued"));

  // Give the worker a few poll cycles to pick the job up and finish it.
  let enriched = "";
  for (let attempt = 0; attempt < 15; attempt++) {
    await page.waitForTimeout(2000);
    await page.reload({ waitUntil: "networkidle" });
    enriched = await page.textContent("body");
    if (!enriched.includes("queued for the worker")) break;
  }
  check(
    "the worker processed the enrichment job",
    !enriched.includes("queued for the worker"),
    "job still queued after 30s — is the worker running?",
  );
  check(
    "an unreachable site is reported honestly, not as a success",
    enriched.includes("did not load") || enriched.includes("Website inspection failed") ||
      enriched.includes("does not load"),
  );
  await page.screenshot({ path: `${OUT}/flow-2b-enriched.png` });

  // 6 — The Signal Stack explains the score.
  await page.goto(firstUrl, { waitUntil: "networkidle" });
  await page.click('button[role="tab"]:has-text("Signals")');
  await page.waitForTimeout(300);
  const signals = await page.textContent('[role="tabpanel"]:not([hidden])');
  check("Signal Stack shows why the score landed where it did", signals.includes("Why this scored"));
  check("score components name their evidence", signals.includes("BUSINESS_CATEGORY"));
  check("components carry a plain-language reason", signals.includes("Matches target category"));
  await page.screenshot({ path: `${OUT}/flow-3-signal-stack.png` });

  // 7 — Qualify, then confirm RUN AUDIT becomes the primary action.
  await page.selectOption("#qualification", "QUALIFIED");
  await page.click('button:has-text("Save qualification")');
  await page.waitForTimeout(2500);
  await page.reload({ waitUntil: "networkidle" });

  const qualified = await page.textContent("body");
  check("prospect is marked qualified", qualified.includes("qualified"));
  const primaryButton = await page.textContent(
    'aside button.bg-volt-400, aside button:has-text("Run audit")',
  );
  check(
    "the primary action becomes Run audit once qualified",
    (primaryButton ?? "").includes("Run audit"),
    `primary button read "${primaryButton}"`,
  );
  await page.screenshot({ path: `${OUT}/flow-4-qualified.png` });

  // 8 — The unavailable AuditWorkspace integration must be honest.
  await page.click('button[role="tab"]:has-text("Integrations")');
  await page.waitForTimeout(300);
  const integrations = await page.textContent('[role="tabpanel"]:not([hidden])');
  check("AuditWorkspace reports that it is not configured", integrations.includes("not configured"));
  check(
    "the unavailable state explains what happens instead",
    integrations.includes("sent once the integration is configured"),
  );

  await page.click('button:has-text("Run audit")');
  await page.waitForTimeout(2500);
  const afterAudit = await page.textContent("body");
  check(
    "requesting an audit while unconfigured says so instead of faking success",
    afterAudit.includes("not configured, so the request is recorded"),
  );
  check("no fake audit id is displayed", !/audit\s+[a-f0-9]{8}/i.test(afterAudit));
  await page.screenshot({ path: `${OUT}/flow-5-integration-unavailable.png` });

  // 9 — Duplicate review screen offers a real decision.
  await page.goto(`${BASE}/duplicates`, { waitUntil: "networkidle" });
  const duplicates = await page.textContent("body");
  check("weak duplicates are surfaced for a human", duplicates.includes("Summit HVAC"));
  check("merge is offered but not performed automatically", duplicates.includes("Merge into one record"));
  await page.screenshot({ path: `${OUT}/flow-6-duplicates.png` });

  // 10 — Filters actually filter, server-side.
  await page.goto(`${BASE}/prospects?qualification=QUALIFIED&website=without`, {
    waitUntil: "networkidle",
  });
  const filtered = await page.textContent("body");
  check("filters narrow the list", filtered.includes("Mesa Electric Co"));
  check("filters exclude non-matching rows", !filtered.includes("Cedar Peak Plumbing"));

  // 11 — Empty state for a filter that matches nothing.
  await page.goto(`${BASE}/prospects?q=zzzznothing`, { waitUntil: "networkidle" });
  const empty = await page.textContent("body");
  check("an empty result set explains itself", empty.includes("No prospects match these filters"));
} catch (error) {
  failures.push(`✕ workflow aborted: ${error.message}`);
} finally {
  await browser.close();
}

console.log(steps.join("\n"));
if (failures.length > 0) {
  console.error(`\n${failures.length} failure(s):\n${failures.join("\n")}`);
  process.exit(1);
}
console.log(`\nWorkflow QA passed: ${steps.length} checks.`);
