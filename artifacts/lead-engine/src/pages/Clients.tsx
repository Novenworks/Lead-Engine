import { useState } from "react";
import { useListClients, useCreateClient, useUpdateClient, getListClientsQueryKey, getGetClientQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Copy, Plus, Check, Power, Globe, Mail, ChevronRight, Building2 } from "lucide-react";

const glass = {
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.07)",
};

export default function Clients() {
  const { data: clients, isLoading } = useListClients();
  const createClient = useCreateClient();
  const updateClient = useUpdateClient();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const form = useForm({
    defaultValues: {
      businessName: "",
      slug: "",
      ownerEmail: "",
      notificationEmail: "",
      websiteUrl: "",
      industry: "",
    },
  });

  const onSubmit = (data: any) => {
    createClient.mutate({ data }, {
      onSuccess: () => {
        toast({ title: "Workspace created successfully" });
        queryClient.invalidateQueries({ queryKey: getListClientsQueryKey() });
        setIsDialogOpen(false);
        form.reset();
      },
      onError: (err) => {
        toast({ title: "Failed to create workspace", description: (err as any)?.error || "An error occurred", variant: "destructive" });
      },
    });
  };

  const toggleActive = (clientId: number, currentActive: boolean) => {
    updateClient.mutate({ id: clientId, data: { isActive: !currentActive } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListClientsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetClientQueryKey(clientId) });
        toast({ title: `Workspace ${currentActive ? "deactivated" : "activated"}` });
      },
    });
  };

  const copyApiKey = (apiKey: string, id: number) => {
    navigator.clipboard.writeText(apiKey);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast({ title: "API Key copied", duration: 2000 });
  };

  const activeClients = clients?.filter((c) => c.isActive) ?? [];
  const inactiveClients = clients?.filter((c) => !c.isActive) ?? [];

  return (
    <div className="space-y-6 max-w-5xl animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex justify-between items-start gap-4">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <Building2 className="h-4 w-4 text-blue-500" />
            <h1 className="text-2xl font-bold tracking-tight text-white">Workspaces</h1>
          </div>
          <p className="text-sm text-slate-500">
            Manage each business connected to LeadEngine ·{" "}
            <span className="text-slate-600">
              {isLoading ? "Loading…" : `${activeClients.length} active · ${inactiveClients.length} inactive`}
            </span>
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              size="sm"
              className="shrink-0 text-white text-xs font-semibold h-9 px-4"
              style={{ background: "#2563EB" }}
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Workspace
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-slate-900 border-white/10 text-white">
            <DialogHeader>
              <DialogTitle className="text-white">Add New Workspace</DialogTitle>
              <DialogDescription className="text-slate-500">
                Connect a new business to the LeadEngine platform.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 pt-2">
                <FormField control={form.control} name="businessName" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Business Name</FormLabel>
                    <FormControl>
                      <Input {...field} required className="bg-white/[0.06] border-white/10 text-white placeholder:text-slate-600 focus-visible:border-blue-500/50" />
                    </FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="slug" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Slug</FormLabel>
                    <FormControl>
                      <Input {...field} required pattern="^[a-z0-9-]+$" className="bg-white/[0.06] border-white/10 text-white placeholder:text-slate-600 focus-visible:border-blue-500/50 font-mono" />
                    </FormControl>
                  </FormItem>
                )} />
                <div className="grid grid-cols-2 gap-3">
                  <FormField control={form.control} name="ownerEmail" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Owner Email</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} required className="bg-white/[0.06] border-white/10 text-white focus-visible:border-blue-500/50" />
                      </FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="notificationEmail" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Notification Email</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} required className="bg-white/[0.06] border-white/10 text-white focus-visible:border-blue-500/50" />
                      </FormControl>
                    </FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <FormField control={form.control} name="websiteUrl" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Website URL</FormLabel>
                      <FormControl>
                        <Input type="url" {...field} className="bg-white/[0.06] border-white/10 text-white focus-visible:border-blue-500/50" />
                      </FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="industry" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Industry</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g. Landscaping" className="bg-white/[0.06] border-white/10 text-white placeholder:text-slate-600 focus-visible:border-blue-500/50" />
                      </FormControl>
                    </FormItem>
                  )} />
                </div>
                <div className="flex justify-end pt-2">
                  <Button
                    type="submit"
                    disabled={createClient.isPending}
                    size="sm"
                    className="text-white text-xs font-semibold h-9 px-5"
                    style={{ background: "#2563EB" }}
                  >
                    {createClient.isPending ? "Creating…" : "Create Workspace"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Active workspaces */}
      {isLoading ? (
        <div className="text-center py-16 text-slate-600">Loading workspaces...</div>
      ) : (
        <div className="space-y-8">
          <div className="space-y-3">
            {activeClients.map((client) => (
              <div
                key={client.id}
                className="rounded-xl transition-all hover:bg-white/[0.02]"
                style={glass}
              >
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2.5 mb-1.5">
                        <h3 className="font-semibold text-white text-base">{client.businessName}</h3>
                        <span
                          className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                          style={{ background: "rgba(34,197,94,0.15)", color: "#4ade80", border: "1px solid rgba(34,197,94,0.25)" }}
                        >
                          Active
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 mt-1">
                        {client.industry && (
                          <span className="font-medium text-slate-500">{client.industry}</span>
                        )}
                        <span className="font-mono text-slate-700">{client.slug}</span>
                        {client.websiteUrl && (
                          <a
                            href={client.websiteUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1 text-blue-500 hover:text-blue-400 transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Globe className="h-3 w-3" />
                            {client.websiteUrl.replace(/^https?:\/\//, "")}
                          </a>
                        )}
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {client.ownerEmail}
                        </span>
                      </div>
                    </div>

                    {/* API Key */}
                    <button
                      className="flex items-center gap-1.5 font-mono text-xs px-2.5 py-1.5 rounded-lg transition-colors shrink-0"
                      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)", color: "#64748b" }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.09)"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)"; }}
                      onClick={() => copyApiKey(client.apiKey, client.id)}
                      title="Copy API Key"
                    >
                      <span>{client.apiKey.substring(0, 10)}…</span>
                      {copiedId === client.id
                        ? <Check className="h-3 w-3 text-emerald-400" />
                        : <Copy className="h-3 w-3 text-slate-600" />}
                    </button>
                  </div>

                  {/* Actions footer */}
                  <div
                    className="flex items-center gap-2 mt-4 pt-3.5"
                    style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
                  >
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-slate-600 hover:text-slate-400 hover:bg-white/[0.05] gap-1.5"
                      onClick={() => toggleActive(client.id, client.isActive)}
                    >
                      <Power className="h-3 w-3" />
                      Deactivate
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-slate-400 hover:text-slate-200 hover:bg-white/[0.05] gap-1"
                      asChild
                    >
                      <Link href={`/clients/${client.id}`}>
                        Manage <ChevronRight className="h-3 w-3" />
                      </Link>
                    </Button>
                    <span className="ml-auto text-xs text-slate-700">
                      Since {format(new Date(client.createdAt), "MMM d, yyyy")}
                    </span>
                  </div>
                </div>
              </div>
            ))}

            {activeClients.length === 0 && !isLoading && (
              <div
                className="text-center py-16 text-slate-600 text-sm rounded-xl"
                style={{ border: "1px dashed rgba(255,255,255,0.09)" }}
              >
                No active workspaces. Add one above.
              </div>
            )}
          </div>

          {/* Inactive */}
          {inactiveClients.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-slate-700 uppercase tracking-widest mb-3 px-1">Inactive</p>
              <div className="space-y-2">
                {inactiveClients.map((client) => (
                  <div
                    key={client.id}
                    className="rounded-xl opacity-50 hover:opacity-70 transition-opacity"
                    style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}
                  >
                    <div className="p-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="min-w-0">
                          <span className="font-medium text-slate-400 text-sm">{client.businessName}</span>
                          {client.industry && <span className="text-xs text-slate-700 ml-2">{client.industry}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs border-white/10 text-slate-400 hover:text-white hover:bg-white/[0.06] gap-1.5"
                          onClick={() => toggleActive(client.id, client.isActive)}
                        >
                          <Power className="h-3 w-3" /> Activate
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-slate-500 hover:text-slate-300 hover:bg-white/[0.05]"
                          asChild
                        >
                          <Link href={`/clients/${client.id}`}>Manage</Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
