import { useGetMe } from "@workspace/api-client-react";
import { LEWordmark } from "@/components/Logo";
import {
  ArrowRight, ChevronDown, CheckCircle,
  Users, TrendingUp, AlertCircle, DollarSign,
  Target, Zap, BarChart3, MessageSquare, Phone,
  Globe, Briefcase, Activity, Layers,
} from "lucide-react";

const DEMO_CTA = "mailto:hello@novenworks.com?subject=LeadEngine%20Demo%20Request";

/* ─────────────────────────────────────────────────────────
   CSS – all in one block so nothing fights Tailwind
───────────────────────────────────────────────────────── */
const CSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  /* ── Grids ── */
  .ld-hero   { display: grid; grid-template-columns: 1fr 1.1fr; gap: 72px; align-items: center; }
  .ld-sol    { display: grid; grid-template-columns: 1fr 1fr;   gap: 80px; align-items: start; }
  .ld-steps  { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
  .ld-pain   { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
  .ld-rev    { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; }
  .ld-uc     { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
  .ld-feat   { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
  .ld-mock-m { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 16px; }
  .ld-mock-p { display: grid; grid-template-columns: repeat(4, 1fr); gap: 7px; }

  /* ── Tablet ── */
  @media (max-width: 1024px) {
    .ld-hero  { grid-template-columns: 1fr; gap: 52px; }
    .ld-sol   { grid-template-columns: 1fr; gap: 52px; }
    .ld-steps { grid-template-columns: 1fr 1fr; }
    .ld-pain  { grid-template-columns: repeat(2, 1fr); }
    .ld-rev   { grid-template-columns: repeat(2, 1fr); }
    .ld-uc    { grid-template-columns: repeat(3, 1fr); }
    .ld-float { display: none !important; }
  }

  /* ── Mobile ── */
  @media (max-width: 600px) {
    .ld-steps  { grid-template-columns: 1fr; }
    .ld-pain   { grid-template-columns: 1fr; }
    .ld-rev    { grid-template-columns: 1fr 1fr; }
    .ld-uc     { grid-template-columns: repeat(2, 1fr); }
    .ld-feat   { grid-template-columns: 1fr 1fr; }
    .ld-mock-p { grid-template-columns: repeat(2, 1fr); }
    .ld-nav-cta { display: none; }
    .ld-sec    { padding: 80px 20px !important; }
    .ld-hero-p { padding: 90px 20px 80px !important; }
  }

  /* ── Animations ── */
  @keyframes fadeUp {
    from { opacity:0; transform:translateY(26px); }
    to   { opacity:1; transform:translateY(0); }
  }
  @keyframes fadeIn {
    from { opacity:0; }
    to   { opacity:1; }
  }
  @keyframes floatY {
    0%,100% { transform:translateY(0); }
    50%     { transform:translateY(-10px); }
  }
  @keyframes fc1 {
    0%,100% { transform:translateY(0) translateX(0); }
    50%     { transform:translateY(-7px) translateX(2px); }
  }
  @keyframes fc2 {
    0%,100% { transform:translateY(0); }
    50%     { transform:translateY(6px); }
  }
  .an-up  { animation: fadeUp 0.6s cubic-bezier(.22,.68,0,1.1) both; }
  .an-u1  { animation: fadeUp 0.6s cubic-bezier(.22,.68,0,1.1) 0.1s both; }
  .an-u2  { animation: fadeUp 0.6s cubic-bezier(.22,.68,0,1.1) 0.2s both; }
  .an-in  { animation: fadeIn 0.9s ease 0.3s both; }
  .an-f   { animation: floatY 7s ease-in-out infinite; }
  .an-fc1 { animation: fc1 5s ease-in-out 0.4s infinite; }
  .an-fc2 { animation: fc2 6s ease-in-out 0.9s infinite; }

  /* ── Hover ── */
  .ch { transition: border-color .2s, background .2s, transform .22s, box-shadow .22s; cursor:default; }
  .ch:hover {
    border-color: rgba(37,99,235,.5) !important;
    background: rgba(37,99,235,.07) !important;
    transform: translateY(-4px);
    box-shadow: 0 16px 40px rgba(0,0,0,.4), 0 0 0 1px rgba(37,99,235,.18);
  }
  .btn-blue { transition: opacity .18s, transform .15s, box-shadow .2s; }
  .btn-blue:hover { opacity:.86; transform:translateY(-2px); box-shadow:0 0 56px rgba(37,99,235,.6) !important; }
  .btn-ghost-ld { transition: background .18s, transform .15s; }
  .btn-ghost-ld:hover { background:rgba(255,255,255,.08) !important; transform:translateY(-2px); }
  .nav-link { transition: color .18s; }
  .nav-link:hover { color: rgba(255,255,255,.9) !important; }

  /* ── Gradient text ── */
  .gt {
    background: linear-gradient(120deg, #93c5fd 0%, #2563eb 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
`;

/* ─────────────────────────────────────────────────────────
   Static data
───────────────────────────────────────────────────────── */
const METRICS = [
  { label: "Total Leads",    value: "147",   icon: Users,       color: "#60a5fa", bg: "rgba(37,99,235,.22)" },
  { label: "Pipeline Value", value: "$89.4k", icon: TrendingUp, color: "#34d399", bg: "rgba(16,185,129,.2)" },
  { label: "Follow-Ups Due", value: "12",    icon: AlertCircle, color: "#fbbf24", bg: "rgba(245,158,11,.2)" },
  { label: "Revenue Won",    value: "$32.1k", icon: DollarSign, color: "#4ade80", bg: "rgba(34,197,94,.2)" },
];

const PIPELINE = [
  { name:"New",       count:24, color:"#60a5fa", cbg:"rgba(37,99,235,.22)",  leads:[{n:"Sarah M.",svc:"Consultation"},{n:"Mike T.",svc:"Service Inquiry"}] },
  { name:"Contacted", count:18, color:"#a78bfa", cbg:"rgba(124,58,237,.22)", leads:[{n:"Jessica R.",svc:"Treatment Pkg"},{n:"David L.",svc:"Membership"}] },
  { name:"Booked",    count:12, color:"#fbbf24", cbg:"rgba(245,158,11,.22)", leads:[{n:"Anna K.",svc:"Repair Quote"},{n:"Carlos P.",svc:"Estimate"}] },
  { name:"Won",       count:8,  color:"#4ade80", cbg:"rgba(34,197,94,.22)",  leads:[{n:"Rachel S.",svc:"Annual Plan"},{n:"Tom B.",svc:"Full Service"}] },
];

const PAIN = [
  { icon:MessageSquare, title:"Website Forms Get Buried",        body:"Inquiries sit in a shared inbox and never get followed up with." },
  { icon:Phone,         title:"Phone Calls Go Untracked",        body:"Calls and walk-ins are taken verbally and forgotten by end of day." },
  { icon:Users,         title:"Referrals Get Forgotten",         body:"Word-of-mouth leads arrive with no system to capture and follow through." },
  { icon:Globe,         title:"Messages Never Get Followed Up",  body:"Instagram, Facebook, and Google messages disappear into the noise." },
  { icon:AlertCircle,   title:"Nobody Owns The Pipeline",        body:"Without a clear system, nobody knows who's responsible for what." },
  { icon:DollarSign,    title:"Revenue Walks Away",              body:"Every missed follow-up is a paying customer choosing your competitor." },
];

const SOURCES = ["Website Forms","Phone Calls","Walk-Ins","Google Business Profile","Facebook","Instagram","Referrals","Yelp"];

const FEATURES = [
  { icon:Target,    label:"Lead Capture",          color:"#60a5fa", bg:"rgba(37,99,235,.14)" },
  { icon:BarChart3, label:"Pipeline Tracking",     color:"#a78bfa", bg:"rgba(124,58,237,.14)" },
  { icon:Zap,       label:"Follow-Up Management",  color:"#fbbf24", bg:"rgba(245,158,11,.14)" },
  { icon:DollarSign,label:"Revenue Visibility",    color:"#4ade80", bg:"rgba(34,197,94,.14)" },
  { icon:Briefcase, label:"Workspace Management",  color:"#f472b6", bg:"rgba(236,72,153,.14)" },
  { icon:Activity,  label:"Activity Timeline",     color:"#fb923c", bg:"rgba(251,146,60,.14)" },
];

const STEPS = [
  { n:"01", icon:Target,    title:"Capture Every Opportunity",  body:"Automatically capture leads from forms or add them manually from calls, referrals, walk-ins, and messages. Every lead enters the same system." },
  { n:"02", icon:Zap,       title:"Track Every Follow-Up",      body:"Know exactly who needs a call, quote, appointment, or follow-up. Never wonder where a lead stands or who dropped the ball." },
  { n:"03", icon:BarChart3, title:"Grow Revenue",               body:"See your pipeline, follow-up activity, and revenue in one place. Know what's working and where your best customers come from." },
];

const REV = [
  { v:"Respond Faster", l:"From any channel — calls, forms, DMs, walk-ins", color:"#60a5fa", bg:"rgba(37,99,235,.1)",  br:"rgba(37,99,235,.28)" },
  { v:"Follow Up More", l:"Never drop the ball on a warm lead again",        color:"#34d399", bg:"rgba(16,185,129,.1)", br:"rgba(16,185,129,.28)" },
  { v:"Close More",     l:"Turn more inquiries into booked appointments",    color:"#a78bfa", bg:"rgba(124,58,237,.1)", br:"rgba(124,58,237,.28)" },
  { v:"Earn More",      l:"Increase revenue from leads you already have",    color:"#fbbf24", bg:"rgba(245,158,11,.1)", br:"rgba(245,158,11,.28)" },
];

const UCDATA = [
  { label:"Wellness Centers",       icon:Target,    color:"#60a5fa", detail:"Consultations, memberships, service inquiries" },
  { label:"Med Spas",               icon:Zap,       color:"#a78bfa", detail:"Treatment inquiries, consultations, packages" },
  { label:"Auto Repair Shops",      icon:Phone,     color:"#fbbf24", detail:"Repair calls, diagnostics, estimates" },
  { label:"Contractors",            icon:Briefcase, color:"#34d399", detail:"Quote requests, project inquiries, follow-ups" },
  { label:"Pet Services",           icon:Globe,     color:"#f472b6", detail:"Subscriptions, cleanups, appointments" },
  { label:"Salons",                 icon:MessageSquare, color:"#fb923c", detail:"Appointments, service inquiries, rebooking" },
  { label:"Local Service Businesses", icon:Layers,  color:"#94a3b8", detail:"Forms, calls, referrals, walk-ins" },
];

const MODULES = [
  { label:"Leads",             soon:false },
  { label:"Pipeline",          soon:false },
  { label:"Workspaces",        soon:false },
  { label:"Follow-Ups",        soon:false },
  { label:"Revenue Dashboard", soon:false },
  { label:"Forms",             soon:false },
  { label:"Reviews",           soon:true  },
  { label:"Automations",       soon:true  },
];

/* ─────────────────────────────────────────────────────────
   Primitives
───────────────────────────────────────────────────────── */
const SEC_PAD  = { padding: "120px 48px" } as const;
const SEC_PAD_L = { padding: "140px 48px" } as const;
const INNER    = { maxWidth: 1380, margin: "0 auto" } as const;
const INNER_MD = { maxWidth: 1280, margin: "0 auto" } as const;
const INNER_SM = { maxWidth: 960,  margin: "0 auto" } as const;

function Blob({ s }: { s: React.CSSProperties }) {
  return <div style={{ position:"absolute", borderRadius:"50%", pointerEvents:"none", ...s }} />;
}

function Dots({ opacity = 0.032 }: { opacity?: number }) {
  return (
    <div style={{
      position:"absolute", inset:0, pointerEvents:"none",
      backgroundImage:"radial-gradient(rgba(255,255,255,0.035) 1px, transparent 1px)",
      backgroundSize:"30px 30px", opacity,
    }} />
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ color:"#3b82f6", fontSize:11, fontWeight:700, letterSpacing:"0.22em", textTransform:"uppercase", marginBottom:18, display:"flex", alignItems:"center", gap:10 }}>
      <span style={{ width:22, height:1.5, background:"#3b82f6", borderRadius:2, display:"inline-block", flexShrink:0 }} />
      {children}
    </p>
  );
}

function H2({ children, center }: { children: React.ReactNode; center?: boolean }) {
  return (
    <h2 style={{ fontSize:"clamp(1.95rem, 3.1vw, 2.85rem)", fontWeight:800, color:"white", lineHeight:1.1, letterSpacing:"-0.026em", textAlign:center?"center":undefined, marginBottom:20 }}>
      {children}
    </h2>
  );
}

/* ─────────────────────────────────────────────────────────
   Dashboard Mockup
───────────────────────────────────────────────────────── */
function Mockup() {
  return (
    <div className="an-f" style={{ background:"rgba(6,12,24,.98)", border:"1px solid rgba(255,255,255,.09)", borderRadius:18, overflow:"hidden", boxShadow:"0 60px 140px rgba(0,0,0,.8), 0 0 0 1px rgba(37,99,235,.14), 0 0 90px rgba(37,99,235,.09)", width:"100%" }}>
      {/* Chrome */}
      <div style={{ background:"#050b18", padding:"11px 16px", borderBottom:"1px solid rgba(255,255,255,.07)", display:"flex", alignItems:"center", gap:7 }}>
        {["#ef4444","#fbbf24","#22c55e"].map(c => <div key={c} style={{ width:10, height:10, borderRadius:"50%", background:c, opacity:.72 }} />)}
        <div style={{ marginLeft:12, flex:1, background:"rgba(255,255,255,.04)", borderRadius:5, padding:"4px 12px", fontSize:10, color:"rgba(148,163,184,.28)", fontFamily:"monospace" }}>app.novenworks.com/dashboard</div>
      </div>

      <div style={{ padding:"20px 20px 24px" }}>
        {/* Header */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:18 }}>
          <div>
            <div style={{ fontSize:14, fontWeight:700, color:"white", letterSpacing:"-0.01em" }}>Dashboard</div>
            <div style={{ fontSize:10, color:"rgba(148,163,184,.38)", marginTop:2 }}>Citrus & Sage Wellness</div>
          </div>
          <div style={{ background:"rgba(37,99,235,.16)", border:"1px solid rgba(37,99,235,.34)", borderRadius:8, padding:"5px 13px", fontSize:10, color:"#93c5fd", fontWeight:600 }}>+ New Lead</div>
        </div>

        {/* Metrics 2×2 */}
        <div className="ld-mock-m">
          {METRICS.map(m => (
            <div key={m.label} style={{ background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.08)", borderRadius:11, padding:"12px 14px" }}>
              <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:8 }}>
                <div style={{ width:23, height:23, borderRadius:6, display:"flex", alignItems:"center", justifyContent:"center", background:m.bg, flexShrink:0 }}>
                  <m.icon size={12} color={m.color} />
                </div>
                <span style={{ fontSize:9, color:"rgba(148,163,184,.42)", lineHeight:1.2 }}>{m.label}</span>
              </div>
              <div style={{ fontSize:21, fontWeight:800, color:"white", letterSpacing:"-0.03em" }}>{m.value}</div>
            </div>
          ))}
        </div>

        {/* Pipeline */}
        <div>
          <div style={{ fontSize:9, fontWeight:700, color:"rgba(148,163,184,.36)", textTransform:"uppercase", letterSpacing:"0.15em", marginBottom:10 }}>Pipeline</div>
          <div className="ld-mock-p">
            {PIPELINE.map(col => (
              <div key={col.name} style={{ background:"rgba(255,255,255,.025)", border:"1px solid rgba(255,255,255,.065)", borderRadius:10, padding:"9px 9px" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                  <span style={{ fontSize:8, fontWeight:700, color:"rgba(148,163,184,.5)", textTransform:"uppercase", letterSpacing:"0.07em" }}>{col.name}</span>
                  <span style={{ fontSize:9, fontWeight:800, color:col.color, background:col.cbg, borderRadius:99, padding:"1.5px 6px" }}>{col.count}</span>
                </div>
                {col.leads.map((lead, i) => (
                  <div key={i} style={{ background:"rgba(255,255,255,.05)", border:"1px solid rgba(255,255,255,.07)", borderRadius:6, padding:"6px 8px", marginBottom:i===0?5:0 }}>
                    <div style={{ fontSize:9, fontWeight:600, color:"rgba(255,255,255,.87)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{lead.n}</div>
                    <div style={{ fontSize:7.5, color:"rgba(148,163,184,.38)", marginTop:2, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{lead.svc}</div>
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

/* Floating stat card that orbits the mockup */
function FloatCard({ icon: Icon, label, value, color, border, anim, s }: {
  icon: React.ComponentType<{ size?: number; color?: string }>;
  label: string; value: string; color: string; border: string; anim: string;
  s: React.CSSProperties;
}) {
  return (
    <div className={`ld-float ${anim}`} style={{ position:"absolute", background:"rgba(6,12,24,.93)", backdropFilter:"blur(16px)", WebkitBackdropFilter:"blur(16px)", border:`1px solid ${border}`, borderRadius:14, padding:"13px 17px", boxShadow:"0 12px 40px rgba(0,0,0,.65), 0 0 0 1px rgba(255,255,255,.04)", zIndex:20, minWidth:152, ...s }}>
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        <div style={{ width:32, height:32, borderRadius:8, background:`${color}1a`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
          <Icon size={16} color={color} />
        </div>
        <div>
          <div style={{ fontSize:9, color:"rgba(148,163,184,.44)", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:3 }}>{label}</div>
          <div style={{ fontSize:20, fontWeight:800, color:"white", letterSpacing:"-0.025em" }}>{value}</div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   Nav
───────────────────────────────────────────────────────── */
function Nav({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <nav style={{ position:"sticky", top:0, zIndex:50, background:"rgba(7,12,24,.75)", backdropFilter:"blur(28px)", WebkitBackdropFilter:"blur(28px)", borderBottom:"1px solid rgba(255,255,255,.07)" }}>
      <div style={{ ...INNER, padding:"0 48px", display:"flex", alignItems:"center", justifyContent:"space-between", height:70 }}>
        <LEWordmark compact dark />
        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          {isLoggedIn ? (
            <a href="/dashboard" className="btn-blue" style={{ padding:"9px 24px", borderRadius:10, fontSize:14, fontWeight:600, color:"white", background:"#2563EB", textDecoration:"none", boxShadow:"0 0 28px rgba(37,99,235,.35)" }}>
              Go to Dashboard →
            </a>
          ) : (
            <>
              <a href="/login" className="nav-link" style={{ padding:"9px 18px", borderRadius:10, fontSize:14, fontWeight:600, color:"rgba(148,163,184,.72)", textDecoration:"none" }}>
                Sign In
              </a>
              <a href={DEMO_CTA} className="btn-blue ld-nav-cta" style={{ padding:"9px 22px", borderRadius:10, fontSize:14, fontWeight:600, color:"white", background:"#2563EB", textDecoration:"none", boxShadow:"0 0 24px rgba(37,99,235,.32)" }}>
                Book a Demo
              </a>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

/* ─────────────────────────────────────────────────────────
   Hero
───────────────────────────────────────────────────────── */
function Hero({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <section className="ld-hero-p" style={{ position:"relative", overflow:"visible", padding:"144px 48px 164px", background:"linear-gradient(165deg, #07101e 0%, #091626 55%, #05101d 100%)", minHeight:"calc(100vh - 70px)", display:"flex", flexDirection:"column", justifyContent:"center" }}>
      {/* Background atmosphere */}
      <Blob s={{ width:1100, height:1100, top:-350, right:-320, background:"radial-gradient(circle, rgba(37,99,235,.13) 0%, transparent 58%)" }} />
      <Blob s={{ width:600, height:600, bottom:-200, left:-150, background:"radial-gradient(circle, rgba(99,102,241,.08) 0%, transparent 65%)" }} />
      <Dots />
      <div style={{ position:"absolute", inset:0, pointerEvents:"none", background:"linear-gradient(to bottom, transparent 55%, rgba(5,10,20,.65) 100%)" }} />

      <div style={{ ...INNER, position:"relative", zIndex:1 }}>
        <div className="ld-hero">

          {/* Left: copy */}
          <div>
            <div className="an-up">
              <Eyebrow>Local Business Growth Platform</Eyebrow>
            </div>

            <div className="an-u1">
              <h1 style={{ fontSize:"clamp(2.9rem, 5vw, 4.5rem)", fontWeight:900, color:"white", lineHeight:1.03, letterSpacing:"-0.038em", marginBottom:28 }}>
                The Operating System<br />
                <span className="gt">For Local Business Growth</span>
              </h1>
            </div>

            <div className="an-u2">
              <p style={{ fontSize:19, color:"rgba(148,163,184,.8)", lineHeight:1.7, marginBottom:12, maxWidth:510 }}>
                Capture leads. Track opportunities. Grow revenue.
              </p>
              <p style={{ fontSize:15, color:"rgba(148,163,184,.48)", lineHeight:1.88, marginBottom:50, maxWidth:490 }}>
                From first inquiry to closed deal, LeadEngine gives local businesses complete visibility into their pipeline, follow-ups, and revenue.
              </p>

              <div style={{ display:"flex", alignItems:"center", gap:14, flexWrap:"wrap" }}>
                <a href={DEMO_CTA} className="btn-blue" style={{ padding:"15px 36px", borderRadius:12, fontSize:15, fontWeight:700, color:"white", background:"#2563EB", textDecoration:"none", display:"inline-flex", alignItems:"center", gap:9, boxShadow:"0 0 48px rgba(37,99,235,.45)" }}>
                  Book a Demo <ArrowRight size={17} />
                </a>
                {isLoggedIn ? (
                  <a href="/dashboard" className="btn-ghost-ld" style={{ padding:"15px 28px", borderRadius:12, fontSize:15, fontWeight:600, color:"rgba(148,163,184,.88)", border:"1px solid rgba(255,255,255,.12)", textDecoration:"none", background:"rgba(255,255,255,.04)", display:"inline-block" }}>
                    Go to Dashboard
                  </a>
                ) : (
                  <a href="#how" className="btn-ghost-ld" style={{ padding:"15px 28px", borderRadius:12, fontSize:15, fontWeight:600, color:"rgba(148,163,184,.88)", border:"1px solid rgba(255,255,255,.12)", textDecoration:"none", background:"rgba(255,255,255,.04)", display:"inline-flex", alignItems:"center", gap:8 }}>
                    See How It Works <ChevronDown size={16} />
                  </a>
                )}
              </div>

              {/* Trust line */}
              <div style={{ display:"flex", alignItems:"center", gap:18, marginTop:40, flexWrap:"wrap" }}>
                {["No contracts","Easy setup","Built for local business"].map(t => (
                  <div key={t} style={{ display:"flex", alignItems:"center", gap:7 }}>
                    <CheckCircle size={13} color="#34d399" />
                    <span style={{ fontSize:12, color:"rgba(148,163,184,.48)" }}>{t}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: mockup + floating cards */}
          <div className="an-in" style={{ position:"relative", paddingTop:36, paddingBottom:36 }}>
            {/* Ambient glow */}
            <div style={{ position:"absolute", inset:"-70px -70px -90px -70px", background:"radial-gradient(ellipse at 55% 45%, rgba(37,99,235,.22) 0%, transparent 64%)", pointerEvents:"none", zIndex:0 }} />

            {/* Floating: Revenue Won – top-left */}
            <FloatCard icon={DollarSign} label="Revenue Won" value="$32.1k" color="#4ade80" border="rgba(34,197,94,.35)" anim="an-fc1" s={{ top:4, left:-48 }} />

            {/* Floating: Follow-Ups Due – bottom-right */}
            <FloatCard icon={AlertCircle} label="Follow-Ups Due" value="12" color="#fbbf24" border="rgba(245,158,11,.35)" anim="an-fc2" s={{ bottom:20, right:-40 }} />

            <div style={{ position:"relative", zIndex:1 }}>
              <Mockup />
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────
   Problem
───────────────────────────────────────────────────────── */
function Problem() {
  return (
    <section className="ld-sec" style={{ ...SEC_PAD, background:"#060c1a", position:"relative", overflow:"hidden" }}>
      <Blob s={{ width:700, height:700, top:"50%", left:"50%", transform:"translate(-50%,-50%)", background:"radial-gradient(circle, rgba(37,99,235,.07) 0%, transparent 68%)" }} />
      <div style={{ ...INNER_MD, position:"relative", zIndex:1 }}>
        <div style={{ textAlign:"center", marginBottom:72 }}>
          <Eyebrow>The Problem</Eyebrow>
          <H2 center>Most Local Businesses Don't Need More Leads.<br />They Need Better Follow-Up.</H2>
          <p style={{ fontSize:16, color:"rgba(148,163,184,.52)", lineHeight:1.85, maxWidth:560, margin:"0 auto" }}>
            Every day, potential customers slip through the cracks — not because business owners don't care, but because they're busy running the business.
          </p>
        </div>
        <div className="ld-pain">
          {PAIN.map(p => (
            <div key={p.title} className="ch" style={{ background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.08)", borderRadius:16, padding:"30px 26px" }}>
              <div style={{ width:44, height:44, borderRadius:12, background:"rgba(239,68,68,.11)", border:"1px solid rgba(239,68,68,.22)", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:18 }}>
                <p.icon size={20} color="#f87171" />
              </div>
              <div style={{ fontSize:15, fontWeight:700, color:"white", marginBottom:10, letterSpacing:"-0.01em" }}>{p.title}</div>
              <div style={{ fontSize:13, color:"rgba(148,163,184,.58)", lineHeight:1.72 }}>{p.body}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────
   Solution
───────────────────────────────────────────────────────── */
function Solution() {
  return (
    <section className="ld-sec" style={{ ...SEC_PAD, background:"#0B1220", position:"relative", overflow:"hidden" }}>
      <Blob s={{ width:700, height:700, top:-100, right:-250, background:"radial-gradient(circle, rgba(37,99,235,.1) 0%, transparent 62%)" }} />
      <div style={{ ...INNER, position:"relative", zIndex:1 }}>
        <div className="ld-sol">
          {/* Left */}
          <div>
            <Eyebrow>The Solution</Eyebrow>
            <H2>Every Opportunity<br />In One Place.</H2>
            <p style={{ fontSize:16, color:"rgba(148,163,184,.62)", lineHeight:1.88, marginBottom:12 }}>
              LeadEngine gives your business a single place to capture leads, track follow-ups, manage opportunities, and understand what's driving revenue.
            </p>
            <p style={{ fontSize:16, color:"rgba(148,163,184,.5)", lineHeight:1.88, marginBottom:32 }}>
              Whether a lead comes from your website, Google, a phone call, Instagram, or a referral — it enters the same system.
            </p>
            {/* Source chips */}
            <div style={{ display:"flex", flexWrap:"wrap", gap:9, marginBottom:36 }}>
              {SOURCES.map(s => (
                <span key={s} style={{ background:"rgba(37,99,235,.1)", border:"1px solid rgba(37,99,235,.28)", borderRadius:99, padding:"7px 15px", fontSize:12, fontWeight:600, color:"#93c5fd" }}>{s}</span>
              ))}
            </div>
            <div style={{ borderTop:"1px solid rgba(255,255,255,.07)", paddingTop:28 }}>
              {["No spreadsheets.","No sticky notes.","No guessing."].map(line => (
                <div key={line} style={{ display:"flex", alignItems:"center", gap:12, marginBottom:14 }}>
                  <CheckCircle size={17} color="#34d399" style={{ flexShrink:0 }} />
                  <span style={{ fontSize:16, fontWeight:600, color:"rgba(255,255,255,.82)" }}>{line}</span>
                </div>
              ))}
            </div>
          </div>
          {/* Right: feature grid */}
          <div className="ld-feat" style={{ alignSelf:"center" }}>
            {FEATURES.map(f => (
              <div key={f.label} className="ch" style={{ background:"rgba(255,255,255,.035)", border:"1px solid rgba(255,255,255,.08)", borderRadius:16, padding:"26px 22px" }}>
                <div style={{ width:44, height:44, borderRadius:12, background:f.bg, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:16 }}>
                  <f.icon size={21} color={f.color} />
                </div>
                <div style={{ fontSize:14, fontWeight:700, color:"rgba(255,255,255,.88)", lineHeight:1.35 }}>{f.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────
   How It Works
───────────────────────────────────────────────────────── */
function HowItWorks() {
  return (
    <section id="how" className="ld-sec" style={{ ...SEC_PAD, background:"#060c1a" }}>
      <div style={{ ...INNER_MD, }}>
        <div style={{ textAlign:"center", marginBottom:72 }}>
          <Eyebrow>How It Works</Eyebrow>
          <H2 center>Simple Enough To Use Every Day.<br />Powerful Enough To Grow With Your Business.</H2>
        </div>
        <div className="ld-steps">
          {STEPS.map(step => (
            <div key={step.n} style={{ background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.09)", borderRadius:20, padding:"52px 40px", position:"relative", overflow:"hidden" }}>
              <div style={{ position:"absolute", top:18, right:22, fontSize:80, fontWeight:900, color:"rgba(37,99,235,.09)", lineHeight:1, letterSpacing:"-0.06em", userSelect:"none" }}>{step.n}</div>
              <div style={{ width:52, height:52, borderRadius:14, background:"rgba(37,99,235,.13)", border:"1px solid rgba(37,99,235,.28)", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:28 }}>
                <step.icon size={26} color="#60a5fa" />
              </div>
              <h3 style={{ fontSize:20, fontWeight:700, color:"white", marginBottom:14, lineHeight:1.25, letterSpacing:"-0.01em" }}>{step.title}</h3>
              <p style={{ fontSize:15, color:"rgba(148,163,184,.6)", lineHeight:1.82 }}>{step.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────
   Revenue
───────────────────────────────────────────────────────── */
function Revenue() {
  return (
    <section className="ld-sec" style={{ ...SEC_PAD_L, background:"linear-gradient(155deg, #060c1a 0%, #0b1220 50%, #08142a 100%)", position:"relative", overflow:"hidden" }}>
      <Blob s={{ width:1100, height:1100, top:"50%", left:"50%", transform:"translate(-50%,-50%)", background:"radial-gradient(circle, rgba(37,99,235,.12) 0%, transparent 56%)" }} />
      <Dots />
      <div style={{ ...INNER_SM, textAlign:"center", position:"relative", zIndex:1 }}>
        <Eyebrow>Revenue Impact</Eyebrow>
        <h2 style={{ fontSize:"clamp(2.1rem, 3.8vw, 3.35rem)", fontWeight:900, color:"white", lineHeight:1.07, letterSpacing:"-0.03em", marginBottom:24 }}>
          The Fastest Way To Grow Revenue<br />Isn't More Marketing.<br />
          <span className="gt">It's Better Follow-Up.</span>
        </h2>
        <p style={{ fontSize:17, color:"rgba(148,163,184,.55)", lineHeight:1.88, marginBottom:64, maxWidth:560, marginLeft:"auto", marginRight:"auto" }}>
          Most businesses focus on getting more leads. The businesses that grow focus on converting more of the leads they already have.
        </p>
        <div className="ld-rev">
          {REV.map(m => (
            <div key={m.v} className="ch" style={{ background:m.bg, border:`1px solid ${m.br}`, borderRadius:20, padding:"40px 32px" }}>
              <div style={{ fontSize:22, fontWeight:800, color:m.color, marginBottom:12, letterSpacing:"-0.01em" }}>{m.v}</div>
              <div style={{ fontSize:13, color:"rgba(148,163,184,.58)", lineHeight:1.68 }}>{m.l}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────
   Use Cases
───────────────────────────────────────────────────────── */
function UseCases() {
  return (
    <section className="ld-sec" style={{ ...SEC_PAD, background:"#060c1a" }}>
      <div style={{ ...INNER, }}>
        <div style={{ textAlign:"center", marginBottom:64 }}>
          <Eyebrow>Who It's For</Eyebrow>
          <H2 center>Built For Businesses<br />That Depend On Leads.</H2>
          <p style={{ fontSize:16, color:"rgba(148,163,184,.5)", maxWidth:560, margin:"0 auto" }}>
            If customers call, submit forms, request quotes, schedule appointments, or send messages, LeadEngine helps you track every opportunity from first contact to closed deal.
          </p>
        </div>
        <div className="ld-uc">
          {UCDATA.map(uc => (
            <div key={uc.label} className="ch" style={{ background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.08)", borderRadius:16, padding:"28px 24px" }}>
              <div style={{ width:44, height:44, borderRadius:12, background:`${uc.color}1e`, border:`1px solid ${uc.color}44`, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:16 }}>
                <uc.icon size={20} color={uc.color} />
              </div>
              <div style={{ fontSize:15, fontWeight:700, color:"white", marginBottom:8, letterSpacing:"-0.01em" }}>{uc.label}</div>
              <div style={{ fontSize:12, color:"rgba(148,163,184,.46)", lineHeight:1.68 }}>{uc.detail}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────
   Modules
───────────────────────────────────────────────────────── */
function Modules() {
  return (
    <section className="ld-sec" style={{ ...SEC_PAD, background:"#0B1220", position:"relative", overflow:"hidden" }}>
      <Blob s={{ width:600, height:600, bottom:-200, right:-150, background:"radial-gradient(circle, rgba(37,99,235,.08) 0%, transparent 64%)" }} />
      <div style={{ ...INNER_SM, textAlign:"center", position:"relative", zIndex:1 }}>
        <Eyebrow>Product</Eyebrow>
        <H2 center>Everything You Need<br />To Manage Growth.</H2>
        <p style={{ fontSize:16, color:"rgba(148,163,184,.48)", maxWidth:460, margin:"0 auto 52px" }}>
          One platform. Every feature your business needs to capture, track, and convert more leads.
        </p>
        <div style={{ display:"flex", flexWrap:"wrap", gap:14, justifyContent:"center" }}>
          {MODULES.map(m => (
            <div key={m.label} style={{ background:m.soon?"rgba(255,255,255,.025)":"rgba(37,99,235,.1)", border:`1px solid ${m.soon?"rgba(255,255,255,.08)":"rgba(37,99,235,.3)"}`, borderRadius:99, padding:"13px 26px", display:"flex", alignItems:"center", gap:10 }}>
              <span style={{ fontSize:15, fontWeight:600, color:m.soon?"rgba(148,163,184,.3)":"#93c5fd" }}>{m.label}</span>
              {m.soon && <span style={{ fontSize:9, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.12em", color:"rgba(148,163,184,.3)", background:"rgba(255,255,255,.05)", borderRadius:99, padding:"2px 8px" }}>Soon</span>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────
   CTA
───────────────────────────────────────────────────────── */
function CTA() {
  return (
    <section className="ld-sec" style={{ ...SEC_PAD_L, background:"#060c1a", position:"relative", overflow:"hidden" }}>
      <Blob s={{ width:1000, height:1000, top:"50%", left:"50%", transform:"translate(-50%,-50%)", background:"radial-gradient(circle, rgba(37,99,235,.15) 0%, transparent 57%)" }} />
      <Dots />
      <div style={{ maxWidth:860, margin:"0 auto", padding:"0 48px", position:"relative", zIndex:1 }}>
        <div style={{ background:"rgba(255,255,255,.03)", border:"1px solid rgba(37,99,235,.24)", borderRadius:28, padding:"72px 60px", textAlign:"center", boxShadow:"0 0 120px rgba(37,99,235,.12), inset 0 1px 0 rgba(255,255,255,.06)", backdropFilter:"blur(12px)" }}>
          <Eyebrow>Get Started</Eyebrow>
          <h2 style={{ fontSize:"clamp(2rem, 3.4vw, 3rem)", fontWeight:900, color:"white", lineHeight:1.1, letterSpacing:"-0.03em", marginBottom:20 }}>
            Know Exactly Where<br />Every Lead Stands.
          </h2>
          <p style={{ fontSize:17, color:"rgba(148,163,184,.58)", lineHeight:1.88, maxWidth:520, margin:"0 auto 48px" }}>
            Track opportunities, manage follow-ups, and grow revenue from one platform built for local businesses.
          </p>
          <div style={{ display:"flex", alignItems:"center", gap:16, justifyContent:"center", flexWrap:"wrap" }}>
            <a href={DEMO_CTA} className="btn-blue" style={{ padding:"18px 48px", borderRadius:13, fontSize:16, fontWeight:700, color:"white", background:"#2563EB", textDecoration:"none", display:"inline-flex", alignItems:"center", gap:9, boxShadow:"0 0 60px rgba(37,99,235,.5)" }}>
              Book a Demo <ArrowRight size={18} />
            </a>
            <a href="/login" className="btn-ghost-ld" style={{ padding:"18px 36px", borderRadius:13, fontSize:16, fontWeight:600, color:"rgba(148,163,184,.8)", border:"1px solid rgba(255,255,255,.12)", textDecoration:"none", background:"rgba(255,255,255,.04)", display:"inline-block" }}>
              Sign In
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────
   Footer
───────────────────────────────────────────────────────── */
function Footer() {
  return (
    <footer style={{ background:"#03080f", borderTop:"1px solid rgba(255,255,255,.06)", padding:"56px 48px" }}>
      <div style={{ ...INNER, display:"flex", alignItems:"center", justifyContent:"space-between", gap:32, flexWrap:"wrap" }}>
        <div>
          <LEWordmark compact dark />
          <p style={{ marginTop:10, fontSize:12, color:"rgba(148,163,184,.28)" }}>Local Business Growth Platform</p>
        </div>
        <div style={{ display:"flex", gap:36, flexWrap:"wrap", alignItems:"center" }}>
          {[{ label:"Sign In", href:"/login" },{ label:"Book a Demo", href:DEMO_CTA },{ label:"Novenworks", href:"https://www.novenworks.com" }].map(lk => (
            <a key={lk.label} href={lk.href} target={lk.href.startsWith("http")?"_blank":undefined} rel="noopener noreferrer" className="nav-link" style={{ fontSize:13, color:"rgba(148,163,184,.38)", textDecoration:"none" }}>
              {lk.label}
            </a>
          ))}
        </div>
      </div>
      <div style={{ ...INNER, marginTop:40, paddingTop:24, borderTop:"1px solid rgba(255,255,255,.05)", fontSize:11, color:"rgba(148,163,184,.22)", textAlign:"center" }}>
        © {new Date().getFullYear()} Novenworks · All rights reserved.
      </div>
    </footer>
  );
}

/* ─────────────────────────────────────────────────────────
   Page
───────────────────────────────────────────────────────── */
export default function Landing() {
  const { data: user } = useGetMe();
  return (
    <>
      <style>{CSS}</style>
      <div style={{ background:"#0B1220", minHeight:"100vh" }}>
        <Nav isLoggedIn={!!user} />
        <Hero isLoggedIn={!!user} />
        <Problem />
        <Solution />
        <HowItWorks />
        <Revenue />
        <UseCases />
        <Modules />
        <CTA />
        <Footer />
      </div>
    </>
  );
}
