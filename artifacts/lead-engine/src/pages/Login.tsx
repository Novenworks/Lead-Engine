import { useForm } from "react-hook-form";
import { useLocation } from "wouter";
import { useLogin, getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LEMark, LEMarkBadge } from "@/components/Logo";

const DEMO = { email: "demo@novenworks.com", password: "password123" };

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
    <div
      className="w-full min-h-screen flex items-center justify-center p-4"
      style={{ background: "linear-gradient(135deg, #060d1a 0%, #0B1220 55%, #0d1f3c 100%)" }}
    >
      <div className="w-full max-w-[440px] space-y-6">

        {/* Logo mark + wordmark */}
        <div className="text-center flex flex-col items-center gap-4">
          <LEMarkBadge size={72} />
          <div>
            <h1 className="text-[2rem] font-bold tracking-tight leading-none">
              <span className="text-white">Lead</span>
              <span style={{ color: "#2563EB" }}>Engine</span>
            </h1>
            <p className="text-xs font-semibold tracking-[0.26em] uppercase mt-2" style={{ color: "rgba(147,197,253,0.7)" }}>
              by Novenworks
            </p>
          </div>
          <p className="text-sm max-w-xs leading-relaxed" style={{ color: "rgba(148,163,184,0.85)" }}>
            Capture leads. Track conversations. Close more business.
          </p>
        </div>

        {/* Login card */}
        <div className="bg-white rounded-2xl shadow-2xl shadow-black/50 overflow-hidden">
          <div className="px-8 pt-7 pb-2">
            <h2 className="text-lg font-semibold text-slate-900">Sign in to your workspace</h2>
            <p className="text-sm text-slate-500 mt-0.5">Enter your credentials to access your leads.</p>
          </div>
          <div className="px-8 pb-8 pt-5">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm font-medium text-slate-700">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  {...register("email", { required: "Email is required" })}
                  className="h-11 bg-slate-50 border-slate-200 focus:border-blue-500 focus:ring-blue-500 text-slate-900 placeholder:text-slate-400"
                  placeholder="you@company.com"
                />
                {errors.email && <span className="text-xs text-red-500">{errors.email.message as string}</span>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-sm font-medium text-slate-700">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  {...register("password", { required: "Password is required" })}
                  className="h-11 bg-slate-50 border-slate-200 focus:border-blue-500 focus:ring-blue-500 text-slate-900"
                />
                {errors.password && <span className="text-xs text-red-500">{errors.password.message as string}</span>}
              </div>
              {login.isError && (
                <p className="text-xs text-red-600 bg-red-50 px-3 py-2.5 rounded-lg border border-red-100">
                  Invalid email or password. Please try again.
                </p>
              )}
              <Button
                type="submit"
                className="w-full h-11 mt-1 font-semibold text-sm shadow-sm"
                style={{ background: "#2563EB" }}
                disabled={login.isPending}
              >
                {login.isPending ? "Signing in…" : "Sign In →"}
              </Button>
            </form>
          </div>
        </div>

        {/* Demo account */}
        <div className="rounded-xl border p-5" style={{ borderColor: "rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)" }}>
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <LEMark size={16} />
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "rgba(148,163,184,0.7)" }}>
                  Demo Account
                </p>
              </div>
              <p className="text-sm font-medium text-white">{DEMO.email}</p>
              <p className="text-xs font-mono mt-0.5" style={{ color: "rgba(148,163,184,0.7)" }}>password123</p>
            </div>
            <button
              type="button"
              onClick={fillDemo}
              className="shrink-0 px-4 py-2 rounded-lg text-white text-xs font-semibold transition-colors whitespace-nowrap shadow-sm hover:opacity-90"
              style={{ background: "#2563EB" }}
            >
              Use Demo Account
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
