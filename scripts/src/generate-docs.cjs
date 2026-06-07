const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

const NAVY = "#0B1220";
const BLUE = "#2563EB";
const BLUE_LIGHT = "#60A5FA";
const WHITE = "#FFFFFF";
const OFFWHITE = "#E2E8F0";
const GRAY = "#64748B";
const DARK = "#1E293B";
const TEXT = "#334155";
const RULE = "#E2E8F0";
const ROW_ALT = "#F8FAFC";

// ── LE monogram polygon points (viewBox 0 0 100 112) ──────────────────────────
function drawLEMark(doc, x, y, height) {
  const s = height / 112;
  const pts = [
    [0, 0], [100, 0], [100, 20], [18, 20],
    [18, 42], [90, 42], [90, 59], [18, 59],
    [18, 76], [100, 76], [88, 112], [0, 112],
  ].map(([px, py]) => [x + px * s, y + py * s]);
  doc.polygon(...pts).fill(BLUE);
}

// ── Dark navy rounded badge with LE mark ─────────────────────────────────────
function drawLEBadge(doc, x, y, badgeSize) {
  const r = badgeSize * 0.22;
  doc.roundedRect(x, y, badgeSize, badgeSize, r).fill(NAVY);
  const markH = badgeSize * 0.6;
  const markW = markH * (100 / 112);
  drawLEMark(doc, x + (badgeSize - markW) / 2, y + (badgeSize - markH) / 2, markH);
}

// ── Page header band ─────────────────────────────────────────────────────────
function drawHeader(doc, title, subtitle, tagline) {
  const W = doc.page.width;
  const H = 130;

  doc.rect(0, 0, W, H).fill(NAVY);

  // Subtle gradient overlay — narrow blue bar on left
  doc.rect(0, 0, 6, H).fill(BLUE);

  // LE badge
  const badgeSize = 46;
  drawLEBadge(doc, 56, (H - badgeSize) / 2, badgeSize);

  // Wordmark
  doc.font("Helvetica-Bold").fontSize(22).fillColor(WHITE)
    .text("Lead", 114, 40, { continued: true })
    .fillColor(BLUE).text("Engine");

  doc.font("Helvetica").fontSize(8).fillColor("rgba(147,197,253,0.7)")
    .text("BY NOVENWORKS", 114, 66, { characterSpacing: 1.5 });

  // Right side — title block
  doc.font("Helvetica-Bold").fontSize(14).fillColor(WHITE)
    .text(title, 300, 38, { width: W - 360, align: "right" });

  doc.font("Helvetica").fontSize(9).fillColor(OFFWHITE)
    .text(subtitle, 300, 57, { width: W - 360, align: "right" });

  doc.font("Helvetica").fontSize(8).fillColor(GRAY)
    .text(tagline, 300, 72, { width: W - 360, align: "right" });

  // Bottom divider
  doc.moveTo(0, H).lineTo(W, H).strokeColor(BLUE).lineWidth(1.5).stroke();
}

// ── Footer ────────────────────────────────────────────────────────────────────
function drawFooter(doc, pageNum) {
  const W = doc.page.width;
  const y = doc.page.height - 40;
  doc.moveTo(56, y).lineTo(W - 56, y).strokeColor(RULE).lineWidth(0.5).stroke();
  doc.font("Helvetica").fontSize(8).fillColor(GRAY)
    .text("LeadEngine by Novenworks  ·  Confidential", 56, y + 8);
  doc.text(`${pageNum}`, 56, y + 8, { width: W - 112, align: "right" });
}

// ── Section heading with blue left bar ───────────────────────────────────────
function sectionHead(doc, num, title, y) {
  doc.rect(56, y, 3, 22).fill(BLUE);
  doc.font("Helvetica-Bold").fontSize(7).fillColor(BLUE)
    .text(`${num < 10 ? "0" + num : num}`, 66, y + 2);
  doc.font("Helvetica-Bold").fontSize(13).fillColor(DARK)
    .text(title, 84, y, { width: 460 });
  doc.moveTo(56, y + 26).lineTo(doc.page.width - 56, y + 26)
    .strokeColor(RULE).lineWidth(0.5).stroke();
  return y + 38;
}

// ── Body text paragraph ───────────────────────────────────────────────────────
function para(doc, text, x, y, opts = {}) {
  doc.font("Helvetica").fontSize(9.5).fillColor(TEXT)
    .text(text, x, y, { width: opts.width || 480, lineGap: 3, ...opts });
  return doc.y + 6;
}

// ── Bullet item ───────────────────────────────────────────────────────────────
function bullet(doc, text, x, y, indent = 0) {
  doc.font("Helvetica").fontSize(9).fillColor(BLUE).text("▸", x + indent, y);
  doc.font("Helvetica").fontSize(9).fillColor(TEXT)
    .text(text, x + indent + 14, y, { width: 460 - indent, lineGap: 2 });
  return doc.y + 4;
}

// ── Table row ─────────────────────────────────────────────────────────────────
function tableRow(doc, cols, y, isHeader, colWidths) {
  const x = 56;
  const rowH = isHeader ? 18 : 22;
  const totalW = colWidths.reduce((a, b) => a + b, 0);

  if (isHeader) {
    doc.rect(x, y, totalW, rowH).fill(NAVY);
  } else if (!isHeader && (doc._tableRowIdx % 2 === 1)) {
    doc.rect(x, y, totalW, rowH).fill(ROW_ALT);
  }

  let cx = x + 8;
  cols.forEach((col, i) => {
    if (isHeader) {
      doc.font("Helvetica-Bold").fontSize(8).fillColor(WHITE)
        .text(col, cx, y + 5, { width: colWidths[i] - 8 });
    } else {
      const isBold = i === 0;
      doc.font(isBold ? "Helvetica-Bold" : "Helvetica").fontSize(8.5)
        .fillColor(isBold ? DARK : TEXT)
        .text(col, cx, y + 6, { width: colWidths[i] - 8, lineGap: 1 });
    }
    cx += colWidths[i];
  });

  doc._tableRowIdx = (doc._tableRowIdx || 0) + 1;
  return y + rowH + (isHeader ? 0 : 1);
}

// ─────────────────────────────────────────────────────────────────────────────
// DOCUMENT 1: TECHNICAL ANALYSIS REPORT
// ─────────────────────────────────────────────────────────────────────────────
function generateTechnicalReport(outPath) {
  const doc = new PDFDocument({ size: "LETTER", margins: { top: 150, bottom: 50, left: 56, right: 56 }, autoFirstPage: true });
  doc.pipe(fs.createWriteStream(outPath));

  let page = 1;

  drawHeader(doc, "Project Analysis Report", "LeadEngine — Full Technical Breakdown", "June 2026  ·  Internal Reference");

  // ── 1. App Summary ────────────────────────────────────────────────────────
  let y = 158;
  y = sectionHead(doc, 1, "App Summary", y);
  y = para(doc,
    "LeadEngine is a white-label, multi-client lead capture CRM built for Novenworks — a marketing agency that runs lead generation for multiple local service businesses. " +
    "Client websites embed a contact form snippet that routes leads directly into one central platform. Business owners each log in to a private dashboard showing only " +
    "their own leads. Agency admins see and manage everything across every client.",
    56, y);

  y += 14;

  // ── 2. Main User Flows ───────────────────────────────────────────────────
  y = sectionHead(doc, 2, "Main User Flows", y);
  doc.font("Helvetica-Bold").fontSize(9).fillColor(DARK).text("Agency Admin (Novenworks)", 56, y); y = doc.y + 4;
  y = bullet(doc, "Logs in → views all leads across all clients on one dashboard", 56, y);
  y = bullet(doc, "Creates a workspace per client → generates embed code for their website", 56, y);
  y = bullet(doc, "Monitors full pipeline, switches between clients, manages accounts", 56, y);
  y += 8;
  doc.font("Helvetica-Bold").fontSize(9).fillColor(DARK).text("Business Owner", 56, y); y = doc.y + 4;
  y = bullet(doc, "Logs in with business email → sees only their own leads (enforced server-side)", 56, y);
  y = bullet(doc, "Moves leads through stages: New → Contacted → Booked → Won / Lost", 56, y);
  y = bullet(doc, "Adds notes, tracks pipeline value, sees follow-up reminders", 56, y);
  y += 8;
  doc.font("Helvetica-Bold").fontSize(9).fillColor(DARK).text("Website Visitor (form submitter)", 56, y); y = doc.y + 4;
  y = bullet(doc, "Fills out the embedded contact form on a client's website", 56, y);
  y = bullet(doc, "Form POSTs to the public /api/leads/capture endpoint", 56, y);
  y = bullet(doc, "Lead is saved to the database and the business owner receives an email alert", 56, y);

  y += 14;

  // ── 3. Pages & Routes ───────────────────────────────────────────────────
  y = sectionHead(doc, 3, "Pages & Routes", y);
  doc._tableRowIdx = 0;
  y = tableRow(doc, ["Route", "Access", "Purpose"], y, true, [160, 100, 220]);
  const routes = [
    ["/login", "Public", "Email + password sign-in"],
    ["/dashboard", "All users", "Stats cards, recent leads, follow-up list"],
    ["/leads", "All users", "Searchable, filterable leads table (role-scoped)"],
    ["/pipeline", "All users", "Drag-and-drop Kanban board by status"],
    ["/clients", "Admin only", "All workspace accounts, create/edit/delete"],
    ["/clients/:id", "Admin only", "Single workspace detail, embed code, API key"],
    ["/settings", "All users", "Profile page (minimal content currently)"],
  ];
  routes.forEach(r => { y = tableRow(doc, r, y, false, [160, 100, 220]); });

  y += 14;

  // ── 4. Database Tables ───────────────────────────────────────────────────
  y = sectionHead(doc, 4, "Database Models / Tables", y);

  const tables = [
    { name: "users", fields: "id, email, name, passwordHash, role (admin|owner), clientId, createdAt" },
    { name: "clients", fields: "id, businessName, slug, ownerEmail, notificationEmail, apiKey, websiteUrl, industry, isActive, automationEnabled, emailSequenceEnabled, smsSequenceEnabled, aiFollowupEnabled, reviewRequestEnabled, createdAt" },
    { name: "leads", fields: "id, clientId, name, email, phone, serviceInterest, message, source, status (New|Contacted|Booked|Won|Lost), notes, estimatedValue, monthlyRecurringValue, assignedToId, lastContactedAt, createdAt, updatedAt" },
    { name: "activity_log", fields: "id, leadId, clientId, userId, action (text), metadata (JSONB), createdAt" },
  ];

  tables.forEach(t => {
    doc.font("Helvetica-Bold").fontSize(9).fillColor(BLUE).text(t.name, 56, y);
    y = doc.y + 2;
    doc.font("Helvetica").fontSize(8.5).fillColor(GRAY)
      .text(t.fields, 56, y, { width: 480, lineGap: 2 });
    y = doc.y + 10;
  });

  // ── New page ─────────────────────────────────────────────────────────────
  drawFooter(doc, page++);
  doc.addPage({ margins: { top: 150, bottom: 50, left: 56, right: 56 } });
  drawHeader(doc, "Project Analysis Report", "LeadEngine — Full Technical Breakdown", "June 2026  ·  Internal Reference");
  y = 158;

  // ── 5. API Endpoints ─────────────────────────────────────────────────────
  y = sectionHead(doc, 5, "API Endpoints", y);
  doc._tableRowIdx = 0;
  y = tableRow(doc, ["Method + Path", "Auth", "Description"], y, true, [210, 80, 190]);
  const apis = [
    ["GET /api/healthz", "Public", "Health check"],
    ["POST /api/auth/login", "Public", "Email + password login"],
    ["POST /api/auth/logout", "Session", "End session"],
    ["GET /api/auth/me", "Session", "Get current user"],
    ["GET /api/clients", "Session", "List workspaces (admin=all, owner=own)"],
    ["POST /api/clients", "Admin", "Create workspace"],
    ["PATCH /api/clients/:id", "Admin", "Update workspace settings/flags"],
    ["DELETE /api/clients/:id", "Admin", "Delete workspace"],
    ["GET /api/clients/:id/embed-code", "Session", "Get HTML embed snippet + API key"],
    ["GET /api/leads", "Session", "List leads with filters"],
    ["GET /api/leads/:id", "Session", "Get single lead"],
    ["PATCH /api/leads/:id", "Session", "Update status, notes, value, assignment"],
    ["GET /api/leads/:id/activity", "Session", "Lead activity log"],
    ["POST /api/leads/:id/activity", "Session", "Add activity entry"],
    ["POST /api/leads/capture", "Public (API key)", "Submit lead from website form"],
    ["GET /api/dashboard/stats", "Session", "Aggregated pipeline stats"],
    ["GET /api/dashboard/recent", "Session", "Recent leads feed"],
    ["GET /api/dashboard/followups", "Session", "Leads needing follow-up"],
  ];
  apis.forEach(r => { y = tableRow(doc, r, y, false, [210, 80, 190]); });

  y += 14;

  // ── 6. Forms & Data Collected ────────────────────────────────────────────
  y = sectionHead(doc, 6, "Forms & Data Collected", y);

  const forms = [
    { name: "Login Form", fields: "email, password" },
    { name: "Public Lead Capture (website embed)", fields: "name (required), email (required), phone, serviceInterest, message, source (auto-captured from request)" },
    { name: "Create Workspace (admin)", fields: "businessName, slug, ownerEmail, notificationEmail, websiteUrl, industry" },
    { name: "Lead Update (drawer)", fields: "status, notes, estimatedValue, monthlyRecurringValue, lastContactedAt, assignedToId" },
  ];

  forms.forEach(f => {
    doc.font("Helvetica-Bold").fontSize(9).fillColor(DARK).text(f.name, 56, y); y = doc.y + 2;
    doc.font("Helvetica").fontSize(8.5).fillColor(TEXT).text(f.fields, 68, y, { width: 468, lineGap: 2 });
    y = doc.y + 10;
  });

  y += 4;

  // ── 7. Email / Resend ────────────────────────────────────────────────────
  y = sectionHead(doc, 7, "Email / Resend Functionality", y);
  y = bullet(doc, "Library: Resend (requires RESEND_API_KEY environment variable)", 56, y);
  y = bullet(doc, 'Trigger: fires on every successful POST /api/leads/capture', 56, y);
  y = bullet(doc, 'Recipient: the notificationEmail field set on each client workspace', 56, y);
  y = bullet(doc, 'From address: LeadEngine <leads@novenworks.com> — domain must be verified in Resend', 56, y);
  y = bullet(doc, 'Content: styled HTML email with name, email, phone, service interest, source, date, message', 56, y);
  y = bullet(doc, 'Behavior: fire-and-forget — errors are logged but do not block the API response', 56, y);
  y = bullet(doc, 'Missing key: silently skipped with a server-side warning log only', 56, y);

  // ── New page ─────────────────────────────────────────────────────────────
  drawFooter(doc, page++);
  doc.addPage({ margins: { top: 150, bottom: 50, left: 56, right: 56 } });
  drawHeader(doc, "Project Analysis Report", "LeadEngine — Full Technical Breakdown", "June 2026  ·  Internal Reference");
  y = 158;

  // ── 8. Admin vs. Owner ───────────────────────────────────────────────────
  y = sectionHead(doc, 8, "Admin vs. Owner Role Differences", y);
  doc._tableRowIdx = 0;
  y = tableRow(doc, ["Capability", "Admin", "Owner"], y, true, [270, 100, 110]);
  const roles = [
    ["View all workspaces (clients)", "✓", "—"],
    ["Create / edit / delete workspaces", "✓", "—"],
    ["View leads across all clients", "✓", "—"],
    ["View own client's leads only", "✓", "✓"],
    ["Update lead status + notes", "✓", "✓"],
    ["Access embed code / API key", "✓", "— (UI only)"],
    ["Dashboard stats", "Global", "Own client only"],
  ];
  roles.forEach(r => { y = tableRow(doc, r, y, false, [270, 100, 110]); });

  y += 14;

  // ── 9. What's Working ────────────────────────────────────────────────────
  y = sectionHead(doc, 9, "What Is Already Working", y);
  const working = [
    "Full auth lifecycle — login, session persistence, logout, role enforcement",
    "Multi-tenant data isolation — owners cannot see other clients' data (enforced server-side)",
    "Public lead capture with client slug + API key validation",
    "Email notification on every new lead (when RESEND_API_KEY is set)",
    "Dashboard stats with real DB calculations (pipeline value, MRR, follow-up count)",
    "5-stage lead status pipeline (New → Contacted → Booked → Won → Lost)",
    "Notes and activity log per lead — every update is timestamped",
    "Drag-and-drop Kanban board (dnd-kit)",
    "Embed code generator per client",
    "Workspace create / edit / delete (admin)",
    "Lead filtering by status, search term, date range, client, and source",
    "Dark premium UI across all pages (global dark mode)",
  ];
  working.forEach(w => { y = bullet(doc, w, 56, y); });

  y += 14;

  // ── 10. Unfinished / Broken ──────────────────────────────────────────────
  y = sectionHead(doc, 10, "What Is Unfinished or Broken", y);
  const broken = [
    "Automation flags (automationEnabled, emailSequenceEnabled, aiFollowupEnabled, etc.) exist in the DB schema but have no backend logic — nothing reads them yet",
    "SMS sequence field (smsSequenceEnabled) exists but no SMS provider is integrated",
    "Lead assignment UI is missing — assignedToId is stored and returned by the API but there is no dropdown to assign leads in the interface",
    "Owners cannot see their own embed code — /clients/:id is admin-only in the frontend router",
    "Settings page exists but contains no editable fields (no password change, no profile edit)",
    "No way to create owner accounts via the UI — must insert rows directly into the database",
    "No lead deletion — leads can be marked Lost but never removed",
    "No pagination — the leads list loads all records at once (will slow down at scale)",
  ];
  broken.forEach(b => { y = bullet(doc, b, 56, y); });

  y += 14;

  // ── 11. Recommended Next Features ───────────────────────────────────────
  y = sectionHead(doc, 11, "Recommended Next Features", y);
  doc.font("Helvetica-Bold").fontSize(9).fillColor(DARK).text("High Impact, Straightforward", 56, y); y = doc.y + 4;
  const hi = [
    "User management UI — admin can invite/create owner accounts and link to a client",
    "Owner embed code access — owners can view their API key and embed snippet from settings",
    "Password change form on the settings page",
    "CSV export of filtered lead lists",
    "Pagination or infinite scroll on the leads list",
  ];
  hi.forEach(h => { y = bullet(doc, h, 56, y); });
  y += 6;
  doc.font("Helvetica-Bold").fontSize(9).fillColor(DARK).text("Medium Impact", 56, y); y = doc.y + 4;
  const med = [
    "Email sequence basics — a simple 'send a follow-up email X days after capture' would activate the emailSequenceEnabled flag already in the schema",
    "Lead assignment UI — dropdown to assign a lead to a named team member",
    "Per-client reporting — monthly volume, conversion rate, source breakdown charts",
    "Bulk lead actions — select multiple leads, change status or assign in one click",
  ];
  med.forEach(m => { y = bullet(doc, m, 56, y); });
  y += 6;
  doc.font("Helvetica-Bold").fontSize(9).fillColor(DARK).text("Longer Term (schema already stubbed)", 56, y); y = doc.y + 4;
  const lt = [
    "SMS notifications (smsSequenceEnabled field ready — needs Twilio or similar)",
    "AI follow-up suggestions (aiFollowupEnabled flag ready)",
    "Review request automation (reviewRequestEnabled flag ready)",
  ];
  lt.forEach(l => { y = bullet(doc, l, 56, y); });

  y += 14;

  // ── 12. Product Positioning ──────────────────────────────────────────────
  y = sectionHead(doc, 12, "Product Positioning", y);
  doc.rect(56, y, 480, 70).fill("#EFF6FF");
  doc.rect(56, y, 3, 70).fill(BLUE);
  doc.font("Helvetica-BoldOblique").fontSize(11).fillColor(DARK)
    .text(
      "LeadEngine is the operations layer for local service business agencies. If you run marketing or lead generation for multiple businesses — landscapers, salons, home services, med spas — LeadEngine replaces the chaos of forwarding form emails to separate inboxes.",
      66, y + 10, { width: 462, lineGap: 3 }
    );
  y = doc.y + 8;
  doc.font("Helvetica-Bold").fontSize(10).fillColor(BLUE)
    .text("One platform. Every client. Zero leads lost.", 66, y, { width: 462 });

  drawFooter(doc, page);
  doc.end();
  console.log("✓ Technical report saved:", outPath);
}

// ─────────────────────────────────────────────────────────────────────────────
// DOCUMENT 2: BUSINESS OWNER FEATURE LIST
// ─────────────────────────────────────────────────────────────────────────────
function generateFeatureList(outPath) {
  const doc = new PDFDocument({ size: "LETTER", margins: { top: 150, bottom: 50, left: 56, right: 56 }, autoFirstPage: true });
  doc.pipe(fs.createWriteStream(outPath));

  let page = 1;

  drawHeader(doc, "Features & Benefits", "What LeadEngine does for your business", "Prepared by Novenworks");

  const features = [
    {
      icon: "◆",
      title: "Never Miss a Lead Again",
      body: "Every time someone fills out your contact form, their information is instantly saved and organized in one place — no more digging through emails or spreadsheets. You'll know exactly who reached out, when, and what they're looking for.",
    },
    {
      icon: "◆",
      title: "Instant Email Alerts",
      body: "The moment a new lead comes in, you get an email with everything you need: their name, phone number, what service they want, and any message they left. Reply fast, close more jobs.",
    },
    {
      icon: "◆",
      title: "See Your Full Pipeline at a Glance",
      body: "Track every lead from first contact to closed deal. Move leads through simple stages — New → Contacted → Booked → Won — so you always know where each person stands and what needs attention today.",
    },
    {
      icon: "◆",
      title: "Know What Your Pipeline Is Worth",
      body: "See the total dollar value of your open leads at any moment. Know how much revenue you've won this month, how much is still in the works, and how much recurring monthly revenue you've locked in.",
    },
    {
      icon: "◆",
      title: "Built-In Follow-Up Reminders",
      body: "The dashboard flags leads you haven't contacted yet or haven't spoken to recently. No one slips through the cracks just because things got busy.",
    },
    {
      icon: "◆",
      title: "Keep Notes on Every Lead",
      body: "Add internal notes to any lead — what you discussed, what they're looking for, when to call back. Everything stays attached to that person forever.",
    },
    {
      icon: "◆",
      title: "Simple Dashboard Numbers",
      body: "One screen shows you: total leads, how many are new, how many are booked, how many you've won, and how many you've lost. No complicated reports — just the numbers that matter.",
    },
    {
      icon: "◆",
      title: "Search and Filter Your Leads",
      body: "Need to find a specific customer? Search by name. Want to see only your booked appointments? Filter by status. Want to see leads from last month? Filter by date. Done in seconds.",
    },
    {
      icon: "◆",
      title: "Visual Pipeline Board",
      body: "Prefer to see your pipeline as a board? Switch to the card view and drag leads from column to column as their status changes — just like moving sticky notes on a whiteboard.",
    },
    {
      icon: "◆",
      title: "Works With Your Existing Website",
      body: "A small snippet of code goes on your website's contact page. That's it. Leads flow in automatically — no manual data entry, no copy-paste from emails.",
    },
    {
      icon: "◆",
      title: "Your Data, Only Yours",
      body: "You only ever see your own leads and your own numbers. Nothing is shared across businesses. Your information stays private and secure.",
    },
  ];

  let y = 158;
  const pageH = doc.page.height;

  features.forEach((feat, idx) => {
    const estimatedH = 72;
    if (y + estimatedH > pageH - 80) {
      drawFooter(doc, page++);
      doc.addPage({ margins: { top: 150, bottom: 50, left: 56, right: 56 } });
      drawHeader(doc, "Features & Benefits", "What LeadEngine does for your business", "Prepared by Novenworks");
      y = 158;
    }

    // Feature card — subtle bg
    const cardBg = idx % 2 === 0 ? "#F0F7FF" : "#FAFAFA";
    doc.roundedRect(56, y, 480, 2).fill(RULE);
    y += 6;

    // Icon + title row
    doc.font("Helvetica-Bold").fontSize(9).fillColor(BLUE).text(feat.icon, 56, y + 2);
    doc.font("Helvetica-Bold").fontSize(12).fillColor(DARK).text(feat.title, 72, y, { width: 460 });
    y = doc.y + 4;

    // Body
    doc.font("Helvetica").fontSize(10).fillColor(TEXT)
      .text(feat.body, 72, y, { width: 460, lineGap: 3 });
    y = doc.y + 14;
  });

  // Coming Soon block
  if (y + 120 > doc.page.height - 80) {
    drawFooter(doc, page++);
    doc.addPage({ margins: { top: 150, bottom: 50, left: 56, right: 56 } });
    drawHeader(doc, "Features & Benefits", "What LeadEngine does for your business", "Prepared by Novenworks");
    y = 158;
  }

  y += 10;
  doc.roundedRect(56, y, 480, 90).fill(NAVY);
  doc.font("Helvetica-Bold").fontSize(10).fillColor(BLUE_LIGHT)
    .text("Coming Soon", 76, y + 16);
  doc.font("Helvetica").fontSize(9.5).fillColor(OFFWHITE)
    .text("• Automatic follow-up emails after someone submits a lead", 76, y + 32, { lineGap: 4 });
  doc.font("Helvetica").fontSize(9.5).fillColor(OFFWHITE)
    .text("• Text message (SMS) alerts for new leads", 76, doc.y + 2, { lineGap: 4 });
  doc.font("Helvetica").fontSize(9.5).fillColor(OFFWHITE)
    .text("• Automated review requests after a job is complete", 76, doc.y + 2, { lineGap: 4 });
  doc.font("Helvetica").fontSize(9.5).fillColor(OFFWHITE)
    .text("• AI-suggested next steps for each lead", 76, doc.y + 2, { lineGap: 4 });

  drawFooter(doc, page);
  doc.end();
  console.log("✓ Feature list saved:", outPath);
}

// ── Run both ──────────────────────────────────────────────────────────────────
const outDir = path.join(__dirname, "../../public-docs");
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

generateTechnicalReport(path.join(outDir, "LeadEngine-Technical-Analysis.pdf"));
generateFeatureList(path.join(outDir, "LeadEngine-Features-For-Business-Owners.pdf"));
