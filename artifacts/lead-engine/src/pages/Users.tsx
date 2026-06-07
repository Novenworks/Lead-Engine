import { useState } from "react";
import {
  useListUsers,
  useCreateUser,
  useListClients,
  getListUsersQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UserCog, Plus, Shield, Building2 } from "lucide-react";
import { format } from "date-fns";

const glass = {
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.07)",
};

const EMPTY_FORM = {
  name: "",
  email: "",
  password: "",
  role: "owner" as "admin" | "owner",
  clientId: "",
};

export default function Users() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: users, isLoading } = useListUsers();
  const { data: clients } = useListClients();
  const createUser = useCreateUser();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createUser.mutate(
      {
        data: {
          name: form.name,
          email: form.email,
          password: form.password,
          role: form.role,
          clientId: form.clientId ? Number(form.clientId) : null,
        },
      },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListUsersQueryKey() });
          toast({ title: "User created successfully" });
          setOpen(false);
          setForm(EMPTY_FORM);
        },
        onError: (err: unknown) => {
          const msg =
            err instanceof Error ? err.message : "Failed to create user";
          toast({ title: "Error", description: msg, variant: "destructive" });
        },
      },
    );
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <UserCog className="h-4 w-4 text-blue-500" />
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Users
            </h1>
          </div>
          <p className="text-sm text-slate-500">
            Manage admin and owner accounts ·{" "}
            <span className="text-slate-600">
              {isLoading ? "Loading…" : `${users?.length ?? 0} users`}
            </span>
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <button
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white transition-opacity hover:opacity-85"
              style={{ background: "#2563EB" }}
            >
              <Plus className="h-4 w-4" /> Add User
            </button>
          </DialogTrigger>
          <DialogContent
            className="sm:max-w-md"
            style={{
              background: "#0d1628",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <DialogHeader>
              <DialogTitle className="text-white">Add User</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Full Name
                </Label>
                <Input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Jane Smith"
                  className="bg-white/[0.04] border-white/10 text-slate-200 placeholder:text-slate-600"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Email
                </Label>
                <Input
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="jane@example.com"
                  className="bg-white/[0.04] border-white/10 text-slate-200 placeholder:text-slate-600"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Password
                </Label>
                <Input
                  required
                  type="password"
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                  placeholder="Min 8 characters"
                  className="bg-white/[0.04] border-white/10 text-slate-200 placeholder:text-slate-600"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Role
                </Label>
                <Select
                  value={form.role}
                  onValueChange={(v) =>
                    setForm({
                      ...form,
                      role: v as "admin" | "owner",
                      clientId: "",
                    })
                  }
                >
                  <SelectTrigger className="bg-white/[0.04] border-white/10 text-slate-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-white/10 text-slate-200">
                    <SelectItem value="owner">
                      Owner — single workspace
                    </SelectItem>
                    <SelectItem value="admin">
                      Admin — all workspaces
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.role === "owner" && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Workspace <span className="text-red-400">*</span>
                  </Label>
                  <Select
                    value={form.clientId}
                    onValueChange={(v) => setForm({ ...form, clientId: v })}
                  >
                    <SelectTrigger className="bg-white/[0.04] border-white/10 text-slate-300">
                      <SelectValue placeholder="Select workspace…" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-white/10 text-slate-200">
                      {(clients ?? []).map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.businessName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    createUser.isPending ||
                    (form.role === "owner" && !form.clientId)
                  }
                  className="px-4 py-2 rounded-xl text-sm font-bold text-white transition-opacity hover:opacity-85 disabled:opacity-40"
                  style={{ background: "#2563EB" }}
                >
                  {createUser.isPending ? "Creating…" : "Create User"}
                </button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={glass}>
        <Table>
          <TableHeader>
            <TableRow
              style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
            >
              <TableHead className="pl-5 text-slate-600 font-semibold text-[11px] uppercase tracking-wider bg-transparent">
                Name
              </TableHead>
              <TableHead className="text-slate-600 font-semibold text-[11px] uppercase tracking-wider bg-transparent">
                Email
              </TableHead>
              <TableHead className="text-slate-600 font-semibold text-[11px] uppercase tracking-wider bg-transparent">
                Role
              </TableHead>
              <TableHead className="text-slate-600 font-semibold text-[11px] uppercase tracking-wider bg-transparent">
                Workspace
              </TableHead>
              <TableHead className="pr-5 text-right text-slate-600 font-semibold text-[11px] uppercase tracking-wider bg-transparent">
                Created
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center py-12 text-slate-600 bg-transparent"
                >
                  Loading users…
                </TableCell>
              </TableRow>
            ) : users && users.length > 0 ? (
              users.map((user) => (
                <TableRow
                  key={user.id}
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                  className="hover:bg-white/[0.02] transition-colors"
                >
                  <TableCell className="pl-5 py-3.5 font-semibold text-slate-100 bg-transparent">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-blue-300 shrink-0"
                        style={{
                          background: "rgba(37,99,235,0.2)",
                          border: "1px solid rgba(37,99,235,0.3)",
                        }}
                      >
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      {user.name}
                    </div>
                  </TableCell>
                  <TableCell className="py-3.5 text-sm text-slate-400 bg-transparent">
                    {user.email}
                  </TableCell>
                  <TableCell className="py-3.5 bg-transparent">
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold"
                      style={
                        user.role === "admin"
                          ? {
                              background: "rgba(37,99,235,0.15)",
                              color: "#60a5fa",
                              border: "1px solid rgba(37,99,235,0.3)",
                            }
                          : {
                              background: "rgba(168,85,247,0.15)",
                              color: "#c084fc",
                              border: "1px solid rgba(168,85,247,0.3)",
                            }
                      }
                    >
                      <Shield className="h-3 w-3" />
                      {user.role === "admin" ? "Admin" : "Owner"}
                    </span>
                  </TableCell>
                  <TableCell className="py-3.5 text-sm bg-transparent">
                    {user.clientName ? (
                      <span className="flex items-center gap-1.5 text-slate-400">
                        <Building2 className="h-3.5 w-3.5 text-slate-600" />
                        {user.clientName}
                      </span>
                    ) : (
                      <span className="text-slate-700">—</span>
                    )}
                  </TableCell>
                  <TableCell className="pr-5 py-3.5 text-right text-sm text-slate-600 bg-transparent">
                    {format(new Date(user.createdAt), "MMM d, yyyy")}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center py-12 text-slate-600 bg-transparent"
                >
                  No users found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
