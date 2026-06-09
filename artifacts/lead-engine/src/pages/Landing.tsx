import { useGetMe } from "@workspace/api-client-react";
import { LEWordmark } from "@/components/Logo";
import {
  TrendingUp, Users, AlertCircle, DollarSign,
  CheckCircle, ArrowRight, Zap, Target, BarChart3,
  Phone, Globe, Star, MessageSquare, Layers, ChevronDown,
} from "lucide-react";

const DEMO_CTA = "mailto:hello@novenworks.com?subject=LeadEngine%20Demo%20Request";

const LANDING_CSS = `
  /* ── Layout grids ── */
  .lg-hero-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 100px;
    align-items: center;
  }
  .lg-solution-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 80px;
    align-items: center;
  }
  .lg-steps-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 28px;
  }
  .lg-pain-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 18px;
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
    grid-template-columns: repeat(3, 1fr);
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
  /* ── Tablet ── */
  @media (max-width: 1100px) {
    .lg-hero-grid { grid-template-columns: 1fr; gap: 64px; }
    .lg-solution-grid { grid-template-columns: 1fr; gap: 56px; }
    .lg-steps-grid { grid-template-columns: 1fr 1fr; gap: 20px; }
    .lg-pain-grid { grid-template-columns: repeat(2, 1fr); }
    .lg-revenue-grid { grid-template-columns: repeat(2, 1fr); }
    .lg-usecases-grid { grid-template-columns: repeat(3, 1fr); }
    .lg-features-grid { grid-template-columns: repeat(2, 1fr); }
  }
  /* ── Mobile ── */
  @media (max-width: 640px) {
    .lg-steps-grid { grid-template-columns: 1fr; }
    .lg-pain-grid { grid-template-columns: 1fr; }
    .lg-revenue-grid { grid-template-columns: 1fr 1fr; }
    .lg-usecases-grid { grid-template-columns: repeat(2, 1fr); }
    .lg-features-grid { grid-template-columns: 1fr 1fr; }
    .lg-mockup-metrics { grid-template-columns: repeat(2, 1fr); }
    .lg-mockup-pipeline { grid-template-columns: repeat(2, 1fr); }
  }

  /* ── Animations ── */
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(24px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeRight {
    from { opacity: 0; transform: translateX(24px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes float {
    0%, 100% { transform: translateY(0); }
    50%       { transform: translateY(-10px); }
  }
  .anim-up       { animation: fadeUp 0.7s cubic-bezier(.22,.68,0,1) both; }
  .anim-up-d1    { animation: fadeUp 0.7s cubic-bezier(.22,.68,0,1) 0.1s both; }
  .anim-up-d2    { animation: fadeUp 0.7s cubic-bezier(.22,.68,0,1) 0.2s both; }
  .anim-right    { animation: fadeRight 0.8s cubic-bezier(.22,.68,0,1) 0.25s both; }
  .anim-float    { animation: float 6s ease-in-out infinite; }

  /* ── Hover utilities ── */
  .card-hover {
    transition: border-color 0.2s, background 0.2s, transform 0.2s, box-shadow 0.2s;
  }
  .card-hover:hover {
    border-color: rgba(37,99,235,0.45) !important;
    background: rgba(37,99,235,0.07) !important;
    transform: translateY(-3px);
    box-shadow: 0 12px 32px rgba(0,0,0,0.35);
  }
  .btn-primary {
    transition: opacity 0.2s, transform 0.15s, box-shadow 0.2s;
  }
  .btn-primary:hover { opacity: 0.9; transform: translateY(-1px); box-shadow: 0 0 48px rgba(37,99,235,0.55) !important; }
  .btn-ghost { transition: background 0.2s, color 0.2s, transform 0.15s; }
  .btn-ghost:hover { background: rgba(255,255,255,0.08) !important; transform: translateY(-1px); }
  .link-hover { transition: color 0.2s; }
  .link-hover:hover { color: rgba(148,163,184,0.95) !important; }

  /* ── Nav hidden on print ── */
  @media (max-width: 640px) {
    .nav-demo-btn { display: none; }
  }
`;

const PREVIEW_METRICS = [
  { label: "Total Leads", value: "147", icon: Users, color: "#60a5fa", bg: "rgba(37,99,235,0.2)" },
  { label: "Pipeline Value", value: "$89.4k", icon: TrendingUp, color: "#34d399", bg: "rgba(16,185,129,0.18)" },
  { label: "Follow-Ups Due", value: "12", icon: AlertCircle, color: "#fbbf24", bg: "rgba(245,158,11,0.18)" },
  { label: "Revenue Won", value: "$32.1k", icon: DollarSign, color: "#4ade80", bg: "rgba(34,197,94,0.18)" },
];

const PIPELINE_COLS = [
  { name: "New", count: 24, color: "#60a5fa", bg: "rgba(37,99,235,0.22)", leads: [{ name: "Sarah M.", svc: "Consultation" }, { name: "Mike T.", svc: "Service Inquiry" }] },
  { name: "Contacted", count: 18, color: "#a78bfa", bg: "rgba(124,58,237,0.22)", leads: [{ name: "Jessica R.", svc: "Treatment Pkg" }, { name: "David L.", svc: "Membership" }] },
  { name: "Booked", count: 12, color: "#fbbf24", bg: "rgba(245,158,11,0.22)", leads: [{ name: "Anna K.", svc: "Repair Quote" }, { name: "Carlos P.", svc: "Estimate" }] },
  { name: "Won", count: 8, color: "#4ade80", bg: "rgba(34,197,94,0.22)", leads: [{ name: "Rachel S.", svc: "Annual Plan" }, { name: "Tom B.", svc: "Full Service" }] },
];

const PAIN_POINTS = [
  { icon: MessageSquare, text: "Website forms get buried in email inboxes" },
  { icon: Phone, text: "Phone calls and walk-ins are never tracked" },
  { icon: Globe, text: "Instagram and Facebook leads get forgotten" },
  { icon: Users, text: "Referrals never get followed up with" },
  { icon: AlertCircle, text: "Owners don't know who followed up on what" },
  { icon: DollarSign, text: "Revenue gets lost because nobody owns the pipeline" },
];

const SOURCES = ["Website Forms", "Phone Calls", "Walk-Ins", "Referrals", "Google", "Facebook", "Instagram", "Yelp"];

const STEPS = [
  {
    n: "01",
    icon: Target,
    title: "Capture Every Opportunity",
    body: "Every lead enters LeadEngine — whether they came from your website, a phone call, Google, Instagram, a walk-in, or a referral. Nothing gets lost.",
  },
  {
    n: "02",
    icon: Zap,
    title: "Follow Up Consistently",
    body: "Know exactly who needs a call, text, quote, or follow-up. No more forgotten leads. No more lost opportunities slipping through the cracks.",
  },
  {
    n: "03",
    icon: BarChart3,
    title: "Grow Revenue",
    body: "See your pipeline, booked work, and revenue in one place. Know what's working and exactly where your best customers are coming from.",
  },
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

function GlowBlob({ style }: { style: React.CSSProperties }) {
  return <div style={{ position: "absolute", borderRadius: "50%", pointerEvents: "none", ...style }} />;
}

function DotGrid() {
  return (
    <div style={{
      position: "absolute", inset: 0, pointerEvents: "none",
      backgroundImage: "radial-gradient(rgba(255,255,255,0.035) 1px, transparent 1px)",
      backgroundSize: "32px 32px",
    }} />
  );
}

function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      color: "#3b82f6", fontSize: 11, fontWeight: 700,
      letterSpacing: "0.22em", textTransform: "uppercase", marginBottom: 14,
      display: "flex", alignItems: "center", gap: 8,
    }}>
      <span style={{ display: "inline-block", width: 20, height: 1.5, background: "#3b82f6", borderRadius: 2, verticalAlign: "middle" }} />
      {children}
    </p>
  );
}

function SectionHeading({ children, center = false }: { children: React.ReactNode; center?: boolean }) {
  return (
    <h2 style={{
      fontSize: "clamp(1.9rem, 3.5vw, 2.85rem)",
      fontWeight: 800,
      color: "white",
      lineHeight: 1.12,
      letterSpacing: "-0.025em",
      textAlign: center ? "center" : undefined,
      marginBottom: 20,
    }}>
      {children}
    </h2>
  );
}

function DashboardMockup() {
  return (
    <div className="anim-right" style={{ width: "100%", position: "relative" }}>
      {/* Ambient glow behind mockup */}
      <div style={{
        position: "absolute",
        inset: "-40px -40px -60px -40px",
        background: "radial-gradient(ellipse at 60% 40%, rgba(37,99,235,0.2) 0%, transparent 70%)",
        pointerEvents: "none",
        zIndex: 0,
      }} />
      <div
        className="anim-float"
        style={{
          position: "relative",
          zIndex: 1,
          background: "rgba(9,16,30,0.97)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 16,
          overflow: "hidden",
          boxShadow: "0 50px 120px rgba(0,0,0,0.75), 0 0 0 1px rgba(37,99,235,0.18), 0 0 80px rgba(37,99,235,0.1)",
        }}
      >
        {/* Browser chrome */}
        <div style={{
          background: "#080f1d",
          padding: "11px 16px",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#ef4444", opacity: 0.75 }} />
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#fbbf24", opacity: 0.75 }} />
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#22c55e", opacity: 0.75 }} />
          <div style={{ marginLeft: 10, flex: 1, background: "rgba(255,255,255,0.05)", borderRadius: 6, padding: "4px 12px", fontSize: 10, color: "rgba(148,163,184,0.35)", fontFamily: "monospace" }}>
            app.novenworks.com/dashboard
          </div>
        </div>

        {/* Dashboard body */}
        <div style={{ padding: "20px 20px 24px" }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "white", letterSpacing: "-0.01em" }}>Dashboard</div>
              <div style={{ fontSize: 10, color: "rgba(148,163,184,0.45)", marginTop: 2 }}>Citrus & Sage Wellness</div>
            </div>
            <div style={{ background: "rgba(37,99,235,0.18)", border: "1px solid rgba(37,99,235,0.35)", borderRadius: 7, padding: "5px 12px", fontSize: 10, color: "#93c5fd", fontWeight: 600 }}>
              + New Lead
            </div>
          </div>

          {/* Metrics 2×2 */}
          <div className="lg-mockup-metrics">
            {PREVIEW_METRICS.map((m) => (
              <div key={m.label} style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 10,
                padding: "12px 14px",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
                  <div style={{ width: 22, height: 22, borderRadius: 5, display: "flex", alignItems: "center", justifyContent: "center", background: m.bg, flexShrink: 0 }}>
                    <m.icon size={12} color={m.color} />
                  </div>
                  <span style={{ fontSize: 9, color: "rgba(148,163,184,0.5)", lineHeight: 1.2 }}>{m.label}</span>
                </div>
                <div style={{ fontSize: 20, fontWeight: 800, color: "white", letterSpacing: "-0.03em" }}>{m.value}</div>
              </div>
            ))}
          </div>

          {/* Pipeline */}
          <div>
            <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(148,163,184,0.4)", textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: 10 }}>Pipeline</div>
            <div className="lg-mockup-pipeline">
              {PIPELINE_COLS.map((col) => (
                <div key={col.name} style={{
                  background: "rgba(255,255,255,0.025)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: 10,
                  padding: "10px 9px",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 9 }}>
                    <span style={{ fontSize: 8.5, fontWeight: 700, color: "rgba(148,163,184,0.6)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{col.name}</span>
                    <span style={{ fontSize: 9, fontWeight: 800, color: col.color, background: col.bg, borderRadius: 99, padding: "1px 6px" }}>{col.count}</span>
                  </div>
                  {col.leads.map((lead, i) => (
                    <div key={i} style={{
                      background: "rgba(255,255,255,0.045)",
                      border: "1px solid rgba(255,255,255,0.07)",
                      borderRadius: 6,
                      padding: "7px 8px",
                      marginBottom: i === 0 ? 6 : 0,
                    }}>
                      <div style={{ fontSize: 9, fontWeight: 600, color: "rgba(255,255,255,0.88)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{lead.name}</div>
                      <div style={{ fontSize: 8, color: "rgba(148,163,184,0.4)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{lead.svc}</div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Nav({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <nav style={{
      position: "sticky",
      top: 0,
      zIndex: 50,
      background: "rgba(11,18,32,0.82)",
      backdropFilter: "blur(24px)",
      WebkitBackdropFilter: "blur(24px)",
      borderBottom: "1px solid rgba(255,255,255,0.07)",
    }}>
      <div style={{
        maxWidth: 1440,
        margin: "0 auto",
        padding: "0 40px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        height: 68,
      }}>
        <LEWordmark compact dark />
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {isLoggedIn ? (
            <a
              href="/dashboard"
              className="btn-primary"
              style={{
                padding: "9px 22px",
                borderRadius: 9,
                fontSize: 14,
                fontWeight: 600,
                color: "white",
                background: "#2563EB",
                textDecoration: "none",
                boxShadow: "0 0 24px rgba(37,99,235,0.3)",
              }}
            >
              Go to Dashboard →
            </a>
          ) : (
            <>
              <a
                href="/login"
                className="btn-ghost"
                style={{ padding: "9px 18px", borderRadius: 9, fontSize: 14, fontWeight: 600, color: "rgba(148,163,184,0.8)", textDecoration: "none", background: "transparent" }}
              >
                Sign In
              </a>
              <a
                href={DEMO_CTA}
                className="btn-primary nav-demo-btn"
                style={{
                  padding: "9px 22px",
                  borderRadius: 9,
                  fontSize: 14,
                  fontWeight: 600,
                  color: "white",
                  background: "#2563EB",
                  textDecoration: "none",
                  boxShadow: "0 0 24px rgba(37,99,235,0.3)",
                }}
              >
                Book a Demo
              </a>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

function HeroSection({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <section style={{
      position: "relative",
      overflow: "hidden",
      padding: "140px 40px 160px",
      background: "linear-gradient(170deg, #0B1220 0%, #091628 55%, #060f1f 100%)",
    }}>
      <GlowBlob style={{ width: 900, height: 900, top: -250, right: -250, background: "radial-gradient(circle, rgba(37,99,235,0.13) 0%, transparent 60%)" }} />
      <GlowBlob style={{ width: 500, height: 500, bottom: -150, left: -100, background: "radial-gradient(circle, rgba(16,185,129,0.07) 0%, transparent 70%)" }} />
      <DotGrid />

      <div style={{ maxWidth: 1400, margin: "0 auto", position: "relative", zIndex: 1 }}>
        <div className="lg-hero-grid">
          {/* Left: copy + CTAs */}
          <div>
            <div className="anim-up">
              <SectionEyebrow>Local Business Growth Platform</SectionEyebrow>
            </div>
            <div className="anim-up-d1">
              <h1 style={{
                fontSize: "clamp(2.6rem, 5vw, 4rem)",
                fontWeight: 900,
                color: "white",
                lineHeight: 1.06,
                letterSpacing: "-0.035em",
                marginBottom: 28,
              }}>
                Stop Losing Customers<br />You Already Paid To Get.
              </h1>
            </div>
            <div className="anim-up-d2">
              <p style={{ fontSize: 18, color: "rgba(148,163,184,0.78)", lineHeight: 1.75, marginBottom: 14, maxWidth: 520 }}>
                LeadEngine helps local businesses capture every lead, follow up faster, and turn more inquiries into paying customers.
              </p>
              <p style={{ fontSize: 15, color: "rgba(148,163,184,0.5)", lineHeight: 1.8, marginBottom: 44, maxWidth: 480 }}>
                Most local businesses don't have a lead problem. They have a follow-up problem.
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                <a
                  href={DEMO_CTA}
                  className="btn-primary"
                  style={{
                    padding: "15px 32px",
                    borderRadius: 11,
                    fontSize: 15,
                    fontWeight: 700,
                    color: "white",
                    background: "#2563EB",
                    textDecoration: "none",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 9,
                    boxShadow: "0 0 40px rgba(37,99,235,0.4)",
                  }}
                >
                  Book a Demo <ArrowRight size={17} />
                </a>
                {isLoggedIn ? (
                  <a
                    href="/dashboard"
                    className="btn-ghost"
                    style={{
                      padding: "15px 28px",
                      borderRadius: 11,
                      fontSize: 15,
                      fontWeight: 600,
                      color: "rgba(148,163,184,0.85)",
                      border: "1px solid rgba(255,255,255,0.13)",
                      textDecoration: "none",
                      background: "rgba(255,255,255,0.04)",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 9,
                    }}
                  >
                    Go to Dashboard
                  </a>
                ) : (
                  <a
                    href="#how-it-works"
                    className="btn-ghost"
                    style={{
                      padding: "15px 28px",
                      borderRadius: 11,
                      fontSize: 15,
                      fontWeight: 600,
                      color: "rgba(148,163,184,0.85)",
                      border: "1px solid rgba(255,255,255,0.13)",
                      textDecoration: "none",
                      background: "rgba(255,255,255,0.04)",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 9,
                    }}
                  >
                    See How It Works <ChevronDown size={16} />
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Right: dashboard mockup */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
            <DashboardMockup />
          </div>
        </div>
      </div>
    </section>
  );
}

function ProblemSection() {
  return (
    <section style={{ padding: "120px 40px", background: "#080f1d", position: "relative", overflow: "hidden" }}>
      <GlowBlob style={{ width: 600, height: 600, top: "50%", left: "50%", transform: "translate(-50%,-50%)", background: "radial-gradient(circle, rgba(37,99,235,0.06) 0%, transparent 70%)" }} />
      <div style={{ maxWidth: 1200, margin: "0 auto", position: "relative", zIndex: 1 }}>
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <SectionEyebrow>The Problem</SectionEyebrow>
          <SectionHeading center>Leads Are Slipping Through<br />The Cracks Every Day.</SectionHeading>
          <p style={{ fontSize: 17, color: "rgba(148,163,184,0.55)", lineHeight: 1.75, maxWidth: 560, margin: "0 auto 12px" }}>
            Not because you're bad at business. Because you're busy running it.
          </p>
        </div>
        <div className="lg-pain-grid">
          {PAIN_POINTS.map((p) => (
            <div
              key={p.text}
              className="card-hover"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 14,
                padding: "28px 26px",
                display: "flex",
                alignItems: "flex-start",
                gap: 18,
              }}
            >
              <div style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: "rgba(239,68,68,0.12)",
                border: "1px solid rgba(239,68,68,0.22)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}>
                <p.icon size={18} color="#f87171" />
              </div>
              <span style={{ fontSize: 14, color: "rgba(148,163,184,0.85)", lineHeight: 1.6, paddingTop: 2 }}>{p.text}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SolutionSection() {
  const features = [
    { icon: Target, label: "Manual Lead Entry", color: "#60a5fa", bg: "rgba(37,99,235,0.15)" },
    { icon: BarChart3, label: "Pipeline Tracking", color: "#a78bfa", bg: "rgba(124,58,237,0.15)" },
    { icon: Zap, label: "Follow-Up Tasks", color: "#fbbf24", bg: "rgba(245,158,11,0.15)" },
    { icon: Globe, label: "Lead Source Tracking", color: "#34d399", bg: "rgba(16,185,129,0.15)" },
    { icon: DollarSign, label: "Revenue Visibility", color: "#4ade80", bg: "rgba(34,197,94,0.15)" },
    { icon: Layers, label: "Workspace Management", color: "#f472b6", bg: "rgba(236,72,153,0.15)" },
  ];
  return (
    <section style={{ padding: "120px 40px", background: "#0B1220", position: "relative", overflow: "hidden" }}>
      <GlowBlob style={{ width: 700, height: 700, top: -100, right: -250, background: "radial-gradient(circle, rgba(37,99,235,0.09) 0%, transparent 65%)" }} />
      <div style={{ maxWidth: 1320, margin: "0 auto", position: "relative", zIndex: 1 }}>
        <div className="lg-solution-grid">
          <div>
            <SectionEyebrow>The Solution</SectionEyebrow>
            <SectionHeading>LeadEngine Gives Every Lead A Home.</SectionHeading>
            <p style={{ fontSize: 16, color: "rgba(148,163,184,0.65)", lineHeight: 1.8, marginBottom: 32 }}>
              Capture leads from every channel, then track them from first contact to paying customer.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 9, marginBottom: 36 }}>
              {SOURCES.map((s) => (
                <span
                  key={s}
                  style={{
                    background: "rgba(37,99,235,0.1)",
                    border: "1px solid rgba(37,99,235,0.28)",
                    borderRadius: 99,
                    padding: "7px 16px",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#93c5fd",
                  }}
                >
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
          <div className="lg-features-grid">
            {features.map((f) => (
              <div
                key={f.label}
                className="card-hover"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 14,
                  padding: "24px 20px",
                }}
              >
                <div style={{ width: 40, height: 40, borderRadius: 10, background: f.bg, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
                  <f.icon size={19} color={f.color} />
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.88)", lineHeight: 1.35 }}>{f.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  return (
    <section id="how-it-works" style={{ padding: "120px 40px", background: "#080f1d" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 72 }}>
          <SectionEyebrow>How It Works</SectionEyebrow>
          <SectionHeading center>Three Steps To A Tighter Pipeline</SectionHeading>
          <p style={{ fontSize: 16, color: "rgba(148,163,184,0.55)", maxWidth: 480, margin: "0 auto" }}>
            Simple enough to use daily. Powerful enough to transform your follow-up process.
          </p>
        </div>
        <div className="lg-steps-grid">
          {STEPS.map((step) => (
            <div
              key={step.n}
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.09)",
                borderRadius: 20,
                padding: "48px 40px",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div style={{
                position: "absolute",
                top: 20,
                right: 24,
                fontSize: 72,
                fontWeight: 900,
                color: "rgba(37,99,235,0.1)",
                lineHeight: 1,
                letterSpacing: "-0.06em",
                userSelect: "none",
              }}>
                {step.n}
              </div>
              <div style={{
                width: 48,
                height: 48,
                borderRadius: 13,
                background: "rgba(37,99,235,0.15)",
                border: "1px solid rgba(37,99,235,0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 24,
              }}>
                <step.icon size={24} color="#60a5fa" />
              </div>
              <h3 style={{ fontSize: 19, fontWeight: 700, color: "white", marginBottom: 14, lineHeight: 1.25, letterSpacing: "-0.01em" }}>{step.title}</h3>
              <p style={{ fontSize: 15, color: "rgba(148,163,184,0.65)", lineHeight: 1.75 }}>{step.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function RevenueSection() {
  const cards = [
    { value: "Respond Faster", label: "From any channel — calls, forms, DMs", color: "#60a5fa", bg: "rgba(37,99,235,0.12)", border: "rgba(37,99,235,0.28)" },
    { value: "Follow Up More", label: "Never drop the ball on a warm lead", color: "#34d399", bg: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.28)" },
    { value: "Close More", label: "Turn inquiries into booked work", color: "#a78bfa", bg: "rgba(124,58,237,0.12)", border: "rgba(124,58,237,0.28)" },
    { value: "Earn More", label: "Revenue from leads you already have", color: "#fbbf24", bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.28)" },
  ];
  return (
    <section style={{ padding: "140px 40px", background: "linear-gradient(150deg, #060d1a 0%, #0B1220 50%, #091628 100%)", position: "relative", overflow: "hidden" }}>
      <GlowBlob style={{ width: 900, height: 900, top: "50%", left: "50%", transform: "translate(-50%,-50%)", background: "radial-gradient(circle, rgba(37,99,235,0.12) 0%, transparent 60%)" }} />
      <DotGrid />
      <div style={{ maxWidth: 1100, margin: "0 auto", textAlign: "center", position: "relative", zIndex: 1 }}>
        <SectionEyebrow>Revenue Impact</SectionEyebrow>
        <h2 style={{
          fontSize: "clamp(2rem, 4vw, 3.25rem)",
          fontWeight: 900,
          color: "white",
          lineHeight: 1.1,
          letterSpacing: "-0.03em",
          marginBottom: 24,
          maxWidth: 780,
          margin: "0 auto 24px",
        }}>
          If One Missed Lead Is Worth $500,<br />How Many Are You Losing Every Month?
        </h2>
        <p style={{ fontSize: 17, color: "rgba(148,163,184,0.6)", lineHeight: 1.8, marginBottom: 64, maxWidth: 600, margin: "0 auto 64px" }}>
          LeadEngine helps local businesses respond faster, follow up more consistently, and close more of the opportunities they already have.
        </p>
        <div className="lg-revenue-grid">
          {cards.map((m) => (
            <div
              key={m.value}
              className="card-hover"
              style={{
                background: m.bg,
                border: `1px solid ${m.border}`,
                borderRadius: 18,
                padding: "36px 28px",
              }}
            >
              <div style={{ fontSize: 22, fontWeight: 800, color: m.color, marginBottom: 10, letterSpacing: "-0.01em" }}>{m.value}</div>
              <div style={{ fontSize: 13, color: "rgba(148,163,184,0.65)", lineHeight: 1.6 }}>{m.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function UseCasesSection() {
  const icons = [Star, Target, Zap, Globe, Users, MessageSquare, BarChart3];
  const colors = ["#60a5fa", "#a78bfa", "#fbbf24", "#34d399", "#f472b6", "#fb923c", "#94a3b8"];
  return (
    <section style={{ padding: "120px 40px", background: "#080f1d" }}>
      <div style={{ maxWidth: 1320, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <SectionEyebrow>Who It's For</SectionEyebrow>
          <SectionHeading center>Built For Local Businesses<br />That Live On Leads</SectionHeading>
          <p style={{ fontSize: 16, color: "rgba(148,163,184,0.5)", maxWidth: 520, margin: "0 auto" }}>
            If your business depends on calls, forms, referrals, or appointments, LeadEngine manages them all in one place.
          </p>
        </div>
        <div className="lg-usecases-grid">
          {USE_CASES.map((uc, i) => {
            const Icon = icons[i % icons.length];
            const color = colors[i % colors.length];
            return (
              <div
                key={uc.label}
                className="card-hover"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 16,
                  padding: "28px 24px",
                  cursor: "default",
                }}
              >
                <div style={{
                  width: 42,
                  height: 42,
                  borderRadius: 11,
                  background: `${color}22`,
                  border: `1px solid ${color}44`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 16,
                }}>
                  <Icon size={19} color={color} />
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "white", marginBottom: 8, letterSpacing: "-0.01em" }}>{uc.label}</div>
                <div style={{ fontSize: 12, color: "rgba(148,163,184,0.5)", lineHeight: 1.6 }}>{uc.detail}</div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function ModulesSection() {
  return (
    <section style={{ padding: "120px 40px", background: "#0B1220", position: "relative", overflow: "hidden" }}>
      <GlowBlob style={{ width: 700, height: 700, bottom: -250, right: -200, background: "radial-gradient(circle, rgba(37,99,235,0.08) 0%, transparent 65%)" }} />
      <div style={{ maxWidth: 1000, margin: "0 auto", textAlign: "center", position: "relative", zIndex: 1 }}>
        <SectionEyebrow>Product</SectionEyebrow>
        <SectionHeading center>Everything Your Lead Follow-Up<br />Process Needs In One Place</SectionHeading>
        <p style={{ fontSize: 16, color: "rgba(148,163,184,0.5)", maxWidth: 480, margin: "0 auto 48px" }}>
          One platform. Every feature your business needs to capture and convert more leads.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center" }}>
          {MODULES.map((m) => (
            <div
              key={m.label}
              style={{
                background: m.soon ? "rgba(255,255,255,0.025)" : "rgba(37,99,235,0.1)",
                border: `1px solid ${m.soon ? "rgba(255,255,255,0.08)" : "rgba(37,99,235,0.32)"}`,
                borderRadius: 99,
                padding: "12px 24px",
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <span style={{ fontSize: 15, fontWeight: 600, color: m.soon ? "rgba(148,163,184,0.35)" : "#93c5fd" }}>{m.label}</span>
              {m.soon && (
                <span style={{
                  fontSize: 9,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                  color: "rgba(148,163,184,0.35)",
                  background: "rgba(255,255,255,0.05)",
                  borderRadius: 99,
                  padding: "2px 8px",
                }}>
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

function CtaSection() {
  return (
    <section style={{ padding: "140px 40px", background: "#080f1d", position: "relative", overflow: "hidden" }}>
      <GlowBlob style={{ width: 900, height: 900, top: "50%", left: "50%", transform: "translate(-50%,-50%)", background: "radial-gradient(circle, rgba(37,99,235,0.14) 0%, transparent 60%)" }} />
      <DotGrid />
      <div style={{ maxWidth: 860, margin: "0 auto", textAlign: "center", position: "relative", zIndex: 1 }}>
        <SectionEyebrow>Get Started</SectionEyebrow>
        <h2 style={{
          fontSize: "clamp(2rem, 4vw, 3.1rem)",
          fontWeight: 900,
          color: "white",
          lineHeight: 1.1,
          letterSpacing: "-0.03em",
          marginBottom: 24,
        }}>
          Before You Spend More On Marketing,<br />
          Make Sure You're Not Losing The<br />
          Leads You Already Have.
        </h2>
        <p style={{ fontSize: 17, color: "rgba(148,163,184,0.62)", lineHeight: 1.8, marginBottom: 48, maxWidth: 560, margin: "0 auto 48px" }}>
          Book a demo and see how LeadEngine can help your business capture more opportunities and convert more customers.
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
          <a
            href={DEMO_CTA}
            className="btn-primary"
            style={{
              padding: "18px 44px",
              borderRadius: 13,
              fontSize: 16,
              fontWeight: 700,
              color: "white",
              background: "#2563EB",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 9,
              boxShadow: "0 0 56px rgba(37,99,235,0.45)",
            }}
          >
            Book a Demo <ArrowRight size={18} />
          </a>
          <a
            href="/login"
            className="btn-ghost"
            style={{
              padding: "18px 36px",
              borderRadius: 13,
              fontSize: 16,
              fontWeight: 600,
              color: "rgba(148,163,184,0.8)",
              border: "1px solid rgba(255,255,255,0.13)",
              textDecoration: "none",
              background: "rgba(255,255,255,0.04)",
              display: "inline-block",
            }}
          >
            Sign In
          </a>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer style={{ background: "#060c18", borderTop: "1px solid rgba(255,255,255,0.06)", padding: "52px 40px" }}>
      <div style={{ maxWidth: 1400, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 40, flexWrap: "wrap" }}>
          <div>
            <LEWordmark compact dark />
            <p style={{ marginTop: 12, fontSize: 12, color: "rgba(148,163,184,0.35)" }}>Local Business Growth Platform</p>
          </div>
          <div style={{ display: "flex", gap: 40, flexWrap: "wrap", alignItems: "center" }}>
            {[
              { label: "Sign In", href: "/login", internal: true },
              { label: "Book a Demo", href: DEMO_CTA, internal: false },
              { label: "Novenworks", href: "https://www.novenworks.com", internal: false },
            ].map((link) => (
              <a
                key={link.label}
                href={link.href}
                target={link.href.startsWith("http") ? "_blank" : undefined}
                rel="noopener noreferrer"
                className="link-hover"
                style={{ fontSize: 13, color: "rgba(148,163,184,0.45)", textDecoration: "none" }}
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
        <div style={{ marginTop: 40, paddingTop: 28, borderTop: "1px solid rgba(255,255,255,0.05)", fontSize: 11, color: "rgba(148,163,184,0.28)", textAlign: "center" }}>
          © {new Date().getFullYear()} Novenworks · All rights reserved.
        </div>
      </div>
    </footer>
  );
}

export default function Landing() {
  const { data: user } = useGetMe();
  const isLoggedIn = !!user;

  return (
    <>
      <style>{LANDING_CSS}</style>
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
