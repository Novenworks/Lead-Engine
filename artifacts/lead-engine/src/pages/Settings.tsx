import { useState } from "react";
import { useGetMe, useChangePassword } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Mail, Shield, Building2, Lock, Eye, EyeOff } from "lucide-react";

const glass = {
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.07)",
};

const sectionLabel =
  "text-[10px] font-bold uppercase tracking-widest text-slate-600 mb-3 block";

export default function Settings() {
  const { data: user } = useGetMe();
  const { toast } = useToast();
  const changePassword = useChangePassword();

  const [pwForm, setPwForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      toast({
        title: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }
    if (pwForm.newPassword.length < 8) {
      toast({
        title: "Password too short",
        description: "New password must be at least 8 characters.",
        variant: "destructive",
      });
      return;
    }
    changePassword.mutate(
      {
        data: {
          currentPassword: pwForm.currentPassword,
          newPassword: pwForm.newPassword,
        },
      },
      {
        onSuccess: () => {
          toast({ title: "Password changed successfully" });
          setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
        },
        onError: (err: unknown) => {
          const msg =
            err instanceof Error ? err.message : "Failed to change password";
          toast({ title: "Error", description: msg, variant: "destructive" });
        },
      },
    );
  };

  const initials = user?.name?.charAt(0)?.toUpperCase() ?? "?";

  return (
    <div className="space-y-5 max-w-lg animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Settings</h1>
        <p className="text-sm text-slate-500 mt-0.5">Your account details and security.</p>
      </div>

      {/* Profile */}
      <div className="rounded-xl p-5" style={glass}>
        <span className={sectionLabel}>Profile</span>
        <div className="flex items-center gap-4 mb-4">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-blue-300 shrink-0"
            style={{ background: "rgba(37,99,235,0.2)", border: "1px solid rgba(37,99,235,0.3)" }}
          >
            {initials}
          </div>
          <div>
            <p className="font-semibold text-white text-lg">{user?.name ?? "…"}</p>
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold mt-0.5"
              style={
                user?.role === "admin"
                  ? { background: "rgba(37,99,235,0.15)", color: "#60a5fa", border: "1px solid rgba(37,99,235,0.3)" }
                  : { background: "rgba(168,85,247,0.15)", color: "#c084fc", border: "1px solid rgba(168,85,247,0.3)" }
              }
            >
              <Shield className="h-3 w-3" />
              {user?.role === "admin" ? "Admin" : "Owner"}
            </span>
          </div>
        </div>

        <div
          className="space-y-3 pt-4"
          style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div className="flex items-center gap-3">
            <User className="h-4 w-4 text-slate-600 shrink-0" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Name</p>
              <p className="text-sm text-slate-300">{user?.name ?? "—"}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Mail className="h-4 w-4 text-slate-600 shrink-0" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Email</p>
              <p className="text-sm text-slate-300">{user?.email ?? "—"}</p>
            </div>
          </div>
          {user?.clientName && (
            <div className="flex items-center gap-3">
              <Building2 className="h-4 w-4 text-slate-600 shrink-0" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Workspace</p>
                <p className="text-sm text-slate-300">{user.clientName}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Change Password */}
      <div className="rounded-xl p-5" style={glass}>
        <span className={sectionLabel}>
          <Lock className="h-3 w-3 inline mr-1.5" />
          Change Password
        </span>
        <form onSubmit={handlePasswordChange} className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Current Password
            </Label>
            <div className="relative">
              <Input
                required
                type={showCurrent ? "text" : "password"}
                value={pwForm.currentPassword}
                onChange={(e) =>
                  setPwForm({ ...pwForm, currentPassword: e.target.value })
                }
                placeholder="Your current password"
                className="pr-9 bg-white/[0.04] border-white/10 text-slate-200 placeholder:text-slate-600 focus-visible:border-blue-500/50"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400"
              >
                {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              New Password
            </Label>
            <div className="relative">
              <Input
                required
                type={showNew ? "text" : "password"}
                value={pwForm.newPassword}
                onChange={(e) =>
                  setPwForm({ ...pwForm, newPassword: e.target.value })
                }
                placeholder="Min 8 characters"
                className="pr-9 bg-white/[0.04] border-white/10 text-slate-200 placeholder:text-slate-600 focus-visible:border-blue-500/50"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400"
              >
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Confirm New Password
            </Label>
            <Input
              required
              type="password"
              value={pwForm.confirmPassword}
              onChange={(e) =>
                setPwForm({ ...pwForm, confirmPassword: e.target.value })
              }
              placeholder="Repeat new password"
              className="bg-white/[0.04] border-white/10 text-slate-200 placeholder:text-slate-600 focus-visible:border-blue-500/50"
            />
          </div>
          <div className="pt-1">
            <button
              type="submit"
              disabled={
                changePassword.isPending ||
                !pwForm.currentPassword ||
                !pwForm.newPassword ||
                !pwForm.confirmPassword
              }
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white transition-opacity hover:opacity-85 disabled:opacity-40"
              style={{ background: "#2563EB" }}
            >
              <Lock className="h-3.5 w-3.5" />
              {changePassword.isPending ? "Saving…" : "Update Password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
