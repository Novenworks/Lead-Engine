import { useForm } from "react-hook-form";
import { useLocation } from "wouter";
import { useLogin, getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogoIconBadge } from "@/components/Logo";

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
      style={{ background: "linear-gradient(135deg, #060d1a 0%, #0f172a 55%, #0d1f3c 100%)" }}
    >
      <div className="w-full max-w-[440px] space-y-6">

        {/* Logo + wordmark */}
        <div className="text-center flex flex-col items-center gap-4">
          <LogoIconBadge size={64} />
          <div>
            <h1 className="text-[2rem] font-bold tracking-tight text-white leading-none">LeadEngine</h1>
            <p className="text-xs font-semibold tracking-[0.24em] uppercase text-blue-400 mt-2">by Novenworks</p>
          </div>
          <p className="text-slate-400 text-sm max-w-xs leading-relaxed">
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
                className="w-full h-11 mt-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-sm"
                disabled={login.isPending}
              >
                {login.isPending ? "Signing in…" : "Sign In →"}
              </Button>
            </form>
          </div>
        </div>

        {/* Demo account */}
        <div className="rounded-xl border border-white/10 bg-white/[0.06] backdrop-blur-sm p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Demo Account</p>
              <p className="text-sm font-medium text-white">{DEMO.email}</p>
              <p className="text-xs text-slate-400 mt-0.5 font-mono">password123</p>
            </div>
            <button
              type="button"
              onClick={fillDemo}
              className="shrink-0 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors whitespace-nowrap shadow-sm"
            >
              Use Demo Account
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
