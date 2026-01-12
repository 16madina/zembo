import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Shield,
  Users,
  AlertTriangle,
  MessageSquare,
  Ban,
  Loader2,
  Settings,
  Mail,
  UserCheck,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

import AdminStatsCards from "@/components/admin/AdminStatsCards";
import AdminReportsTab from "@/components/admin/AdminReportsTab";
import AdminUsersTab from "@/components/admin/AdminUsersTab";
import AdminCommunicationTab from "@/components/admin/AdminCommunicationTab";
import AdminBansTab from "@/components/admin/AdminBansTab";
import AdminSettingsTab from "@/components/admin/AdminSettingsTab";
import AdminEmailPreviewTab from "@/components/admin/AdminEmailPreviewTab";
import AdminIdentityTab from "@/components/admin/AdminIdentityTab";

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
  totalUsers: number;
  bannedUsers: number;
}

const Admin = () => {
  const navigate = useNavigate();
  const { isAdmin, isLoading: roleLoading } = useUserRole();
  const [reports, setReports] = useState<Report[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
        const { data: reportsData, error: reportsError } = await supabase
          .from("user_reports")
          .select("*")
          .order("created_at", { ascending: false });

        if (reportsError) throw reportsError;

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

        const [sessionsRes, matchesRes, usersRes, bansRes] = await Promise.all([
          supabase.from("random_call_sessions").select("status"),
          supabase.from("matches").select("id", { count: "exact" }),
          supabase.from("profiles").select("id", { count: "exact" }),
          supabase.from("banned_users").select("id", { count: "exact" }).eq("is_active", true),
        ]);

        const sessions = sessionsRes.data || [];
        const pendingReportsCount = (reportsData || []).filter(
          (r) => r.status === "pending"
        ).length;

        setStats({
          totalSessions: sessions.length,
          activeSessions: sessions.filter((s) => s.status === "active").length,
          completedSessions: sessions.filter((s) => s.status === "completed").length,
          totalMatches: matchesRes.count || 0,
          pendingReports: pendingReportsCount,
          totalReports: (reportsData || []).length,
          totalUsers: usersRes.count || 0,
          bannedUsers: bansRes.count || 0,
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

  if (roleLoading || isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="fixed inset-0 flex flex-col overflow-y-auto overflow-x-hidden pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      <motion.header
        className="flex items-center gap-4 px-6 py-4 border-b border-border/50"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Button variant="ghost" size="icon" onClick={() => navigate("/profile")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-2">
          <Shield className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-bold">Administration</h1>
        </div>
      </motion.header>

      <div className="px-6 py-6 space-y-6">
        <AdminStatsCards stats={stats} />

        <Tabs defaultValue="reports" className="w-full">
          <TabsList className="grid w-full grid-cols-7 mb-4">
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              <span className="hidden sm:inline">Signalements</span>
            </TabsTrigger>
            <TabsTrigger value="identity" className="flex items-center gap-2">
              <UserCheck className="w-4 h-4" />
              <span className="hidden sm:inline">Identités</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Utilisateurs</span>
            </TabsTrigger>
            <TabsTrigger value="bans" className="flex items-center gap-2">
              <Ban className="w-4 h-4" />
              <span className="hidden sm:inline">Bans</span>
            </TabsTrigger>
            <TabsTrigger value="communication" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              <span className="hidden sm:inline">Messages</span>
            </TabsTrigger>
            <TabsTrigger value="emails" className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              <span className="hidden sm:inline">Emails</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Paramètres</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="reports">
            <AdminReportsTab reports={reports} setReports={setReports} />
          </TabsContent>

          <TabsContent value="identity">
            <AdminIdentityTab />
          </TabsContent>

          <TabsContent value="users">
            <AdminUsersTab />
          </TabsContent>

          <TabsContent value="bans">
            <AdminBansTab />
          </TabsContent>

          <TabsContent value="communication">
            <AdminCommunicationTab />
          </TabsContent>

          <TabsContent value="emails">
            <AdminEmailPreviewTab />
          </TabsContent>

          <TabsContent value="settings">
            <AdminSettingsTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;
