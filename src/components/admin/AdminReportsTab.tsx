import { useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Users,
  Eye,
  Loader2,
} from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
 import { useLanguage } from "@/contexts/LanguageContext";

interface Report {
  id: string;
  reporter_id: string;
  reported_id: string;
  session_id: string | null;
  reason: string;
  description: string | null;
  status: string;
  created_at: string;
  reporter_profile?: { display_name: string | null };
  reported_profile?: { display_name: string | null };
}

interface AdminReportsTabProps {
  reports: Report[];
  setReports: React.Dispatch<React.SetStateAction<Report[]>>;
}

const AdminReportsTab = ({ reports, setReports }: AdminReportsTabProps) => {
   const { t, language } = useLanguage();
  const [updatingReport, setUpdatingReport] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
   
   const reasonLabels: Record<string, string> = {
     harassment: language === "fr" ? "Harcèlement" : "Harassment",
     inappropriate: language === "fr" ? "Contenu inapproprié" : "Inappropriate content",
     spam: "Spam",
     fake: language === "fr" ? "Faux profil" : "Fake profile",
     other: language === "fr" ? "Autre" : "Other",
   };

  const handleUpdateReportStatus = async (
    reportId: string,
    newStatus: string
  ) => {
    setUpdatingReport(reportId);
    try {
      const { error } = await supabase
        .from("user_reports")
        .update({
          status: newStatus,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", reportId);

      if (error) throw error;

      setReports((prev) =>
        prev.map((r) => (r.id === reportId ? { ...r, status: newStatus } : r))
      );

      toast.success(
         newStatus === "resolved" 
           ? (language === "fr" ? "Signalement résolu" : "Report resolved")
           : (language === "fr" ? "Signalement rejeté" : "Report rejected")
      );
    } catch (error) {
      console.error("Error updating report:", error);
       toast.error(t.errorUpdating);
    } finally {
      setUpdatingReport(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className="glass-strong">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
             {t.reports} ({reports.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {reports.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
               <p>{language === "fr" ? "Aucun signalement pour le moment" : "No reports at the moment"}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                     <TableHead>{language === "fr" ? "Date" : "Date"}</TableHead>
                     <TableHead>{language === "fr" ? "Signaleur" : "Reporter"}</TableHead>
                     <TableHead>{language === "fr" ? "Signalé" : "Reported"}</TableHead>
                     <TableHead>{language === "fr" ? "Raison" : "Reason"}</TableHead>
                     <TableHead>{t.status}</TableHead>
                     <TableHead>{t.actions}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(report.created_at).toLocaleDateString(
                           language === "fr" ? "fr-FR" : "en-US",
                          {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )}
                      </TableCell>
                      <TableCell>
                         {report.reporter_profile?.display_name || (language === "fr" ? "Anonyme" : "Anonymous")}
                      </TableCell>
                      <TableCell>
                         {report.reported_profile?.display_name || (language === "fr" ? "Anonyme" : "Anonymous")}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {reasonLabels[report.reason] || report.reason}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            report.status === "pending"
                              ? "secondary"
                              : report.status === "resolved"
                              ? "default"
                              : "destructive"
                          }
                          className={
                            report.status === "pending"
                              ? "bg-orange-500/20 text-orange-400"
                              : report.status === "resolved"
                              ? "bg-green-500/20 text-green-400"
                              : "bg-red-500/20 text-red-400"
                          }
                        >
                          {report.status === "pending"
                             ? t.pending
                            : report.status === "resolved"
                             ? (language === "fr" ? "Résolu" : "Resolved")
                             : t.rejected}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={() => setSelectedReport(report)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {report.status === "pending" && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 text-green-500 hover:text-green-400 hover:bg-green-500/20"
                                onClick={() =>
                                  handleUpdateReportStatus(
                                    report.id,
                                    "resolved"
                                  )
                                }
                                disabled={updatingReport === report.id}
                              >
                                {updatingReport === report.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <CheckCircle className="w-4 h-4" />
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 text-red-500 hover:text-red-400 hover:bg-red-500/20"
                                onClick={() =>
                                  handleUpdateReportStatus(
                                    report.id,
                                    "rejected"
                                  )
                                }
                                disabled={updatingReport === report.id}
                              >
                                <XCircle className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Report Detail Dialog */}
      <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
             <DialogTitle>{language === "fr" ? "Détails du signalement" : "Report details"}</DialogTitle>
          </DialogHeader>
          {selectedReport && (
            <div className="space-y-4">
              <div>
                 <p className="text-sm text-muted-foreground">{language === "fr" ? "Signaleur" : "Reporter"}</p>
                <p className="font-medium">
                   {selectedReport.reporter_profile?.display_name || (language === "fr" ? "Anonyme" : "Anonymous")}
                </p>
              </div>
              <div>
                 <p className="text-sm text-muted-foreground">{language === "fr" ? "Utilisateur signalé" : "Reported user"}</p>
                <p className="font-medium">
                   {selectedReport.reported_profile?.display_name || (language === "fr" ? "Anonyme" : "Anonymous")}
                </p>
              </div>
              <div>
                 <p className="text-sm text-muted-foreground">{language === "fr" ? "Raison" : "Reason"}</p>
                <Badge variant="outline">
                  {reasonLabels[selectedReport.reason] || selectedReport.reason}
                </Badge>
              </div>
              {selectedReport.description && (
                <div>
                   <p className="text-sm text-muted-foreground">{t.description}</p>
                  <p className="text-sm">{selectedReport.description}</p>
                </div>
              )}
              <div>
                 <p className="text-sm text-muted-foreground">{language === "fr" ? "Date" : "Date"}</p>
                <p className="text-sm">
                   {new Date(selectedReport.created_at).toLocaleString(language === "fr" ? "fr-FR" : "en-US")}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default AdminReportsTab;
