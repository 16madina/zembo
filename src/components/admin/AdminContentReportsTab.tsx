import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Flag, CheckCircle, XCircle, Loader2, ExternalLink, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNavigate } from "react-router-dom";

interface ContentReport {
  id: string;
  reporter_id: string;
  reported_user_id: string;
  content_type: string;
  content_id: string | null;
  reason: string;
  details: string | null;
  status: string;
  created_at: string;
  reporter_profile?: { display_name: string | null } | null;
  reported_profile?: { display_name: string | null } | null;
}

interface Props {
  onPendingCountChange?: (count: number) => void;
}

const AdminContentReportsTab = ({ onPendingCountChange }: Props) => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [reports, setReports] = useState<ContentReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const fr = language === "fr";

  const fetchReports = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("content_reports")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;

      const enriched = await Promise.all(
        (data || []).map(async (r: ContentReport) => {
          const [reporterRes, reportedRes] = await Promise.all([
            supabase.from("profiles").select("display_name").eq("user_id", r.reporter_id).maybeSingle(),
            supabase.from("profiles").select("display_name").eq("user_id", r.reported_user_id).maybeSingle(),
          ]);
          return { ...r, reporter_profile: reporterRes.data, reported_profile: reportedRes.data };
        })
      );

      setReports(enriched);
      onPendingCountChange?.(enriched.filter((r) => r.status === "pending").length);
    } catch (e) {
      console.error(e);
      toast.error(fr ? "Erreur de chargement" : "Loading error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateStatus = async (id: string, status: "resolved" | "rejected") => {
    setUpdating(id);
    try {
      const { error } = await (supabase as any)
        .from("content_reports")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
      setReports((prev) => {
        const next = prev.map((r) => (r.id === id ? { ...r, status } : r));
        onPendingCountChange?.(next.filter((r) => r.status === "pending").length);
        return next;
      });
      toast.success(
        status === "resolved"
          ? fr ? "Signalement traité" : "Report resolved"
          : fr ? "Signalement rejeté" : "Report rejected"
      );
    } catch (e) {
      console.error(e);
      toast.error(fr ? "Erreur de mise à jour" : "Update error");
    } finally {
      setUpdating(null);
    }
  };

  const contentTypeLabel = (t: string) => {
    const map: Record<string, string> = fr
      ? { profile: "Profil", live: "Live", room: "Salon", message: "Message", blocked_by_user: "Blocage" }
      : { profile: "Profile", live: "Live", room: "Room", message: "Message", blocked_by_user: "Block" };
    return map[t] || t;
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="glass-strong">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flag className="w-5 h-5 text-red-500" />
            {fr ? "Signalements de contenu" : "Content reports"} ({reports.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>{fr ? "Aucun signalement" : "No reports"}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{fr ? "Date" : "Date"}</TableHead>
                    <TableHead>{fr ? "Signaleur" : "Reporter"}</TableHead>
                    <TableHead>{fr ? "Signalé" : "Reported"}</TableHead>
                    <TableHead>{fr ? "Type" : "Type"}</TableHead>
                    <TableHead>{fr ? "Motif" : "Reason"}</TableHead>
                    <TableHead>{fr ? "Statut" : "Status"}</TableHead>
                    <TableHead>{fr ? "Actions" : "Actions"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(r.created_at).toLocaleDateString(fr ? "fr-FR" : "en-US", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </TableCell>
                      <TableCell>{r.reporter_profile?.display_name || (fr ? "Anonyme" : "Anonymous")}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span>{r.reported_profile?.display_name || (fr ? "Anonyme" : "Anonymous")}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            onClick={() => navigate(`/profile?userId=${r.reported_user_id}`)}
                            title={fr ? "Voir le profil" : "View profile"}
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{contentTypeLabel(r.content_type)}</Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        <div className="text-sm">
                          <div className="font-medium">{r.reason}</div>
                          {r.details && (
                            <div className="text-xs text-muted-foreground truncate" title={r.details}>
                              {r.details}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            r.status === "pending"
                              ? "bg-orange-500/20 text-orange-400"
                              : r.status === "resolved"
                              ? "bg-green-500/20 text-green-400"
                              : "bg-red-500/20 text-red-400"
                          }
                        >
                          {r.status === "pending"
                            ? fr ? "En attente" : "Pending"
                            : r.status === "resolved"
                            ? fr ? "Traité" : "Resolved"
                            : fr ? "Rejeté" : "Rejected"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {r.status === "pending" && (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-green-500 hover:text-green-400 hover:bg-green-500/20"
                              onClick={() => updateStatus(r.id, "resolved")}
                              disabled={updating === r.id}
                            >
                              {updating === r.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <CheckCircle className="w-4 h-4" />
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-red-500 hover:text-red-400 hover:bg-red-500/20"
                              onClick={() => updateStatus(r.id, "rejected")}
                              disabled={updating === r.id}
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default AdminContentReportsTab;
