import { useEffect } from "react";
import { useParams, Link } from "wouter";
import { useGetClient, useUpdateClient, useGetEmbedCode, getGetClientQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Copy, Code, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

export default function ClientDetail() {
  const { id } = useParams();
  const clientId = Number(id);
  const { data: client, isLoading: clientLoading } = useGetClient(clientId);
  const { data: embed, isLoading: embedLoading } = useGetEmbedCode(clientId);
  const updateClient = useUpdateClient();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const form = useForm({
    defaultValues: {
      businessName: "",
      ownerEmail: "",
      notificationEmail: "",
      websiteUrl: ""
    }
  });

  useEffect(() => {
    if (client) {
      form.reset({
        businessName: client.businessName,
        ownerEmail: client.ownerEmail,
        notificationEmail: client.notificationEmail,
        websiteUrl: client.websiteUrl || ""
      });
    }
  }, [client, form]);

  const onSubmit = (data: any) => {
    updateClient.mutate({
      id: clientId,
      data
    }, {
      onSuccess: () => {
        toast({ title: "Client updated successfully" });
        queryClient.invalidateQueries({ queryKey: getGetClientQueryKey(clientId) });
      },
      onError: () => {
        toast({ title: "Failed to update client", variant: "destructive" });
      }
    });
  };

  const copyEmbedCode = () => {
    if (embed?.htmlSnippet) {
      navigator.clipboard.writeText(embed.htmlSnippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: "Embed code copied to clipboard", duration: 2000 });
    }
  };

  if (clientLoading) return <div>Loading...</div>;
  if (!client) return <div>Client not found</div>;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" size="icon" asChild>
          <Link href="/clients">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{client.businessName}</h1>
          <p className="text-muted-foreground text-sm font-mono mt-1">Tenant ID: {client.slug}</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Client Details</CardTitle>
            <CardDescription>Update business information and routing emails.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="businessName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Business Name</FormLabel>
                      <FormControl><Input {...field} required /></FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="ownerEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Owner Email (Login)</FormLabel>
                      <FormControl><Input type="email" {...field} required /></FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="notificationEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notification Email (Leads)</FormLabel>
                      <FormControl><Input type="email" {...field} required /></FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="websiteUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Website URL</FormLabel>
                      <FormControl><Input type="url" {...field} /></FormControl>
                    </FormItem>
                  )}
                />
                <div className="pt-2">
                  <Button type="submit" disabled={updateClient.isPending}>
                    {updateClient.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="bg-slate-900 text-slate-50 border-slate-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-50">
                <Code className="h-5 w-5 text-blue-400" />
                Integration Code
              </CardTitle>
              <CardDescription className="text-slate-400">
                Copy and paste this snippet into the client's website right before the closing &lt;/body&gt; tag.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {embedLoading ? (
                <div className="text-slate-500">Generating snippet...</div>
              ) : embed ? (
                <div className="relative mt-2">
                  <div className="bg-slate-950 p-4 rounded-md overflow-x-auto font-mono text-sm text-slate-300 border border-slate-800">
                    <pre><code>{embed.htmlSnippet}</code></pre>
                  </div>
                  <Button 
                    size="sm" 
                    variant="secondary" 
                    className="absolute top-2 right-2 h-8"
                    onClick={copyEmbedCode}
                  >
                    {copied ? <Check className="h-4 w-4 mr-2 text-green-500" /> : <Copy className="h-4 w-4 mr-2" />}
                    {copied ? "Copied" : "Copy"}
                  </Button>
                </div>
              ) : (
                <div className="text-slate-500">Code snippet unavailable.</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>API Configuration</CardTitle>
              <CardDescription>Advanced integration details.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <span className="text-sm font-medium text-slate-500 block mb-1">Tenant Slug</span>
                <code className="text-sm bg-slate-100 px-2 py-1 rounded">{client.slug}</code>
              </div>
              <div>
                <span className="text-sm font-medium text-slate-500 block mb-1">API Key</span>
                <code className="text-sm bg-slate-100 px-2 py-1 rounded">{client.apiKey}</code>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
