import { useGetMe } from "@workspace/api-client-react";
import { LEWordmark } from "@/components/Logo";
import {
  TrendingUp, Users, AlertCircle, DollarSign,
  CheckCircle, ArrowRight, Zap, Target, BarChart3,
  Phone, Globe, Star, MessageSquare, Layers,
} from "lucide-react";

const DEMO_CTA = "mailto:hello@novenworks.com?subject=LeadEngine%20Demo%20Request";

const PREVIEW_METRICS = [
  { label: "Total Leads", value: "147", icon: Users, color: "#60a5fa", bg: "rgba(37,99,235,0.18)" },
  { label: "Pipeline Value", value: "$89.4k", icon: TrendingUp, color: "#34d399", bg: "rgba(16,185,129,0.15)" },
  { label: "Follow-Ups Due", value: "12", icon: AlertCircle, color: "#fbbf24", bg: "rgba(245,158,11,0.15)" },
  { label: "Revenue Won", value: "$32.1k", icon: DollarSign, color: "#4ade80", bg: "rgba(34,197,94,0.15)" },
];

const PIPELINE_COLS = [
  { name: "New", count: 24, color: "#60a5fa", bg: "rgba(37,99,235,0.2)", leads: [{ name: "Sarah M.", svc: "Consultation" }, { name: "Mike T.", svc: "Service Inquiry" }] },
  { name: "Contacted", count: 18, color: "#a78bfa", bg: "rgba(124,58,237,0.2)", leads: [{ name: "Jessica R.", svc: "Treatment Pkg" }, { name: "David L.", svc: "Membership" }] },
  { name: "Booked", count: 12, color: "#fbbf24", bg: "rgba(245,158,11,0.2)", leads: [{ name: "Anna K.", svc: "Repair Quote" }, { name: "Carlos P.", svc: "Estimate" }] },
  { name: "Won", count: 8, color: "#4ade80", bg: "rgba(34,197,94,0.2)", leads: [{ name: "Rachel S.", svc: "Annual Plan" }, { name: "Tom B.", svc: "Full Service" }] },
];

const PAIN_POINTS = [
  { icon: MessageSquare, text: "Website forms get buried in email inboxes" },
  { icon: Phone, text: "Phone calls and walk-ins are never tracked" },
  { icon: Globe, text: "Instagram and Facebook leads get forgotten" },
  { icon: Users, text: "Owners don't know who followed up" },
  { icon: DollarSign, text: "Revenue gets lost because nobody owns the pipeline" },
];

const SOURCES = ["Website forms", "Phone calls", "Walk-ins", "Referrals", "Google", "Facebook", "Instagram"];

const STEPS = [
  {
    n: "01",
    icon: Target,
    title: "Capture Every Opportunity",
    body: "Every lead enters LeadEngine — whether they came from your website, a phone call, Google, Instagram, a walk-in, or a referral.",
  },
  {
    n: "02",
    icon: Zap,
    title: "Follow Up Consistently",
    body: "Know exactly who needs a call, text, quote, or follow-up. No more forgotten leads. No more lost opportunities.",
  },
  {
    n: "03",
    icon: BarChart3,
    title: "Grow Revenue",
    body: "See your pipeline, booked work, and revenue in one place. Know what's working and where customers are coming from.",
  },
];

const USE_CASES = [
  { icon: Star, label: "Wellness Centers", detail: "Consultations, memberships, service inquiries" },
  { icon: Star, label: "Med Spas", detail: "Treatment inquiries, consultations, packages" },
  { icon: Star, label: "Auto Repair Shops", detail: "Repair calls, diagnostics, estimates" },
  { icon: Star, label: "Contractors", detail: "Quote requests, project inquiries, follow-ups" },
  { icon: Star, label: "Pet Services", detail: "Subscriptions, cleanups, appointments" },
  { icon: Star, label: "Salons", detail: "Appointments, service inquiries, rebooking" },
  { icon: Star, label: "Service Businesses", detail: "Forms, calls, referrals, walk-ins" },
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

function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ color: "#2563EB", fontSize: 11, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 12 }}>
      {children}
    </p>
  );
}

function SectionHeading({ children, center = false }: { children: React.ReactNode; center?: boolean }) {
  return (
    <h2 style={{
      fontSize: "clamp(1.75rem, 3.5vw, 2.5rem)",
      fontWeight: 800,
      color: "white",
      lineHeight: 1.15,
      letterSpacing: "-0.02em",
      textAlign: center ? "center" : undefined,
      marginBottom: 16,
    }}>
      {children}
    </h2>
  );
}

function DashboardMockup() {
  return (
    <div
      className="animate-in fade-in slide-in-from-right-8 duration-700"
      style={{
        background: "rgba(11,18,32,0.95)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 14,
        overflow: "hidden",
        boxShadow: "0 40px 100px rgba(0,0,0,0.7), 0 0 0 1px rgba(37,99,235,0.15), 0 0 60px rgba(37,99,235,0.08)",
        animationDelay: "200ms",
        animationFillMode: "both",
        width: "100%",
        maxWidth: 540,
      }}
    >
      {/* Browser chrome */}
      <div style={{ background: "#0d1526", padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", gap: 7 }}>
        <div style={{ width: 9, height: 9, borderRadius: "50%", background: "#ef4444", opacity: 0.8 }} />
        <div style={{ width: 9, height: 9, borderRadius: "50%", background: "#fbbf24", opacity: 0.8 }} />
        <div style={{ width: 9, height: 9, borderRadius: "50%", background: "#22c55e", opacity: 0.8 }} />
        <div style={{ marginLeft: 10, flex: 1, background: "rgba(255,255,255,0.05)", borderRadius: 5, padding: "3px 10px", fontSize: 9, color: "rgba(148,163,184,0.4)", fontFamily: "monospace" }}>
          app.novenworks.com/dashboard
        </div>
      </div>

      {/* Dashboard body */}
      <div style={{ padding: "16px 16px 20px" }}>
        {/* Header row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "white" }}>Dashboard</div>
            <div style={{ fontSize: 9, color: "rgba(148,163,184,0.5)", marginTop: 1 }}>Citrus & Sage Wellness</div>
          </div>
          <div style={{ background: "rgba(37,99,235,0.15)", border: "1px solid rgba(37,99,235,0.3)", borderRadius: 6, padding: "4px 10px", fontSize: 9, color: "#93c5fd", fontWeight: 600 }}>
            + New Lead
          </div>
        </div>

        {/* Metrics */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 14 }}>
          {PREVIEW_METRICS.map((m) => (
            <div key={m.label} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, padding: "10px 8px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 6 }}>
                <div style={{ width: 18, height: 18, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", background: m.bg, flexShrink: 0 }}>
                  <m.icon size={10} color={m.color} />
                </div>
                <span style={{ fontSize: 8, color: "rgba(148,163,184,0.55)", lineHeight: 1.2 }}>{m.label}</span>
              </div>
              <div style={{ fontSize: 15, fontWeight: 800, color: "white", letterSpacing: "-0.02em" }}>{m.value}</div>
            </div>
          ))}
        </div>

        {/* Pipeline */}
        <div>
          <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(148,163,184,0.5)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 8 }}>Pipeline</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 7 }}>
            {PIPELINE_COLS.map((col) => (
              <div key={col.name} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, padding: "8px 7px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
                  <span style={{ fontSize: 8, fontWeight: 700, color: "rgba(148,163,184,0.65)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{col.name}</span>
                  <span style={{ fontSize: 8, fontWeight: 800, color: col.color, background: col.bg, borderRadius: 99, padding: "1px 5px" }}>{col.count}</span>
                </div>
                {col.leads.map((lead, i) => (
                  <div key={i} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 5, padding: "5px 6px", marginBottom: i === 0 ? 5 : 0 }}>
                    <div style={{ fontSize: 8, fontWeight: 600, color: "rgba(255,255,255,0.85)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{lead.name}</div>
                    <div style={{ fontSize: 7, color: "rgba(148,163,184,0.45)", marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{lead.svc}</div>
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

function Nav({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <nav style={{
      position: "sticky",
      top: 0,
      zIndex: 50,
      background: "rgba(11,18,32,0.85)",
      backdropFilter: "blur(20px)",
      borderBottom: "1px solid rgba(255,255,255,0.07)",
    }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 60 }}>
        <LEWordmark compact dark />
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {isLoggedIn ? (
            <a
              href="/dashboard"
              style={{
                padding: "8px 18px",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                color: "white",
                background: "#2563EB",
                textDecoration: "none",
                display: "inline-block",
              }}
            >
              Go to Dashboard →
            </a>
          ) : (
            <>
              <a
                href="/login"
                style={{ padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, color: "rgba(148,163,184,0.85)", textDecoration: "none" }}
              >
                Sign In
              </a>
              <a
                href={DEMO_CTA}
                style={{
                  padding: "8px 18px",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  color: "white",
                  background: "#2563EB",
                  textDecoration: "none",
                  display: "inline-block",
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
    <section style={{ position: "relative", overflow: "hidden", padding: "80px 24px 100px", background: "linear-gradient(170deg, #0B1220 0%, #091628 60%, #060f1f 100%)" }}>
      <GlowBlob style={{ width: 700, height: 700, top: -200, right: -200, background: "radial-gradient(circle, rgba(37,99,235,0.12) 0%, transparent 65%)" }} />
      <GlowBlob style={{ width: 400, height: 400, bottom: -100, left: -100, background: "radial-gradient(circle, rgba(16,185,129,0.07) 0%, transparent 70%)" }} />
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        backgroundImage: "radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)",
        backgroundSize: "30px 30px",
      }} />

      <div style={{ maxWidth: 1200, margin: "0 auto", position: "relative", zIndex: 1 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, alignItems: "center" }} className="lg:grid-cols-2 grid-cols-1">

          {/* Left: copy + CTAs */}
          <div className="animate-in fade-in slide-in-from-bottom-6 duration-700" style={{ animationFillMode: "both" }}>
            <SectionEyebrow>Local Business Growth Platform</SectionEyebrow>
            <h1 style={{
              fontSize: "clamp(2.4rem, 5vw, 3.5rem)",
              fontWeight: 900,
              color: "white",
              lineHeight: 1.08,
              letterSpacing: "-0.03em",
              marginBottom: 24,
            }}>
              Stop Losing Customers You Already Paid To Get.
            </h1>
            <p style={{ fontSize: 17, color: "rgba(148,163,184,0.75)", lineHeight: 1.7, marginBottom: 16, maxWidth: 500 }}>
              LeadEngine helps local businesses capture every lead, follow up faster, and turn more inquiries into paying customers.
            </p>
            <p style={{ fontSize: 15, color: "rgba(148,163,184,0.55)", lineHeight: 1.7, marginBottom: 36, maxWidth: 480 }}>
              Most local businesses don't have a lead problem. They have a follow-up problem. LeadEngine gives you one place to track every inquiry, every conversation, and every opportunity.
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <a
                href={DEMO_CTA}
                style={{
                  padding: "14px 28px",
                  borderRadius: 10,
                  fontSize: 15,
                  fontWeight: 700,
                  color: "white",
                  background: "#2563EB",
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  boxShadow: "0 0 32px rgba(37,99,235,0.35)",
                  transition: "opacity 0.2s",
                }}
                onMouseEnter={e => (e.currentTarget.style.opacity = "0.88")}
                onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
              >
                Book a Demo <ArrowRight size={16} />
              </a>
              {isLoggedIn ? (
                <a href="/dashboard" style={{ padding: "14px 24px", borderRadius: 10, fontSize: 15, fontWeight: 600, color: "rgba(148,163,184,0.85)", border: "1px solid rgba(255,255,255,0.12)", textDecoration: "none", background: "rgba(255,255,255,0.04)", display: "inline-block" }}>
                  Go to Dashboard
                </a>
              ) : (
                <a href="/login" style={{ padding: "14px 24px", borderRadius: 10, fontSize: 15, fontWeight: 600, color: "rgba(148,163,184,0.85)", border: "1px solid rgba(255,255,255,0.12)", textDecoration: "none", background: "rgba(255,255,255,0.04)", display: "inline-block" }}>
                  Sign In
                </a>
              )}
            </div>
          </div>

          {/* Right: dashboard mockup */}
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
            <DashboardMockup />
          </div>

        </div>
      </div>
    </section>
  );
}

function ProblemSection() {
  return (
    <section style={{ padding: "100px 24px", background: "#080f1d", position: "relative", overflow: "hidden" }}>
      <GlowBlob style={{ width: 500, height: 500, top: "50%", left: "50%", transform: "translate(-50%,-50%)", background: "radial-gradient(circle, rgba(37,99,235,0.06) 0%, transparent 70%)" }} />
      <div style={{ maxWidth: 900, margin: "0 auto", textAlign: "center", position: "relative", zIndex: 1 }}>
        <SectionEyebrow>The Problem</SectionEyebrow>
        <SectionHeading center>Leads Are Slipping Through The Cracks Every Day.</SectionHeading>
        <div style={{ fontSize: 17, color: "rgba(148,163,184,0.65)", lineHeight: 1.9, marginBottom: 56 }}>
          <p>A customer calls. Nobody writes it down.</p>
          <p>A website form gets buried in an inbox.</p>
          <p>An Instagram message gets forgotten.</p>
          <p>A referral never gets followed up with.</p>
          <br />
          <span style={{ color: "rgba(148,163,184,0.45)", fontStyle: "italic" }}>Not because you're bad at business. Because you're busy running it.</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
          {PAIN_POINTS.map((p) => (
            <div
              key={p.text}
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 12,
                padding: "18px 20px",
                display: "flex",
                alignItems: "flex-start",
                gap: 14,
                textAlign: "left",
              }}
            >
              <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <p.icon size={15} color="#f87171" />
              </div>
              <span style={{ fontSize: 13, color: "rgba(148,163,184,0.8)", lineHeight: 1.5 }}>{p.text}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SolutionSection() {
  return (
    <section style={{ padding: "100px 24px", background: "#0B1220", position: "relative", overflow: "hidden" }}>
      <GlowBlob style={{ width: 600, height: 600, top: -100, right: -200, background: "radial-gradient(circle, rgba(37,99,235,0.09) 0%, transparent 65%)" }} />
      <div style={{ maxWidth: 1100, margin: "0 auto", position: "relative", zIndex: 1 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "center" }}>
          <div>
            <SectionEyebrow>The Solution</SectionEyebrow>
            <SectionHeading>LeadEngine Gives Every Lead A Home.</SectionHeading>
            <p style={{ fontSize: 16, color: "rgba(148,163,184,0.65)", lineHeight: 1.75, marginBottom: 28 }}>
              Capture leads from every channel, then track them from first contact to paying customer.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 32 }}>
              {SOURCES.map((s) => (
                <span
                  key={s}
                  style={{
                    background: "rgba(37,99,235,0.1)",
                    border: "1px solid rgba(37,99,235,0.25)",
                    borderRadius: 99,
                    padding: "6px 14px",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#93c5fd",
                  }}
                >
                  {s}
                </span>
              ))}
            </div>
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: 24 }}>
              {["No spreadsheets.", "No sticky notes.", "No guessing."].map((line) => (
                <div key={line} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <CheckCircle size={16} color="#34d399" style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: 15, fontWeight: 600, color: "rgba(255,255,255,0.8)" }}>{line}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {[
              { icon: Target, label: "Manual Lead Entry", color: "#60a5fa", bg: "rgba(37,99,235,0.15)" },
              { icon: BarChart3, label: "Pipeline Tracking", color: "#a78bfa", bg: "rgba(124,58,237,0.15)" },
              { icon: Zap, label: "Follow-Up Tasks", color: "#fbbf24", bg: "rgba(245,158,11,0.15)" },
              { icon: Globe, label: "Lead Source Tracking", color: "#34d399", bg: "rgba(16,185,129,0.15)" },
              { icon: DollarSign, label: "Revenue Visibility", color: "#4ade80", bg: "rgba(34,197,94,0.15)" },
              { icon: Layers, label: "Workspace Management", color: "#f472b6", bg: "rgba(236,72,153,0.15)" },
            ].map((f) => (
              <div
                key={f.label}
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 12,
                  padding: "18px 16px",
                  transition: "border-color 0.2s, background 0.2s",
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(37,99,235,0.35)"; (e.currentTarget as HTMLElement).style.background = "rgba(37,99,235,0.05)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.08)"; (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)"; }}
              >
                <div style={{ width: 34, height: 34, borderRadius: 8, background: f.bg, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                  <f.icon size={16} color={f.color} />
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.85)", lineHeight: 1.3 }}>{f.label}</div>
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
    <section style={{ padding: "100px 24px", background: "#080f1d" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <SectionEyebrow>How It Works</SectionEyebrow>
          <SectionHeading center>Three Steps To A Tighter Pipeline</SectionHeading>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
          {STEPS.map((step) => (
            <div
              key={step.n}
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 16,
                padding: 32,
                position: "relative",
              }}
            >
              <div style={{ fontSize: 48, fontWeight: 900, color: "rgba(37,99,235,0.15)", lineHeight: 1, marginBottom: 20, letterSpacing: "-0.04em" }}>{step.n}</div>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(37,99,235,0.15)", border: "1px solid rgba(37,99,235,0.3)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                <step.icon size={20} color="#60a5fa" />
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: "white", marginBottom: 12, lineHeight: 1.3 }}>{step.title}</h3>
              <p style={{ fontSize: 14, color: "rgba(148,163,184,0.65)", lineHeight: 1.7 }}>{step.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function RevenueSection() {
  return (
    <section style={{ padding: "100px 24px", background: "linear-gradient(135deg, #060d1a 0%, #0B1220 50%, #091628 100%)", position: "relative", overflow: "hidden" }}>
      <GlowBlob style={{ width: 800, height: 800, top: "50%", left: "50%", transform: "translate(-50%,-50%)", background: "radial-gradient(circle, rgba(37,99,235,0.1) 0%, transparent 60%)" }} />
      <div style={{ maxWidth: 900, margin: "0 auto", textAlign: "center", position: "relative", zIndex: 1 }}>
        <SectionEyebrow>Revenue Impact</SectionEyebrow>
        <SectionHeading center>
          If One Missed Lead Is Worth $500,<br />
          How Many Are You Losing Every Month?
        </SectionHeading>
        <p style={{ fontSize: 17, color: "rgba(148,163,184,0.65)", lineHeight: 1.75, marginBottom: 56, maxWidth: 640, margin: "0 auto 56px" }}>
          LeadEngine helps local businesses respond faster, follow up more consistently, and close more of the opportunities they already have.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
          {[
            { value: "Respond Faster", label: "From any channel — calls, forms, DMs", color: "#60a5fa", bg: "rgba(37,99,235,0.12)", border: "rgba(37,99,235,0.25)" },
            { value: "Follow Up More", label: "Never drop the ball on a warm lead", color: "#34d399", bg: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.25)" },
            { value: "Close More", label: "Turn inquiries into booked work", color: "#a78bfa", bg: "rgba(124,58,237,0.12)", border: "rgba(124,58,237,0.25)" },
            { value: "Earn More", label: "Revenue from leads you already have", color: "#fbbf24", bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.25)" },
          ].map((m) => (
            <div
              key={m.value}
              style={{
                background: m.bg,
                border: `1px solid ${m.border}`,
                borderRadius: 16,
                padding: "28px 20px",
                transition: "transform 0.2s",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-3px)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; }}
            >
              <div style={{ fontSize: 18, fontWeight: 800, color: m.color, marginBottom: 8 }}>{m.value}</div>
              <div style={{ fontSize: 12, color: "rgba(148,163,184,0.65)", lineHeight: 1.5 }}>{m.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function UseCasesSection() {
  return (
    <section style={{ padding: "100px 24px", background: "#080f1d" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <SectionEyebrow>Who It's For</SectionEyebrow>
          <SectionHeading center>Built For Local Businesses That Live On Leads</SectionHeading>
          <p style={{ fontSize: 16, color: "rgba(148,163,184,0.55)", maxWidth: 520, margin: "0 auto" }}>
            If your business depends on calls, forms, referrals, or appointments, LeadEngine helps you manage them all in one place.
          </p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
          {USE_CASES.map((uc) => (
            <div
              key={uc.label}
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 14,
                padding: "24px 20px",
                transition: "border-color 0.2s, background 0.2s, transform 0.2s",
                cursor: "default",
              }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = "rgba(37,99,235,0.4)"; el.style.background = "rgba(37,99,235,0.06)"; el.style.transform = "translateY(-2px)"; }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = "rgba(255,255,255,0.08)"; el.style.background = "rgba(255,255,255,0.03)"; el.style.transform = "translateY(0)"; }}
            >
              <div style={{ width: 36, height: 36, borderRadius: 9, background: "rgba(37,99,235,0.15)", border: "1px solid rgba(37,99,235,0.25)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
                <Star size={16} color="#60a5fa" fill="rgba(96,165,250,0.3)" />
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "white", marginBottom: 6 }}>{uc.label}</div>
              <div style={{ fontSize: 12, color: "rgba(148,163,184,0.5)", lineHeight: 1.5 }}>{uc.detail}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ModulesSection() {
  return (
    <section style={{ padding: "100px 24px", background: "#0B1220", position: "relative", overflow: "hidden" }}>
      <GlowBlob style={{ width: 600, height: 600, bottom: -200, right: -200, background: "radial-gradient(circle, rgba(37,99,235,0.08) 0%, transparent 65%)" }} />
      <div style={{ maxWidth: 900, margin: "0 auto", textAlign: "center", position: "relative", zIndex: 1 }}>
        <SectionEyebrow>Product</SectionEyebrow>
        <SectionHeading center>Everything Your Lead Follow-Up Process Needs In One Place</SectionHeading>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center", marginTop: 40 }}>
          {MODULES.map((m) => (
            <div
              key={m.label}
              style={{
                background: m.soon ? "rgba(255,255,255,0.02)" : "rgba(37,99,235,0.1)",
                border: `1px solid ${m.soon ? "rgba(255,255,255,0.08)" : "rgba(37,99,235,0.3)"}`,
                borderRadius: 99,
                padding: "10px 20px",
                display: "flex",
                alignItems: "center",
                gap: 8,
                transition: "background 0.2s, border-color 0.2s",
              }}
            >
              <span style={{ fontSize: 14, fontWeight: 600, color: m.soon ? "rgba(148,163,184,0.4)" : "#93c5fd" }}>{m.label}</span>
              {m.soon && (
                <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "rgba(148,163,184,0.4)", background: "rgba(255,255,255,0.05)", borderRadius: 99, padding: "2px 7px" }}>
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
    <section style={{ padding: "100px 24px", background: "#080f1d", position: "relative", overflow: "hidden" }}>
      <GlowBlob style={{ width: 700, height: 700, top: "50%", left: "50%", transform: "translate(-50%,-50%)", background: "radial-gradient(circle, rgba(37,99,235,0.12) 0%, transparent 60%)" }} />
      <div style={{ maxWidth: 800, margin: "0 auto", textAlign: "center", position: "relative", zIndex: 1 }}>
        <SectionEyebrow>Get Started</SectionEyebrow>
        <h2 style={{ fontSize: "clamp(1.75rem, 3.5vw, 2.75rem)", fontWeight: 900, color: "white", lineHeight: 1.15, letterSpacing: "-0.025em", marginBottom: 20 }}>
          Before You Spend More Money On Marketing, Make Sure You're Not Losing The Leads You Already Have.
        </h2>
        <p style={{ fontSize: 17, color: "rgba(148,163,184,0.65)", lineHeight: 1.75, marginBottom: 40, maxWidth: 580, margin: "0 auto 40px" }}>
          Book a demo and see how LeadEngine can help your business capture more opportunities and convert more customers.
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
          <a
            href={DEMO_CTA}
            style={{
              padding: "16px 36px",
              borderRadius: 12,
              fontSize: 16,
              fontWeight: 700,
              color: "white",
              background: "#2563EB",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              boxShadow: "0 0 48px rgba(37,99,235,0.4)",
              transition: "opacity 0.2s",
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = "0.88")}
            onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
          >
            Book a Demo <ArrowRight size={17} />
          </a>
          <a href="/login" style={{ padding: "16px 28px", borderRadius: 12, fontSize: 16, fontWeight: 600, color: "rgba(148,163,184,0.8)", border: "1px solid rgba(255,255,255,0.12)", textDecoration: "none", background: "rgba(255,255,255,0.04)", display: "inline-block" }}>
            Sign In
          </a>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer style={{ background: "#060c18", borderTop: "1px solid rgba(255,255,255,0.06)", padding: "40px 24px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 32, flexWrap: "wrap" }}>
          <div>
            <LEWordmark compact dark />
            <p style={{ marginTop: 10, fontSize: 12, color: "rgba(148,163,184,0.4)" }}>Local Business Growth Platform</p>
          </div>
          <div style={{ display: "flex", gap: 32, flexWrap: "wrap" }}>
            {[
              { label: "Sign In", href: "/login", internal: true },
              { label: "Book a Demo", href: DEMO_CTA, internal: false },
              { label: "Novenworks", href: "https://www.novenworks.com", internal: false },
            ].map((link) =>
              link.internal ? (
                <a key={link.label} href={link.href}
                  style={{ fontSize: 13, color: "rgba(148,163,184,0.5)", textDecoration: "none", transition: "color 0.2s" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "rgba(148,163,184,0.9)")}
                  onMouseLeave={e => (e.currentTarget.style.color = "rgba(148,163,184,0.5)")}
                >
                  {link.label}
                </a>
              ) : (
                <a key={link.label} href={link.href} target={link.href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer"
                  style={{ fontSize: 13, color: "rgba(148,163,184,0.5)", textDecoration: "none", transition: "color 0.2s" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "rgba(148,163,184,0.9)")}
                  onMouseLeave={e => (e.currentTarget.style.color = "rgba(148,163,184,0.5)")}
                >
                  {link.label}
                </a>
              )
            )}
          </div>
        </div>
        <div style={{ marginTop: 32, paddingTop: 24, borderTop: "1px solid rgba(255,255,255,0.05)", fontSize: 11, color: "rgba(148,163,184,0.3)", textAlign: "center" }}>
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
  );
}
