import { useGetMe } from "@workspace/api-client-react";
import { LEWordmark } from "@/components/Logo";
import {
  TrendingUp, Users, AlertCircle, DollarSign,
  CheckCircle, ArrowRight, Zap, Target, BarChart3,
  Phone, Globe, MessageSquare, Layers, ChevronDown,
  Activity, Briefcase,
} from "lucide-react";

const DEMO_CTA = "mailto:hello@novenworks.com?subject=LeadEngine%20Demo%20Request";

const CSS = `
  /* ─── Reset ─── */
  * { box-sizing: border-box; }

  /* ─── Layout grids ─── */
  .lg-hero-grid {
    display: grid;
    grid-template-columns: 1fr 1.15fr;
    gap: 80px;
    align-items: center;
  }
  .lg-solution-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 80px;
    align-items: start;
  }
  .lg-steps-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 24px;
  }
  .lg-pain-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 20px;
  }
  .lg-revenue-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 20px;
  }
  .lg-usecases-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
  }
  .lg-features-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 14px;
  }
  .lg-mockup-metrics {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
    margin-bottom: 18px;
  }
  .lg-mockup-pipeline {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
  }

  /* ─── Tablet ─── */
  @media (max-width: 1024px) {
    .lg-hero-grid       { grid-template-columns: 1fr; gap: 56px; }
    .lg-solution-grid   { grid-template-columns: 1fr; gap: 48px; }
    .lg-steps-grid      { grid-template-columns: 1fr 1fr; gap: 18px; }
    .lg-pain-grid       { grid-template-columns: repeat(2, 1fr); }
    .lg-revenue-grid    { grid-template-columns: repeat(2, 1fr); }
    .lg-usecases-grid   { grid-template-columns: repeat(3, 1fr); }
    .lg-features-grid   { grid-template-columns: repeat(2, 1fr); }
  }

  /* ─── Mobile ─── */
  @media (max-width: 640px) {
    .lg-steps-grid      { grid-template-columns: 1fr; }
    .lg-pain-grid       { grid-template-columns: 1fr; }
    .lg-revenue-grid    { grid-template-columns: 1fr 1fr; }
    .lg-usecases-grid   { grid-template-columns: repeat(2, 1fr); }
    .lg-features-grid   { grid-template-columns: 1fr 1fr; }
    .lg-mockup-metrics  { grid-template-columns: repeat(2, 1fr); }
    .lg-mockup-pipeline { grid-template-columns: repeat(2, 1fr); }
    .hero-float-card    { display: none; }
    .nav-demo           { display: none; }
    .hero-pad           { padding: 80px 20px 80px !important; }
    .section-pad        { padding: 80px 20px !important; }
    .section-pad-lg     { padding: 100px 20px !important; }
  }

  /* ─── Animations ─── */
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(28px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes floatY {
    0%, 100% { transform: translateY(0px); }
    50%       { transform: translateY(-12px); }
  }
  @keyframes floatCard1 {
    0%, 100% { transform: translateY(0px) translateX(0px); }
    50%       { transform: translateY(-6px) translateX(2px); }
  }
  @keyframes floatCard2 {
    0%, 100% { transform: translateY(0px); }
    50%       { transform: translateY(6px); }
  }
  .anim-up    { animation: fadeUp 0.65s cubic-bezier(.22,.68,0,1) both; }
  .anim-up-1  { animation: fadeUp 0.65s cubic-bezier(.22,.68,0,1) 0.12s both; }
  .anim-up-2  { animation: fadeUp 0.65s cubic-bezier(.22,.68,0,1) 0.22s both; }
  .anim-in    { animation: fadeIn 0.9s ease 0.3s both; }
  .anim-float { animation: floatY 7s ease-in-out infinite; }
  .anim-fc1   { animation: floatCard1 5s ease-in-out 0.5s infinite; }
  .anim-fc2   { animation: floatCard2 6s ease-in-out 1s infinite; }

  /* ─── Hover utilities ─── */
  .card-hover { transition: border-color 0.2s ease, background 0.2s ease, transform 0.2s ease, box-shadow 0.25s ease; cursor: default; }
  .card-hover:hover {
    border-color: rgba(37,99,235,0.5) !important;
    background: rgba(37,99,235,0.07) !important;
    transform: translateY(-4px);
    box-shadow: 0 16px 40px rgba(0,0,0,0.4), 0 0 0 1px rgba(37,99,235,0.2);
  }
  .btn-p { transition: opacity 0.18s, transform 0.15s, box-shadow 0.2s; }
  .btn-p:hover { opacity: 0.88; transform: translateY(-2px); box-shadow: 0 0 56px rgba(37,99,235,0.6) !important; }
  .btn-g { transition: background 0.18s, transform 0.15s; }
  .btn-g:hover { background: rgba(255,255,255,0.09) !important; transform: translateY(-2px); }
  .lnk:hover { color: rgba(255,255,255,0.9) !important; }

  /* ─── Gradient text ─── */
  .grad-text {
    background: linear-gradient(135deg, #60a5fa 0%, #2563eb 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
`;

/* ── Static data ────────────────────────────────── */

const METRICS = [
  { label: "Total Leads", value: "147", icon: Users, color: "#60a5fa", bg: "rgba(37,99,235,0.22)" },
  { label: "Pipeline Value", value: "$89.4k", icon: TrendingUp, color: "#34d399", bg: "rgba(16,185,129,0.2)" },
  { label: "Follow-Ups Due", value: "12", icon: AlertCircle, color: "#fbbf24", bg: "rgba(245,158,11,0.2)" },
  { label: "Revenue Won", value: "$32.1k", icon: DollarSign, color: "#4ade80", bg: "rgba(34,197,94,0.2)" },
];

const PIPELINE = [
  { name: "New", count: 24, color: "#60a5fa", cbg: "rgba(37,99,235,0.22)", leads: [{ n: "Sarah M.", s: "Consultation" }, { n: "Mike T.", s: "Service Inquiry" }] },
  { name: "Contacted", count: 18, color: "#a78bfa", cbg: "rgba(124,58,237,0.22)", leads: [{ n: "Jessica R.", s: "Treatment Pkg" }, { n: "David L.", s: "Membership" }] },
  { name: "Booked", count: 12, color: "#fbbf24", cbg: "rgba(245,158,11,0.22)", leads: [{ n: "Anna K.", s: "Repair Quote" }, { n: "Carlos P.", s: "Estimate" }] },
  { name: "Won", count: 8, color: "#4ade80", cbg: "rgba(34,197,94,0.22)", leads: [{ n: "Rachel S.", s: "Annual Plan" }, { n: "Tom B.", s: "Full Service" }] },
];

const PAIN = [
  { icon: MessageSquare, title: "Website Forms Get Buried", body: "Inquiries sit in a shared inbox and never get followed up with." },
  { icon: Phone, title: "Phone Calls Go Untracked", body: "Calls and walk-ins are taken verbally and forgotten by end of day." },
  { icon: Users, title: "Referrals Get Forgotten", body: "Word-of-mouth leads arrive with no system to capture and follow through." },
  { icon: Globe, title: "Messages Never Get Followed Up", body: "Instagram, Facebook, and Google messages disappear into the noise." },
  { icon: AlertCircle, title: "Nobody Owns The Pipeline", body: "Without a clear system, nobody knows who's responsible for what." },
  { icon: DollarSign, title: "Revenue Walks Away", body: "Every missed follow-up is a paying customer choosing your competitor." },
];

const SOURCES = ["Website Forms", "Phone Calls", "Walk-Ins", "Google Business Profile", "Facebook", "Instagram", "Referrals", "Yelp"];

const FEATURES = [
  { icon: Target, label: "Lead Capture", color: "#60a5fa", bg: "rgba(37,99,235,0.15)" },
  { icon: BarChart3, label: "Pipeline Tracking", color: "#a78bfa", bg: "rgba(124,58,237,0.15)" },
  { icon: Zap, label: "Follow-Up Management", color: "#fbbf24", bg: "rgba(245,158,11,0.15)" },
  { icon: DollarSign, label: "Revenue Visibility", color: "#4ade80", bg: "rgba(34,197,94,0.15)" },
  { icon: Briefcase, label: "Workspace Management", color: "#f472b6", bg: "rgba(236,72,153,0.15)" },
  { icon: Activity, label: "Activity Timeline", color: "#fb923c", bg: "rgba(251,146,60,0.15)" },
];

const STEPS = [
  {
    n: "01", icon: Target,
    title: "Capture Every Opportunity",
    body: "Automatically capture leads from forms or add them manually from calls, referrals, walk-ins, and messages. Every lead enters the same system.",
  },
  {
    n: "02", icon: Zap,
    title: "Track Every Follow-Up",
    body: "Know exactly who needs a call, quote, appointment, or follow-up. Never wonder where a lead stands or who dropped the ball.",
  },
  {
    n: "03", icon: BarChart3,
    title: "Grow Revenue",
    body: "See your pipeline, follow-up activity, and revenue opportunities in one place. Know what's working and where your best customers come from.",
  },
];

const REVENUE_CARDS = [
  { value: "Respond Faster", label: "From any channel — calls, forms, DMs, walk-ins", color: "#60a5fa", bg: "rgba(37,99,235,0.1)", border: "rgba(37,99,235,0.28)" },
  { value: "Follow Up More", label: "Never drop the ball on a warm lead again", color: "#34d399", bg: "rgba(16,185,129,0.1)", border: "rgba(16,185,129,0.28)" },
  { value: "Close More", label: "Turn more inquiries into booked appointments", color: "#a78bfa", bg: "rgba(124,58,237,0.1)", border: "rgba(124,58,237,0.28)" },
  { value: "Earn More", label: "Increase revenue from leads you already have", color: "#fbbf24", bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.28)" },
];

const USE_CASES = [
  { label: "Wellness Centers", detail: "Consultations, memberships, service inquiries" },
  { label: "Med Spas", detail: "Treatment inquiries, consultations, packages" },
  { label: "Auto Repair Shops", detail: "Repair calls, diagnostics, estimates" },
  { label: "Contractors", detail: "Quote requests, project inquiries, follow-ups" },
  { label: "Pet Services", detail: "Subscriptions, cleanups, appointments" },
  { label: "Salons", detail: "Appointments, service inquiries, rebooking" },
  { label: "Local Service Businesses", detail: "Forms, calls, referrals, walk-ins" },
];

const MODULES = [
  { label: "Leads", soon: false },
  { label: "Pipeline", soon: false },
  { label: "Workspaces", soon: false },
  { label: "Follow-Ups", soon: false },
  { label: "Revenue Dashboard", soon: false },
  { label: "Forms", soon: false },
  { label: "Reviews", soon: true },
  { label: "Automations", soon: true },
];

const UCICONS = [Target, Zap, Phone, Briefcase, Globe, MessageSquare, BarChart3];
const UCCOLORS = ["#60a5fa", "#a78bfa", "#fbbf24", "#34d399", "#f472b6", "#fb923c", "#94a3b8"];

/* ── Primitives ─────────────────────────────────── */

function Blob({ s }: { s: React.CSSProperties }) {
  return <div style={{ position: "absolute", borderRadius: "50%", pointerEvents: "none", ...s }} />;
}

function Dots() {
  return (
    <div style={{
      position: "absolute", inset: 0, pointerEvents: "none",
      backgroundImage: "radial-gradient(rgba(255,255,255,0.032) 1px, transparent 1px)",
      backgroundSize: "30px 30px",
    }} />
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      color: "#3b82f6", fontSize: 11, fontWeight: 700,
      letterSpacing: "0.22em", textTransform: "uppercase", marginBottom: 16,
      display: "flex", alignItems: "center", gap: 10,
    }}>
      <span style={{ width: 24, height: 1.5, background: "#3b82f6", borderRadius: 2, display: "inline-block", flexShrink: 0 }} />
      {children}
    </p>
  );
}

function H2({ children, center }: { children: React.ReactNode; center?: boolean }) {
  return (
    <h2 style={{
      fontSize: "clamp(2rem, 3.2vw, 2.9rem)",
      fontWeight: 800, color: "white",
      lineHeight: 1.1, letterSpacing: "-0.028em",
      textAlign: center ? "center" : undefined,
      marginBottom: 20,
    }}>
      {children}
    </h2>
  );
}

/* ── Dashboard Mockup (hero right panel) ─────────── */

function DashboardMockup() {
  return (
    <div
      className="anim-float"
      style={{
        background: "rgba(7,14,28,0.98)",
        border: "1px solid rgba(255,255,255,0.09)",
        borderRadius: 18,
        overflow: "hidden",
        boxShadow: "0 60px 140px rgba(0,0,0,0.8), 0 0 0 1px rgba(37,99,235,0.15), 0 0 100px rgba(37,99,235,0.08)",
        width: "100%",
      }}
    >
      {/* Browser chrome */}
      <div style={{ background: "#060d1c", padding: "12px 18px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", gap: 7 }}>
        <div style={{ width: 11, height: 11, borderRadius: "50%", background: "#ef4444", opacity: 0.7 }} />
        <div style={{ width: 11, height: 11, borderRadius: "50%", background: "#fbbf24", opacity: 0.7 }} />
        <div style={{ width: 11, height: 11, borderRadius: "50%", background: "#22c55e", opacity: 0.7 }} />
        <div style={{ marginLeft: 12, flex: 1, background: "rgba(255,255,255,0.05)", borderRadius: 6, padding: "4px 12px", fontSize: 10, color: "rgba(148,163,184,0.3)", fontFamily: "monospace" }}>
          app.novenworks.com/dashboard
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: "22px 22px 26px" }}>
        {/* Header row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "white", letterSpacing: "-0.01em" }}>Dashboard</div>
            <div style={{ fontSize: 10, color: "rgba(148,163,184,0.4)", marginTop: 2 }}>Citrus & Sage Wellness</div>
          </div>
          <div style={{ background: "rgba(37,99,235,0.16)", border: "1px solid rgba(37,99,235,0.35)", borderRadius: 8, padding: "6px 14px", fontSize: 11, color: "#93c5fd", fontWeight: 600 }}>
            + New Lead
          </div>
        </div>

        {/* Metrics 2×2 */}
        <div className="lg-mockup-metrics">
          {METRICS.map((m) => (
            <div key={m.label} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 11, padding: "13px 15px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 9 }}>
                <div style={{ width: 24, height: 24, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", background: m.bg, flexShrink: 0 }}>
                  <m.icon size={13} color={m.color} />
                </div>
                <span style={{ fontSize: 9, color: "rgba(148,163,184,0.45)", lineHeight: 1.2 }}>{m.label}</span>
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "white", letterSpacing: "-0.03em" }}>{m.value}</div>
            </div>
          ))}
        </div>

        {/* Pipeline */}
        <div>
          <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(148,163,184,0.38)", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 11 }}>Pipeline</div>
          <div className="lg-mockup-pipeline">
            {PIPELINE.map((col) => (
              <div key={col.name} style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.065)", borderRadius: 11, padding: "10px 10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <span style={{ fontSize: 8.5, fontWeight: 700, color: "rgba(148,163,184,0.55)", textTransform: "uppercase", letterSpacing: "0.07em" }}>{col.name}</span>
                  <span style={{ fontSize: 9.5, fontWeight: 800, color: col.color, background: col.cbg, borderRadius: 99, padding: "1.5px 7px" }}>{col.count}</span>
                </div>
                {col.leads.map((lead, i) => (
                  <div key={i} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 6, padding: "7px 9px", marginBottom: i === 0 ? 6 : 0 }}>
                    <div style={{ fontSize: 9.5, fontWeight: 600, color: "rgba(255,255,255,0.87)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{lead.n}</div>
                    <div style={{ fontSize: 8, color: "rgba(148,163,184,0.38)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{lead.s}</div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function FloatCard({ icon: Icon, label, value, color, border, anim, style }: {
  icon: React.ComponentType<{ size?: number; color?: string }>;
  label: string;
  value: string;
  color: string;
  border: string;
  anim: string;
  style: React.CSSProperties;
}) {
  return (
    <div
      className={`hero-float-card ${anim}`}
      style={{
        position: "absolute",
        background: "rgba(7,14,28,0.92)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: `1px solid ${border}`,
        borderRadius: 14,
        padding: "14px 18px",
        boxShadow: "0 12px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)",
        zIndex: 20,
        minWidth: 160,
        ...style,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: `${color}1a`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon size={16} color={color} />
        </div>
        <div>
          <div style={{ fontSize: 9, color: "rgba(148,163,184,0.45)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 3 }}>{label}</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "white", letterSpacing: "-0.025em" }}>{value}</div>
        </div>
      </div>
    </div>
  );
}

/* ── Nav ─────────────────────────────────────────── */

function Nav({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <nav style={{
      position: "sticky", top: 0, zIndex: 50,
      background: "rgba(9,15,28,0.8)",
      backdropFilter: "blur(24px)",
      WebkitBackdropFilter: "blur(24px)",
      borderBottom: "1px solid rgba(255,255,255,0.07)",
    }}>
      <div style={{ maxWidth: 1440, margin: "0 auto", padding: "0 48px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 70 }}>
        <LEWordmark compact dark />
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {isLoggedIn ? (
            <a href="/dashboard" className="btn-p" style={{ padding: "9px 24px", borderRadius: 10, fontSize: 14, fontWeight: 600, color: "white", background: "#2563EB", textDecoration: "none", boxShadow: "0 0 28px rgba(37,99,235,0.35)" }}>
              Go to Dashboard →
            </a>
          ) : (
            <>
              <a href="/login" className="btn-g lnk" style={{ padding: "9px 18px", borderRadius: 10, fontSize: 14, fontWeight: 600, color: "rgba(148,163,184,0.75)", textDecoration: "none", background: "transparent", transition: "color 0.18s" }}>
                Sign In
              </a>
              <a href={DEMO_CTA} className="btn-p nav-demo" style={{ padding: "9px 22px", borderRadius: 10, fontSize: 14, fontWeight: 600, color: "white", background: "#2563EB", textDecoration: "none", boxShadow: "0 0 28px rgba(37,99,235,0.35)" }}>
                Book a Demo
              </a>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

/* ── Hero ─────────────────────────────────────────── */

function HeroSection({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <section
      className="hero-pad"
      style={{
        position: "relative",
        overflow: "visible",
        padding: "140px 48px 160px",
        background: "linear-gradient(165deg, #08111f 0%, #091728 50%, #060f1e 100%)",
      }}
    >
      {/* Background elements */}
      <Blob s={{ width: 1000, height: 1000, top: -300, right: -300, background: "radial-gradient(circle, rgba(37,99,235,0.14) 0%, transparent 58%)" }} />
      <Blob s={{ width: 600, height: 600, bottom: -200, left: -150, background: "radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 65%)" }} />
      <Dots />
      {/* Gradient mesh overlay */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "linear-gradient(to bottom, transparent 60%, rgba(6,15,30,0.6) 100%)" }} />

      <div style={{ maxWidth: 1400, margin: "0 auto", position: "relative", zIndex: 1 }}>
        <div className="lg-hero-grid">

          {/* LEFT: copy */}
          <div>
            <div className="anim-up">
              <Eyebrow>Local Business Growth Platform</Eyebrow>
            </div>
            <div className="anim-up-1">
              <h1 style={{
                fontSize: "clamp(2.8rem, 5vw, 4.25rem)",
                fontWeight: 900,
                color: "white",
                lineHeight: 1.04,
                letterSpacing: "-0.038em",
                marginBottom: 28,
              }}>
                The Operating System<br />
                <span className="grad-text">For Local Business Growth</span>
              </h1>
            </div>
            <div className="anim-up-2">
              <p style={{ fontSize: 19, color: "rgba(148,163,184,0.82)", lineHeight: 1.7, marginBottom: 14, maxWidth: 520 }}>
                Capture leads. Track opportunities. Grow revenue.
              </p>
              <p style={{ fontSize: 15, color: "rgba(148,163,184,0.5)", lineHeight: 1.85, marginBottom: 48, maxWidth: 490 }}>
                From first inquiry to closed deal, LeadEngine gives local businesses complete visibility into their pipeline, follow-ups, and revenue.
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                <a
                  href={DEMO_CTA}
                  className="btn-p"
                  style={{ padding: "15px 34px", borderRadius: 12, fontSize: 15, fontWeight: 700, color: "white", background: "#2563EB", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 9, boxShadow: "0 0 48px rgba(37,99,235,0.45)" }}
                >
                  Book a Demo <ArrowRight size={17} />
                </a>
                {isLoggedIn ? (
                  <a href="/dashboard" className="btn-g" style={{ padding: "15px 28px", borderRadius: 12, fontSize: 15, fontWeight: 600, color: "rgba(148,163,184,0.88)", border: "1px solid rgba(255,255,255,0.12)", textDecoration: "none", background: "rgba(255,255,255,0.04)", display: "inline-block" }}>
                    Go to Dashboard
                  </a>
                ) : (
                  <a href="#how-it-works" className="btn-g" style={{ padding: "15px 28px", borderRadius: 12, fontSize: 15, fontWeight: 600, color: "rgba(148,163,184,0.88)", border: "1px solid rgba(255,255,255,0.12)", textDecoration: "none", background: "rgba(255,255,255,0.04)", display: "inline-flex", alignItems: "center", gap: 8 }}>
                    See How It Works <ChevronDown size={16} />
                  </a>
                )}
              </div>

              {/* Trust line */}
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 40 }}>
                {["No contracts", "Easy setup", "Built for local business"].map((t) => (
                  <div key={t} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <CheckCircle size={13} color="#34d399" />
                    <span style={{ fontSize: 12, color: "rgba(148,163,184,0.5)" }}>{t}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT: floating mockup */}
          <div className="anim-in" style={{ position: "relative", paddingTop: 32, paddingBottom: 32 }}>
            {/* Ambient glow */}
            <div style={{ position: "absolute", inset: "-60px -60px -80px -60px", background: "radial-gradient(ellipse at 55% 45%, rgba(37,99,235,0.22) 0%, transparent 65%)", pointerEvents: "none", zIndex: 0 }} />

            {/* Floating stat: Revenue Won – top-left */}
            <FloatCard
              icon={DollarSign}
              label="Revenue Won"
              value="$32.1k"
              color="#4ade80"
              border="rgba(34,197,94,0.35)"
              anim="anim-fc1"
              style={{ top: 8, left: -44 }}
            />

            {/* Floating stat: Follow-Ups Due – bottom-right */}
            <FloatCard
              icon={AlertCircle}
              label="Follow-Ups Due"
              value="12"
              color="#fbbf24"
              border="rgba(245,158,11,0.35)"
              anim="anim-fc2"
              style={{ bottom: 24, right: -36 }}
            />

            {/* Main dashboard */}
            <div style={{ position: "relative", zIndex: 1 }}>
              <DashboardMockup />
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}

/* ── Problem ─────────────────────────────────────── */

function ProblemSection() {
  return (
    <section className="section-pad" style={{ padding: "120px 48px", background: "#060d1b", position: "relative", overflow: "hidden" }}>
      <Blob s={{ width: 700, height: 700, top: "50%", left: "50%", transform: "translate(-50%,-50%)", background: "radial-gradient(circle, rgba(37,99,235,0.07) 0%, transparent 68%)" }} />
      <div style={{ maxWidth: 1280, margin: "0 auto", position: "relative", zIndex: 1 }}>
        <div style={{ textAlign: "center", marginBottom: 72 }}>
          <Eyebrow>The Problem</Eyebrow>
          <H2 center>Most Local Businesses Don't Need More Leads.<br />They Need Better Follow-Up.</H2>
          <p style={{ fontSize: 17, color: "rgba(148,163,184,0.55)", lineHeight: 1.8, maxWidth: 560, margin: "0 auto" }}>
            Every day, potential customers slip through the cracks — not because business owners don't care, but because they're busy running the business.
          </p>
        </div>
        <div className="lg-pain-grid">
          {PAIN.map((p) => (
            <div
              key={p.title}
              className="card-hover"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "32px 28px" }}
            >
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(239,68,68,0.11)", border: "1px solid rgba(239,68,68,0.22)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
                <p.icon size={20} color="#f87171" />
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "white", marginBottom: 10, letterSpacing: "-0.01em" }}>{p.title}</div>
              <div style={{ fontSize: 13, color: "rgba(148,163,184,0.6)", lineHeight: 1.7 }}>{p.body}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Solution ─────────────────────────────────────── */

function SolutionSection() {
  return (
    <section className="section-pad" style={{ padding: "120px 48px", background: "#0B1220", position: "relative", overflow: "hidden" }}>
      <Blob s={{ width: 700, height: 700, top: -120, right: -250, background: "radial-gradient(circle, rgba(37,99,235,0.1) 0%, transparent 62%)" }} />
      <div style={{ maxWidth: 1320, margin: "0 auto", position: "relative", zIndex: 1 }}>
        <div className="lg-solution-grid">
          {/* Left */}
          <div>
            <Eyebrow>The Solution</Eyebrow>
            <H2>Every Opportunity<br />In One Place.</H2>
            <p style={{ fontSize: 16, color: "rgba(148,163,184,0.65)", lineHeight: 1.85, marginBottom: 12 }}>
              LeadEngine gives your business a single place to capture leads, track follow-ups, manage opportunities, and understand what's driving revenue.
            </p>
            <p style={{ fontSize: 16, color: "rgba(148,163,184,0.55)", lineHeight: 1.85, marginBottom: 32 }}>
              Whether a lead comes from your website, Google, a phone call, Instagram, or a referral — it enters the same system.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 9, marginBottom: 36 }}>
              {SOURCES.map((s) => (
                <span key={s} style={{ background: "rgba(37,99,235,0.1)", border: "1px solid rgba(37,99,235,0.28)", borderRadius: 99, padding: "7px 16px", fontSize: 12, fontWeight: 600, color: "#93c5fd" }}>
                  {s}
                </span>
              ))}
            </div>
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: 28 }}>
              {["No spreadsheets.", "No sticky notes.", "No guessing."].map((line) => (
                <div key={line} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                  <CheckCircle size={18} color="#34d399" style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: 16, fontWeight: 600, color: "rgba(255,255,255,0.82)" }}>{line}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: feature grid */}
          <div className="lg-features-grid" style={{ alignSelf: "center" }}>
            {FEATURES.map((f) => (
              <div key={f.label} className="card-hover" style={{ background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "28px 24px" }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: f.bg, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                  <f.icon size={21} color={f.color} />
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.88)", lineHeight: 1.35 }}>{f.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── How It Works ─────────────────────────────────── */

function HowItWorksSection() {
  return (
    <section id="how-it-works" className="section-pad" style={{ padding: "120px 48px", background: "#060d1b" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 72 }}>
          <Eyebrow>How It Works</Eyebrow>
          <H2 center>Simple Enough To Use Every Day.<br />Powerful Enough To Grow With Your Business.</H2>
        </div>
        <div className="lg-steps-grid">
          {STEPS.map((step) => (
            <div
              key={step.n}
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.09)",
                borderRadius: 20,
                padding: "52px 44px",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div style={{ position: "absolute", top: 20, right: 24, fontSize: 80, fontWeight: 900, color: "rgba(37,99,235,0.1)", lineHeight: 1, letterSpacing: "-0.06em", userSelect: "none" }}>
                {step.n}
              </div>
              <div style={{ width: 52, height: 52, borderRadius: 14, background: "rgba(37,99,235,0.14)", border: "1px solid rgba(37,99,235,0.28)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 28 }}>
                <step.icon size={26} color="#60a5fa" />
              </div>
              <h3 style={{ fontSize: 20, fontWeight: 700, color: "white", marginBottom: 14, lineHeight: 1.25, letterSpacing: "-0.01em" }}>{step.title}</h3>
              <p style={{ fontSize: 15, color: "rgba(148,163,184,0.62)", lineHeight: 1.8 }}>{step.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Revenue ─────────────────────────────────────── */

function RevenueSection() {
  return (
    <section
      className="section-pad-lg"
      style={{ padding: "140px 48px", background: "linear-gradient(155deg, #060d1a 0%, #0b1220 50%, #08142a 100%)", position: "relative", overflow: "hidden" }}
    >
      <Blob s={{ width: 1100, height: 1100, top: "50%", left: "50%", transform: "translate(-50%,-50%)", background: "radial-gradient(circle, rgba(37,99,235,0.12) 0%, transparent 58%)" }} />
      <Dots />
      <div style={{ maxWidth: 1100, margin: "0 auto", textAlign: "center", position: "relative", zIndex: 1 }}>
        <Eyebrow>Revenue Impact</Eyebrow>
        <h2 style={{
          fontSize: "clamp(2.1rem, 3.8vw, 3.4rem)",
          fontWeight: 900, color: "white",
          lineHeight: 1.08, letterSpacing: "-0.032em",
          marginBottom: 24, maxWidth: 800, margin: "0 auto 24px",
        }}>
          The Fastest Way To Grow Revenue<br />
          Isn't More Marketing.<br />
          <span className="grad-text">It's Better Follow-Up.</span>
        </h2>
        <p style={{ fontSize: 17, color: "rgba(148,163,184,0.58)", lineHeight: 1.85, marginBottom: 64, maxWidth: 580, margin: "0 auto 64px" }}>
          Most businesses focus on getting more leads. The businesses that grow focus on converting more of the leads they already have.
        </p>
        <div className="lg-revenue-grid">
          {REVENUE_CARDS.map((m) => (
            <div
              key={m.value}
              className="card-hover"
              style={{ background: m.bg, border: `1px solid ${m.border}`, borderRadius: 20, padding: "40px 32px" }}
            >
              <div style={{ fontSize: 22, fontWeight: 800, color: m.color, marginBottom: 12, letterSpacing: "-0.01em" }}>{m.value}</div>
              <div style={{ fontSize: 13, color: "rgba(148,163,184,0.6)", lineHeight: 1.65 }}>{m.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Use Cases ───────────────────────────────────── */

function UseCasesSection() {
  return (
    <section className="section-pad" style={{ padding: "120px 48px", background: "#060d1b" }}>
      <div style={{ maxWidth: 1320, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <Eyebrow>Who It's For</Eyebrow>
          <H2 center>Built For Businesses<br />That Depend On Leads.</H2>
          <p style={{ fontSize: 16, color: "rgba(148,163,184,0.5)", maxWidth: 580, margin: "0 auto" }}>
            If customers call, submit forms, request quotes, schedule appointments, or send messages, LeadEngine helps you track every opportunity from first contact to closed deal.
          </p>
        </div>
        <div className="lg-usecases-grid">
          {USE_CASES.map((uc, i) => {
            const Icon = UCICONS[i % UCICONS.length];
            const color = UCCOLORS[i % UCCOLORS.length];
            return (
              <div key={uc.label} className="card-hover" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "30px 26px" }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: `${color}1e`, border: `1px solid ${color}44`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18 }}>
                  <Icon size={20} color={color} />
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "white", marginBottom: 8, letterSpacing: "-0.01em" }}>{uc.label}</div>
                <div style={{ fontSize: 12, color: "rgba(148,163,184,0.48)", lineHeight: 1.65 }}>{uc.detail}</div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ── Modules ─────────────────────────────────────── */

function ModulesSection() {
  return (
    <section className="section-pad" style={{ padding: "120px 48px", background: "#0B1220", position: "relative", overflow: "hidden" }}>
      <Blob s={{ width: 700, height: 700, bottom: -250, right: -200, background: "radial-gradient(circle, rgba(37,99,235,0.08) 0%, transparent 62%)" }} />
      <div style={{ maxWidth: 1000, margin: "0 auto", textAlign: "center", position: "relative", zIndex: 1 }}>
        <Eyebrow>Product</Eyebrow>
        <H2 center>Everything You Need<br />To Manage Growth.</H2>
        <p style={{ fontSize: 16, color: "rgba(148,163,184,0.5)", maxWidth: 480, margin: "0 auto 52px" }}>
          One platform. Every feature your business needs to capture, track, and convert more leads.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 14, justifyContent: "center" }}>
          {MODULES.map((m) => (
            <div
              key={m.label}
              style={{ background: m.soon ? "rgba(255,255,255,0.025)" : "rgba(37,99,235,0.1)", border: `1px solid ${m.soon ? "rgba(255,255,255,0.08)" : "rgba(37,99,235,0.32)"}`, borderRadius: 99, padding: "13px 26px", display: "flex", alignItems: "center", gap: 10 }}
            >
              <span style={{ fontSize: 15, fontWeight: 600, color: m.soon ? "rgba(148,163,184,0.32)" : "#93c5fd" }}>{m.label}</span>
              {m.soon && (
                <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "rgba(148,163,184,0.32)", background: "rgba(255,255,255,0.05)", borderRadius: 99, padding: "2px 8px" }}>
                  Soon
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Final CTA ───────────────────────────────────── */

function CtaSection() {
  return (
    <section className="section-pad-lg" style={{ padding: "140px 48px", background: "#060d1b", position: "relative", overflow: "hidden" }}>
      <Blob s={{ width: 1000, height: 1000, top: "50%", left: "50%", transform: "translate(-50%,-50%)", background: "radial-gradient(circle, rgba(37,99,235,0.15) 0%, transparent 58%)" }} />
      <Dots />
      <div style={{ maxWidth: 860, margin: "0 auto", position: "relative", zIndex: 1 }}>
        {/* Glass CTA container */}
        <div style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(37,99,235,0.25)",
          borderRadius: 28,
          padding: "72px 64px",
          textAlign: "center",
          boxShadow: "0 0 120px rgba(37,99,235,0.12), inset 0 1px 0 rgba(255,255,255,0.06)",
          backdropFilter: "blur(12px)",
        }}>
          <Eyebrow>Get Started</Eyebrow>
          <h2 style={{
            fontSize: "clamp(2rem, 3.5vw, 3rem)",
            fontWeight: 900, color: "white",
            lineHeight: 1.1, letterSpacing: "-0.03em",
            marginBottom: 20,
          }}>
            Know Exactly Where<br />Every Lead Stands.
          </h2>
          <p style={{ fontSize: 17, color: "rgba(148,163,184,0.6)", lineHeight: 1.85, marginBottom: 48, maxWidth: 540, margin: "0 auto 48px" }}>
            Stop guessing. Track opportunities, manage follow-ups, and grow revenue from one platform built for local businesses.
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
            <a href={DEMO_CTA} className="btn-p" style={{ padding: "18px 48px", borderRadius: 13, fontSize: 16, fontWeight: 700, color: "white", background: "#2563EB", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 9, boxShadow: "0 0 60px rgba(37,99,235,0.5)" }}>
              Book a Demo <ArrowRight size={18} />
            </a>
            <a href="/login" className="btn-g" style={{ padding: "18px 36px", borderRadius: 13, fontSize: 16, fontWeight: 600, color: "rgba(148,163,184,0.8)", border: "1px solid rgba(255,255,255,0.12)", textDecoration: "none", background: "rgba(255,255,255,0.04)", display: "inline-block" }}>
              Sign In
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Footer ──────────────────────────────────────── */

function Footer() {
  return (
    <footer style={{ background: "#04090f", borderTop: "1px solid rgba(255,255,255,0.06)", padding: "56px 48px" }}>
      <div style={{ maxWidth: 1440, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 40, flexWrap: "wrap" }}>
          <div>
            <LEWordmark compact dark />
            <p style={{ marginTop: 12, fontSize: 12, color: "rgba(148,163,184,0.3)" }}>Local Business Growth Platform</p>
          </div>
          <div style={{ display: "flex", gap: 40, flexWrap: "wrap", alignItems: "center" }}>
            {[
              { label: "Sign In", href: "/login" },
              { label: "Book a Demo", href: DEMO_CTA },
              { label: "Novenworks", href: "https://www.novenworks.com" },
            ].map((link) => (
              <a
                key={link.label}
                href={link.href}
                target={link.href.startsWith("http") ? "_blank" : undefined}
                rel="noopener noreferrer"
                className="lnk"
                style={{ fontSize: 13, color: "rgba(148,163,184,0.4)", textDecoration: "none", transition: "color 0.18s" }}
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
        <div style={{ marginTop: 44, paddingTop: 28, borderTop: "1px solid rgba(255,255,255,0.05)", fontSize: 11, color: "rgba(148,163,184,0.25)", textAlign: "center" }}>
          © {new Date().getFullYear()} Novenworks · All rights reserved.
        </div>
      </div>
    </footer>
  );
}

/* ── Page ────────────────────────────────────────── */

export default function Landing() {
  const { data: user } = useGetMe();
  const isLoggedIn = !!user;

  return (
    <>
      <style>{CSS}</style>
      <div style={{ background: "#0B1220", minHeight: "100vh" }}>
        <Nav isLoggedIn={isLoggedIn} />
        <HeroSection isLoggedIn={isLoggedIn} />
        <ProblemSection />
        <SolutionSection />
        <HowItWorksSection />
        <RevenueSection />
        <UseCasesSection />
        <ModulesSection />
        <CtaSection />
        <Footer />
      </div>
    </>
  );
}
