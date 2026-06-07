import { useForm } from "react-hook-form";
import { useLocation } from "wouter";
import { useLogin, getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogoIconBadge } from "@/components/Logo";

const DEMO_OWNER = { email: "owner@kaylasautorepair.com", password: "password123" };
const DEMO_ADMIN = { email: "admin@novenworks.com", password: "password123" };

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

  const fillDemo = (account: typeof DEMO_OWNER) => {
    setValue("email", account.email);
    setValue("password", account.password);
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "linear-gradient(135deg, #060d1a 0%, #0f172a 50%, #0d1f3c 100%)" }}
    >
      <div className="w-full max-w-md space-y-6">

        {/* Logo + wordmark */}
        <div className="text-center flex flex-col items-center gap-4">
          <LogoIconBadge size={56} />
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">LeadEngine</h1>
            <p className="text-xs font-semibold tracking-[0.22em] uppercase text-blue-400 mt-1.5">by Novenworks</p>
          </div>
          <p className="text-slate-400 text-sm max-w-xs leading-relaxed">
            Capture leads. Track conversations. Close more business.
          </p>
        </div>

        {/* Login card */}
        <div className="bg-white/95 backdrop-blur rounded-2xl shadow-2xl shadow-black/40 overflow-hidden">
          <div className="px-8 pt-7 pb-2">
            <h2 className="text-lg font-semibold text-slate-900">Sign in to workspace</h2>
            <p className="text-sm text-slate-500 mt-0.5">Enter your credentials to access your leads.</p>
          </div>
          <div className="px-8 pb-7 pt-4">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm font-medium text-slate-700">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  {...register("email", { required: "Email is required" })}
                  className="h-10 bg-slate-50 border-slate-200 focus:border-blue-500 focus:ring-blue-500"
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
                  className="h-10 bg-slate-50 border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                />
                {errors.password && <span className="text-xs text-red-500">{errors.password.message as string}</span>}
              </div>
              {login.isError && (
                <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg border border-red-100">
                  Invalid email or password. Please try again.
                </p>
              )}
              <Button
                type="submit"
                className="w-full h-10 mt-2 bg-blue-600 hover:bg-blue-700 text-white font-medium"
                disabled={login.isPending}
              >
                {login.isPending ? "Signing in…" : "Sign In"}
              </Button>
            </form>
          </div>
        </div>

        {/* Demo accounts */}
        <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur p-4 space-y-3">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Demo Accounts</p>
          <button
            type="button"
            onClick={() => fillDemo(DEMO_OWNER)}
            className="w-full text-left flex items-center justify-between p-3 rounded-lg bg-white/8 hover:bg-white/15 border border-white/10 hover:border-blue-400/40 transition-all group"
          >
            <div>
              <p className="text-sm font-medium text-white">Kayla's Auto Repair — Owner</p>
              <p className="text-xs text-slate-400 mt-0.5">{DEMO_OWNER.email}</p>
            </div>
            <span className="text-xs text-blue-400 font-medium group-hover:text-blue-300 transition-colors shrink-0 ml-3">
              Use →
            </span>
          </button>
          <button
            type="button"
            onClick={() => fillDemo(DEMO_ADMIN)}
            className="w-full text-left flex items-center justify-between p-3 rounded-lg bg-white/8 hover:bg-white/15 border border-white/10 hover:border-blue-400/40 transition-all group"
          >
            <div>
              <p className="text-sm font-medium text-white">Novenworks Admin</p>
              <p className="text-xs text-slate-400 mt-0.5">{DEMO_ADMIN.email}</p>
            </div>
            <span className="text-xs text-blue-400 font-medium group-hover:text-blue-300 transition-colors shrink-0 ml-3">
              Use →
            </span>
          </button>
          <p className="text-center text-xs text-slate-500">All demo passwords: <span className="font-mono text-slate-400">password123</span></p>
        </div>

      </div>
    </div>
  );
}
