import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Users,
  Phone,
  TrendingUp,
  Clock,
  Eye,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
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

interface Stats {
  totalSessions: number;
  activeSessions: number;
  completedSessions: number;
  totalMatches: number;
  pendingReports: number;
  totalReports: number;
}

const reasonLabels: Record<string, string> = {
  harassment: "Harcèlement",
  inappropriate: "Contenu inapproprié",
  spam: "Spam",
  fake: "Faux profil",
  other: "Autre",
};

const Admin = () => {
  const navigate = useNavigate();
  const { isAdmin, isLoading: roleLoading } = useUserRole();
  const [reports, setReports] = useState<Report[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingReport, setUpdatingReport] = useState<string | null>(null);

  useEffect(() => {
    if (!roleLoading && !isAdmin) {
      toast.error("Accès refusé");
      navigate("/profile");
    }
  }, [isAdmin, roleLoading, navigate]);

  useEffect(() => {
    if (!isAdmin) return;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch reports
        const { data: reportsData, error: reportsError } = await supabase
          .from("user_reports")
          .select("*")
          .order("created_at", { ascending: false });

        if (reportsError) throw reportsError;

        // Fetch reporter and reported profiles
        const reportsWithProfiles = await Promise.all(
          (reportsData || []).map(async (report) => {
            const [reporterRes, reportedRes] = await Promise.all([
              supabase
                .from("profiles")
                .select("display_name")
                .eq("user_id", report.reporter_id)
                .maybeSingle(),
              supabase
                .from("profiles")
                .select("display_name")
                .eq("user_id", report.reported_id)
                .maybeSingle(),
            ]);

            return {
              ...report,
              reporter_profile: reporterRes.data,
              reported_profile: reportedRes.data,
            };
          })
        );

        setReports(reportsWithProfiles);

        // Fetch stats
        const [sessionsRes, matchesRes] = await Promise.all([
          supabase.from("random_call_sessions").select("status"),
          supabase.from("matches").select("id", { count: "exact" }),
        ]);

        const sessions = sessionsRes.data || [];
        const pendingReportsCount = (reportsData || []).filter(
          (r) => r.status === "pending"
        ).length;

        setStats({
          totalSessions: sessions.length,
          activeSessions: sessions.filter((s) => s.status === "active").length,
          completedSessions: sessions.filter((s) => s.status === "completed")
            .length,
          totalMatches: matchesRes.count || 0,
          pendingReports: pendingReportsCount,
          totalReports: (reportsData || []).length,
        });
      } catch (error) {
        console.error("Error fetching admin data:", error);
        toast.error("Erreur lors du chargement des données");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [isAdmin]);

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
        `Signalement ${newStatus === "resolved" ? "résolu" : "rejeté"}`
      );
    } catch (error) {
      console.error("Error updating report:", error);
      toast.error("Erreur lors de la mise à jour");
    } finally {
      setUpdatingReport(null);
    }
  };

  if (roleLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen pb-8">
      {/* Header */}
      <motion.header
        className="flex items-center gap-4 px-6 py-4 border-b border-border/50"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/profile")}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-2">
          <Shield className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-bold">Administration</h1>
        </div>
      </motion.header>

      <div className="px-6 py-6 space-y-6">
        {/* Stats Cards */}
        <motion.div
          className="grid grid-cols-2 lg:grid-cols-4 gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="glass-strong">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Appels totaux
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats?.totalSessions || 0}</p>
            </CardContent>
          </Card>

          <Card className="glass-strong">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Matchs créés
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-500">
                {stats?.totalMatches || 0}
              </p>
            </CardContent>
          </Card>

          <Card className="glass-strong">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Appels actifs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-blue-500">
                {stats?.activeSessions || 0}
              </p>
            </CardContent>
          </Card>

          <Card className="glass-strong">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Signalements en attente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-orange-500">
                {stats?.pendingReports || 0}
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Reports Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="glass-strong">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-500" />
                Signalements ({reports.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {reports.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Aucun signalement pour le moment</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Signaleur</TableHead>
                        <TableHead>Signalé</TableHead>
                        <TableHead>Raison</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reports.map((report) => (
                        <TableRow key={report.id}>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(report.created_at).toLocaleDateString(
                              "fr-FR",
                              {
                                day: "2-digit",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )}
                          </TableCell>
                          <TableCell>
                            {report.reporter_profile?.display_name ||
                              "Anonyme"}
                          </TableCell>
                          <TableCell>
                            {report.reported_profile?.display_name ||
                              "Anonyme"}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {reasonLabels[report.reason] || report.reason}
                            </Badge>
                            {report.description && (
                              <p className="text-xs text-muted-foreground mt-1 max-w-[200px] truncate">
                                {report.description}
                              </p>
                            )}
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
                                ? "En attente"
                                : report.status === "resolved"
                                ? "Résolu"
                                : "Rejeté"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {report.status === "pending" && (
                              <div className="flex gap-2">
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
                              </div>
                            )}
                            {report.status !== "pending" && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
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
      </div>
    </div>
  );
};

export default Admin;
