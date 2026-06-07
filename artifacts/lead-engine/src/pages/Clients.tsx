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
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Copy, Plus, Check, Power, Globe, Mail, ChevronRight } from "lucide-react";

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
        toast({ title: "Client created successfully" });
        queryClient.invalidateQueries({ queryKey: getListClientsQueryKey() });
        setIsDialogOpen(false);
        form.reset();
      },
      onError: (err) => {
        toast({ title: "Failed to create client", description: (err as any)?.error || "An error occurred", variant: "destructive" });
      },
    });
  };

  const toggleActive = (clientId: number, currentActive: boolean) => {
    updateClient.mutate({ id: clientId, data: { isActive: !currentActive } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListClientsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetClientQueryKey(clientId) });
        toast({ title: `Client ${currentActive ? "deactivated" : "activated"}` });
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
    <div className="space-y-6 max-w-7xl">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clients</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {isLoading ? "Loading…" : `${activeClients.length} active · ${inactiveClients.length} inactive`}
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1.5" /> Create Client</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Client</DialogTitle>
              <DialogDescription>Add a new tenant to the LeadEngine platform.</DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 pt-2">
                <FormField control={form.control} name="businessName" render={({ field }) => (
                  <FormItem><FormLabel>Business Name</FormLabel><FormControl><Input {...field} required /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="slug" render={({ field }) => (
                  <FormItem><FormLabel>Slug</FormLabel><FormControl><Input {...field} required pattern="^[a-z0-9-]+$" /></FormControl></FormItem>
                )} />
                <div className="grid grid-cols-2 gap-3">
                  <FormField control={form.control} name="ownerEmail" render={({ field }) => (
                    <FormItem><FormLabel>Owner Email</FormLabel><FormControl><Input type="email" {...field} required /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="notificationEmail" render={({ field }) => (
                    <FormItem><FormLabel>Notification Email</FormLabel><FormControl><Input type="email" {...field} required /></FormControl></FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <FormField control={form.control} name="websiteUrl" render={({ field }) => (
                    <FormItem><FormLabel>Website URL</FormLabel><FormControl><Input type="url" {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="industry" render={({ field }) => (
                    <FormItem><FormLabel>Industry</FormLabel><FormControl><Input {...field} placeholder="e.g. Landscaping" /></FormControl></FormItem>
                  )} />
                </div>
                <div className="flex justify-end pt-2">
                  <Button type="submit" disabled={createClient.isPending} size="sm">
                    {createClient.isPending ? "Creating..." : "Create Client"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Active clients */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading clients...</div>
      ) : (
        <div className="space-y-8">
          <div className="space-y-3">
            {activeClients.map((client) => (
              <div
                key={client.id}
                className="bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    {/* Left: info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2.5 mb-1">
                        <h3 className="font-semibold text-slate-900 text-base">{client.businessName}</h3>
                        <Badge className="text-[10px] px-1.5 py-0 h-4 bg-emerald-100 text-emerald-700 border-emerald-200 font-medium">
                          Active
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mt-1">
                        {client.industry && (
                          <span className="font-medium text-slate-600">{client.industry}</span>
                        )}
                        <span className="font-mono text-slate-400">{client.slug}</span>
                        {client.websiteUrl && (
                          <a
                            href={client.websiteUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1 text-blue-500 hover:text-blue-700 transition-colors"
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

                    {/* Right: API key + actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      {/* API Key copy */}
                      <div className="flex items-center gap-1.5 font-mono text-xs bg-slate-100 hover:bg-slate-200 transition-colors px-2.5 py-1.5 rounded-lg border border-slate-200 cursor-pointer"
                        onClick={() => copyApiKey(client.apiKey, client.id)}
                        title="Copy API Key"
                      >
                        <span className="text-slate-500">{client.apiKey.substring(0, 10)}…</span>
                        {copiedId === client.id
                          ? <Check className="h-3 w-3 text-emerald-500" />
                          : <Copy className="h-3 w-3 text-slate-400" />}
                      </div>
                    </div>
                  </div>

                  {/* Footer actions */}
                  <div className="flex items-center gap-2 mt-4 pt-3.5 border-t border-slate-100">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-slate-500 hover:text-slate-700"
                      onClick={() => toggleActive(client.id, client.isActive)}
                    >
                      <Power className="h-3.5 w-3.5 mr-1.5" />
                      Deactivate
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
                      <Link href={`/clients/${client.id}`}>
                        Manage
                        <ChevronRight className="h-3.5 w-3.5 ml-1" />
                      </Link>
                    </Button>
                    <span className="ml-auto text-xs text-slate-400">
                      Since {format(new Date(client.createdAt), "MMM d, yyyy")}
                    </span>
                  </div>
                </div>
              </div>
            ))}

            {activeClients.length === 0 && !isLoading && (
              <div className="text-center py-12 text-muted-foreground text-sm border border-dashed rounded-xl">
                No active clients. Create one above.
              </div>
            )}
          </div>

          {/* Inactive clients */}
          {inactiveClients.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Inactive</h2>
              <div className="space-y-2">
                {inactiveClients.map((client) => (
                  <div
                    key={client.id}
                    className="bg-slate-50 border border-slate-200 rounded-xl opacity-70 hover:opacity-90 transition-opacity"
                  >
                    <div className="p-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="min-w-0">
                          <span className="font-medium text-slate-700 text-sm">{client.businessName}</span>
                          {client.industry && <span className="text-xs text-slate-400 ml-2">{client.industry}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => toggleActive(client.id, client.isActive)}
                        >
                          <Power className="h-3.5 w-3.5 mr-1.5" />
                          Activate
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
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
