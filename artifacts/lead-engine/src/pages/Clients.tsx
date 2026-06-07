import { useState } from "react";
import { useListClients, useCreateClient, useUpdateClient, getListClientsQueryKey, getGetClientQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Copy, Plus, Check, Power } from "lucide-react";

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

  const copyToClipboard = (text: string, id: number) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast({ title: "API Key copied", duration: 2000 });
  };

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clients</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Manage tenant accounts and API keys.</p>
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

      <div className="border rounded-lg bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead>Business</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Industry</TableHead>
              <TableHead>API Key</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">Loading clients...</TableCell>
              </TableRow>
            ) : clients && clients.length > 0 ? (
              clients.map((client) => (
                <TableRow key={client.id} className={!client.isActive ? "opacity-60" : ""}>
                  <TableCell className="font-medium">{client.businessName}</TableCell>
                  <TableCell className="text-sm font-mono text-slate-500">{client.slug}</TableCell>
                  <TableCell className="text-sm text-slate-500">{client.industry || "—"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 font-mono text-xs bg-slate-100 p-1.5 rounded w-fit">
                      <span className="truncate w-20">{client.apiKey.substring(0, 8)}...</span>
                      <button onClick={() => copyToClipboard(client.apiKey, client.id)} className="text-slate-500 hover:text-slate-900">
                        {copiedId === client.id ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                      </button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={client.isActive ? "default" : "secondary"} className="text-xs">
                      {client.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-slate-500">{format(new Date(client.createdAt), "MMM d, yyyy")}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => toggleActive(client.id, client.isActive)}
                        title={client.isActive ? "Deactivate" : "Activate"}
                      >
                        <Power className="h-3.5 w-3.5 mr-1" />
                        {client.isActive ? "Deactivate" : "Activate"}
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
                        <Link href={`/clients/${client.id}`}>Manage</Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-slate-500">No clients found.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
