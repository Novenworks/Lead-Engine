import { useForm } from "react-hook-form";
import { useLocation } from "wouter";
import { useLogin, getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LEMark, LEMarkBadge } from "@/components/Logo";
import { TrendingUp, Users, AlertCircle, DollarSign } from "lucide-react";

const DEMO = { email: "demo@novenworks.com", password: "password123" };

const PREVIEW_METRICS = [
  { label: "Total Leads", value: "147", icon: Users, color: "#60a5fa", bg: "rgba(37,99,235,0.18)", delay: "0ms" },
  { label: "Pipeline Value", value: "$89.4k", icon: TrendingUp, color: "#34d399", bg: "rgba(16,185,129,0.15)", delay: "100ms" },
  { label: "Follow-Ups Due", value: "12", icon: AlertCircle, color: "#fbbf24", bg: "rgba(245,158,11,0.15)", delay: "200ms" },
  { label: "Revenue Won", value: "$32.1k", icon: DollarSign, color: "#4ade80", bg: "rgba(34,197,94,0.15)", delay: "300ms" },
];

export default function Login() {
  const [, setLocation] = useLocation();
  const login = useLogin();
  const queryClient = useQueryClient();
  const { register, handleSubmit, setValue, formState: { errors } } = useForm({
    defaultValues: { email: "", password: "" }
  });

  const onSubmit = (data: any) => {
    login.mutate({ data }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
        setLocation("/dashboard");
      }
    });
  };

  const fillDemo = () => {
    setValue("email", DEMO.email);
    setValue("password", DEMO.password);
  };

  return (
    <div className="w-full min-h-screen flex" style={{ background: "#0B1220" }}>

      {/* ── LEFT PANEL ── branding + animated metric preview */}
      <div
        className="hidden md:flex md:w-[55%] lg:w-[58%] flex-col justify-between p-10 lg:p-14 relative overflow-hidden"
        style={{
          background: "linear-gradient(145deg, #060d1a 0%, #0B1220 50%, #091628 100%)",
          borderRight: "1px solid rgba(255,255,255,0.06)"
        }}
      >
        {/* Subtle dot-grid overlay */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          backgroundImage: "radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)",
          backgroundSize: "28px 28px", opacity: 0.6
        }} />
        {/* Blue glow blob */}
        <div style={{
          position: "absolute", width: 520, height: 520, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(37,99,235,0.10) 0%, transparent 65%)",
          top: -160, left: -160, pointerEvents: "none"
        }} />
        {/* Bottom glow */}
        <div style={{
          position: "absolute", width: 380, height: 380, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(16,185,129,0.06) 0%, transparent 70%)",
          bottom: -80, right: -80, pointerEvents: "none"
        }} />

        {/* Logo lockup */}
        <div className="flex items-center gap-3 relative z-10">
          <LEMarkBadge size={36} />
          <div className="leading-none">
            <span className="font-bold text-[17px] tracking-tight text-white">
              Lead<span style={{ color: "#2563EB" }}>Engine</span>
            </span>
            <p className="text-[9px] font-semibold tracking-[0.22em] uppercase mt-0.5" style={{ color: "rgba(147,197,253,0.45)" }}>
              by Novenworks
            </p>
          </div>
        </div>

        {/* Hero copy + preview cards */}
        <div className="relative z-10 space-y-10">
          <div className="space-y-5">
            <p className="text-xs font-semibold tracking-[0.18em] uppercase" style={{ color: "#2563EB" }}>
              Local Business Growth Platform
            </p>
            <h1 className="text-4xl lg:text-[2.75rem] font-bold text-white leading-[1.15] tracking-tight">
              Capture leads.<br />
              Track follow-ups.<br />
              <span style={{ color: "#2563EB" }}>Grow revenue.</span>
            </h1>
            <p className="text-[15px] leading-relaxed" style={{ color: "rgba(148,163,184,0.7)" }}>
              One dashboard for every local business you manage.<br />
              Built for the agencies and owners who drive growth.
            </p>
          </div>

          {/* Animated metric preview cards */}
          <div className="grid grid-cols-2 gap-3">
            {PREVIEW_METRICS.map((m) => (
              <div
                key={m.label}
                className="rounded-xl p-4 animate-in fade-in slide-in-from-bottom-4 duration-500"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  backdropFilter: "blur(8px)",
                  animationDelay: m.delay,
                  animationFillMode: "both",
                }}
              >
                <div className="flex items-center gap-2 mb-2.5">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: m.bg }}>
                    <m.icon size={14} color={m.color} />
                  </div>
                  <span className="text-xs font-medium" style={{ color: "rgba(148,163,184,0.75)" }}>{m.label}</span>
                </div>
                <div className="text-[1.6rem] font-bold text-white tracking-tight leading-none">{m.value}</div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs relative z-10" style={{ color: "rgba(148,163,184,0.3)" }}>
          © 2025 Novenworks · All rights reserved.
        </p>
      </div>

      {/* ── RIGHT PANEL ── login form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10">

        {/* Mobile-only logo */}
        <div className="md:hidden flex flex-col items-center gap-3 mb-8">
          <LEMarkBadge size={56} />
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Lead<span style={{ color: "#2563EB" }}>Engine</span>
            </h1>
            <p className="text-[10px] font-semibold tracking-[0.22em] uppercase mt-1.5" style={{ color: "rgba(147,197,253,0.5)" }}>
              by Novenworks
            </p>
          </div>
        </div>

        <div className="w-full max-w-[400px] space-y-5">

          <div>
            <h2 className="text-[1.5rem] font-bold text-white tracking-tight">Sign in</h2>
            <p className="text-sm mt-1" style={{ color: "rgba(148,163,184,0.65)" }}>
              Access your LeadEngine workspace
            </p>
          </div>

          {/* Glass form card */}
          <div
            className="rounded-2xl p-6 space-y-4"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.09)",
              backdropFilter: "blur(12px)"
            }}
          >
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "rgba(148,163,184,0.65)" }}>
                  Email address
                </Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  {...register("email", { required: "Email is required" })}
                  placeholder="you@company.com"
                  className="h-11 text-sm text-white placeholder:text-slate-600 border-white/10 focus:border-blue-500 focus-visible:ring-blue-500/30"
                  style={{ background: "rgba(255,255,255,0.06)" }}
                />
                {errors.email && <span className="text-xs text-red-400">{errors.email.message as string}</span>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "rgba(148,163,184,0.65)" }}>
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  {...register("password", { required: "Password is required" })}
                  className="h-11 text-sm text-white border-white/10 focus:border-blue-500 focus-visible:ring-blue-500/30"
                  style={{ background: "rgba(255,255,255,0.06)" }}
                />
                {errors.password && <span className="text-xs text-red-400">{errors.password.message as string}</span>}
              </div>
              {login.isError && (
                <div
                  className="rounded-lg px-3 py-2.5 text-xs text-red-400"
                  style={{ background: "rgba(239,68,68,0.09)", border: "1px solid rgba(239,68,68,0.2)" }}
                >
                  Invalid email or password. Please try again.
                </div>
              )}
              <Button
                type="submit"
                className="w-full h-11 font-semibold text-sm text-white hover:opacity-90 transition-opacity"
                style={{ background: "#2563EB" }}
                disabled={login.isPending}
              >
                {login.isPending ? "Signing in…" : "Sign In →"}
              </Button>
            </form>
          </div>

          {/* Demo account */}
          <div
            className="rounded-xl p-4"
            style={{
              background: "rgba(37,99,235,0.07)",
              border: "1px solid rgba(37,99,235,0.22)"
            }}
          >
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <LEMark size={14} />
                  <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "rgba(147,197,253,0.55)" }}>
                    Demo Account
                  </span>
                </div>
                <p className="text-sm font-medium text-white truncate">{DEMO.email}</p>
                <p className="text-xs font-mono mt-0.5" style={{ color: "rgba(148,163,184,0.5)" }}>password123</p>
              </div>
              <button
                type="button"
                onClick={fillDemo}
                className="shrink-0 px-4 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap"
                style={{ background: "rgba(37,99,235,0.22)", color: "#93c5fd", border: "1px solid rgba(37,99,235,0.35)" }}
                onMouseEnter={e => { (e.target as HTMLElement).style.background = "rgba(37,99,235,0.38)"; }}
                onMouseLeave={e => { (e.target as HTMLElement).style.background = "rgba(37,99,235,0.22)"; }}
              >
                Use Demo Account
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
