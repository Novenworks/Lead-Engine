import { useForm } from "react-hook-form";
import { useLocation } from "wouter";
import { useLogin, getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield } from "lucide-react";

export default function Login() {
  const [, setLocation] = useLocation();
  const login = useLogin();
  const queryClient = useQueryClient();
  const { register, handleSubmit, formState: { errors } } = useForm({
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

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center flex flex-col items-center">
          <div className="bg-slate-900 p-3 rounded-lg mb-4 shadow-sm">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">LeadEngine</h1>
          <p className="text-sm font-semibold tracking-widest uppercase text-slate-500 mt-2">by Novenworks</p>
        </div>

        <Card className="border-slate-200 shadow-xl rounded-xl overflow-hidden">
          <CardHeader className="bg-white pb-6 border-b border-slate-100">
            <CardTitle className="text-xl">Sign in to workspace</CardTitle>
            <CardDescription>Enter your credentials to access your leads.</CardDescription>
          </CardHeader>
          <CardContent className="bg-slate-50/50 pt-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  {...register("email", { required: "Email is required" })} 
                  className="bg-white"
                />
                {errors.email && <span className="text-xs text-red-500">{errors.email.message as string}</span>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input 
                  id="password" 
                  type="password" 
                  {...register("password", { required: "Password is required" })} 
                  className="bg-white"
                />
                {errors.password && <span className="text-xs text-red-500">{errors.password.message as string}</span>}
              </div>
              <Button type="submit" className="w-full mt-4" disabled={login.isPending}>
                {login.isPending ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
