import { useState, useEffect } from "react";
import { useParams, Link } from "wouter";
import { useGetLead, useUpdateLead, getGetLeadQueryKey, LeadUpdateStatus, getListLeadsQueryKey, getGetRecentLeadsQueryKey, getGetDashboardStatsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { ArrowLeft, Save, User, Mail, Phone, Clock, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { LeadBadge } from "@/components/LeadBadge";

export default function LeadDetail() {
  const { id } = useParams();
  const { data: lead, isLoading } = useGetLead(Number(id));
  const updateLead = useUpdateLead();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [status, setStatus] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  useEffect(() => {
    if (lead) {
      setStatus(lead.status);
      setNotes(lead.notes || "");
    }
  }, [lead]);

  const handleSave = () => {
    updateLead.mutate({
      id: Number(id),
      data: {
        status: status as LeadUpdateStatus,
        notes: notes
      }
    }, {
      onSuccess: () => {
        toast({ title: "Lead updated successfully" });
        queryClient.invalidateQueries({ queryKey: getGetLeadQueryKey(Number(id)) });
        queryClient.invalidateQueries({ queryKey: getListLeadsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetRecentLeadsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
      },
      onError: () => {
        toast({ title: "Failed to update lead", variant: "destructive" });
      }
    });
  };

  if (isLoading) return <div>Loading...</div>;
  if (!lead) return <div>Lead not found</div>;

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-300">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" size="icon" asChild>
          <Link href="/leads">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">{lead.name}</h1>
          <p className="text-muted-foreground text-sm">Lead details and activity</p>
        </div>
        <LeadBadge status={lead.status} />
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center text-sm font-medium text-slate-500">
                    <User className="h-4 w-4 mr-2" /> Name
                  </div>
                  <p>{lead.name}</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center text-sm font-medium text-slate-500">
                    <Mail className="h-4 w-4 mr-2" /> Email
                  </div>
                  <a href={`mailto:${lead.email}`} className="text-blue-600 hover:underline">{lead.email}</a>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center text-sm font-medium text-slate-500">
                    <Phone className="h-4 w-4 mr-2" /> Phone
                  </div>
                  {lead.phone ? <a href={`tel:${lead.phone}`} className="text-blue-600 hover:underline">{lead.phone}</a> : <span className="text-slate-400">—</span>}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center text-sm font-medium text-slate-500">
                    <Clock className="h-4 w-4 mr-2" /> Received
                  </div>
                  <p>{format(new Date(lead.createdAt), "PPp")}</p>
                </div>
              </div>

              {lead.message && (
                <div className="pt-4 border-t mt-4">
                  <div className="flex items-center text-sm font-medium text-slate-500 mb-2">
                    <FileText className="h-4 w-4 mr-2" /> Original Message
                  </div>
                  <p className="text-sm bg-slate-50 p-4 rounded-md whitespace-pre-wrap">{lead.message}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Internal Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea 
                placeholder="Add notes about this lead..." 
                className="min-h-[150px] bg-slate-50 resize-y"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Status & Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Update Status</label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="New">New</SelectItem>
                    <SelectItem value="Contacted">Contacted</SelectItem>
                    <SelectItem value="Booked">Booked</SelectItem>
                    <SelectItem value="Won">Won</SelectItem>
                    <SelectItem value="Lost">Lost</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button 
                onClick={handleSave} 
                className="w-full" 
                disabled={updateLead.isPending || (status === lead.status && notes === (lead.notes || ""))}
              >
                <Save className="h-4 w-4 mr-2" />
                {updateLead.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
