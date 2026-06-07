import { useGetMe } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { User, Mail, Shield, Building2 } from "lucide-react";

export default function Settings() {
  const { data: user } = useGetMe();

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Your account details and preferences.</p>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-lg">{user?.name ?? "..."}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge variant={user?.role === "admin" ? "default" : "secondary"} className="text-xs capitalize">
                  <Shield className="h-3 w-3 mr-1" />
                  {user?.role}
                </Badge>
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="font-medium">{user?.email ?? "—"}</p>
              </div>
            </div>
            {user?.clientName && (
              <div className="flex items-center gap-3 text-sm">
                <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Business</p>
                  <p className="font-medium">{user.clientName}</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Demo Credentials</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-1">
          <p>Password for all demo accounts: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-800 font-mono text-xs">password123</code></p>
          <p className="text-xs">admin@novenworks.com · owner@citrus-sage.com · owner@yardsanity.com</p>
        </CardContent>
      </Card>
    </div>
  );
}
