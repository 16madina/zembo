import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Wrench,
  Trash2,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock,
  Users,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface QueueStats {
  waiting: number;
  matched: number;
  stale: number;
}

interface SessionStats {
  active: number;
  deciding: number;
  decidingStale: number;
  completed: number;
}

const AdminMaintenanceTab = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [queueStats, setQueueStats] = useState<QueueStats | null>(null);
  const [sessionStats, setSessionStats] = useState<SessionStats | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchStats = async () => {
    try {
      // Fetch queue stats
      const { data: queueData } = await supabase
        .from("random_call_queue")
        .select("status, last_heartbeat");

      const now = new Date();
      const twoMinutesAgo = new Date(now.getTime() - 2 * 60 * 1000);

      const queueEntries = queueData || [];
      const waiting = queueEntries.filter((q) => q.status === "waiting").length;
      const matched = queueEntries.filter((q) => q.status === "matched").length;
      const stale = queueEntries.filter(
        (q) => q.last_heartbeat && new Date(q.last_heartbeat) < twoMinutesAgo
      ).length;

      setQueueStats({ waiting, matched, stale });

      // Fetch session stats
      const { data: sessionData } = await supabase
        .from("random_call_sessions")
        .select("status, created_at");

      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

      const sessions = sessionData || [];
      const active = sessions.filter((s) => s.status === "active").length;
      const deciding = sessions.filter((s) => s.status === "deciding").length;
      const decidingStale = sessions.filter(
        (s) =>
          s.status === "deciding" &&
          new Date(s.created_at) < fiveMinutesAgo
      ).length;
      const completed = sessions.filter((s) => s.status === "completed").length;

      setSessionStats({ active, deciding, decidingStale, completed });
      setLastRefresh(new Date());
    } catch (error) {
      console.error("Error fetching maintenance stats:", error);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const cleanupStaleSessions = async () => {
    setIsLoading(true);
    try {
      // Close sessions stuck in 'deciding' status for more than 5 minutes
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from("random_call_sessions")
        .update({ status: "completed" })
        .eq("status", "deciding")
        .lt("created_at", fiveMinutesAgo)
        .select();

      if (error) throw error;

      const count = data?.length || 0;
      toast.success(`${count} session(s) 'deciding' clôturée(s)`);
      await fetchStats();
    } catch (error) {
      console.error("Error cleaning up sessions:", error);
      toast.error("Erreur lors du nettoyage");
    } finally {
      setIsLoading(false);
    }
  };

  const cleanupStaleQueue = async () => {
    setIsLoading(true);
    try {
      // Remove queue entries with stale heartbeat (> 2 minutes)
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from("random_call_queue")
        .delete()
        .lt("last_heartbeat", twoMinutesAgo)
        .select();

      if (error) throw error;

      const count = data?.length || 0;
      toast.success(`${count} entrée(s) de queue obsolètes supprimée(s)`);
      await fetchStats();
    } catch (error) {
      console.error("Error cleaning up queue:", error);
      toast.error("Erreur lors du nettoyage");
    } finally {
      setIsLoading(false);
    }
  };

  const cleanupAllDeciding = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("random_call_sessions")
        .update({ status: "completed" })
        .eq("status", "deciding")
        .select();

      if (error) throw error;

      const count = data?.length || 0;
      toast.success(`${count} session(s) 'deciding' clôturée(s)`);
      await fetchStats();
    } catch (error) {
      console.error("Error cleaning up all deciding sessions:", error);
      toast.error("Erreur lors du nettoyage");
    } finally {
      setIsLoading(false);
    }
  };

  const resetQueue = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("random_call_queue")
        .delete()
        .neq("status", "___never___")
        .select();

      if (error) throw error;

      const count = data?.length || 0;
      toast.success(`Queue vidée (${count} entrée(s) supprimée(s))`);
      await fetchStats();
    } catch (error) {
      console.error("Error resetting queue:", error);
      toast.error("Erreur lors de la réinitialisation");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Queue - En attente</p>
                <p className="text-2xl font-bold">{queueStats?.waiting ?? "-"}</p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Queue - Matchés</p>
                <p className="text-2xl font-bold">{queueStats?.matched ?? "-"}</p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Sessions - Deciding</p>
                <p className="text-2xl font-bold text-amber-500">
                  {sessionStats?.deciding ?? "-"}
                </p>
              </div>
              <Clock className="w-8 h-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Deciding obsolètes</p>
                <p className="text-2xl font-bold text-red-500">
                  {sessionStats?.decidingStale ?? "-"}
                </p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="w-5 h-5" />
            Outils de maintenance Z Roulette
          </CardTitle>
          <CardDescription>
            Nettoyer les sessions bloquées et la file d'attente pour débloquer le système
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Refresh */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div>
              <p className="font-medium">Actualiser les statistiques</p>
              <p className="text-sm text-muted-foreground">
                Dernière actualisation:{" "}
                {lastRefresh ? lastRefresh.toLocaleTimeString() : "jamais"}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={fetchStats} disabled={isLoading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              Actualiser
            </Button>
          </div>

          {/* Cleanup stale deciding sessions */}
          <div className="flex items-center justify-between p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium">Clôturer sessions 'deciding' obsolètes</p>
                {sessionStats?.decidingStale ? (
                  <Badge variant="destructive">{sessionStats.decidingStale}</Badge>
                ) : null}
              </div>
              <p className="text-sm text-muted-foreground">
                Sessions en attente de décision depuis plus de 5 minutes
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={cleanupStaleSessions}
              disabled={isLoading || !sessionStats?.decidingStale}
              className="border-amber-500 text-amber-500 hover:bg-amber-500/10"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Clock className="w-4 h-4 mr-2" />
              )}
              Nettoyer
            </Button>
          </div>

          {/* Cleanup all deciding sessions */}
          <div className="flex items-center justify-between p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium">Clôturer TOUTES les sessions 'deciding'</p>
                {sessionStats?.deciding ? (
                  <Badge className="bg-orange-500">{sessionStats.deciding}</Badge>
                ) : null}
              </div>
              <p className="text-sm text-muted-foreground">
                Force la clôture de toutes les sessions en phase de décision
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={cleanupAllDeciding}
              disabled={isLoading || !sessionStats?.deciding}
              className="border-orange-500 text-orange-500 hover:bg-orange-500/10"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              Tout clôturer
            </Button>
          </div>

          {/* Cleanup stale queue */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium">Nettoyer queue obsolète</p>
                {queueStats?.stale ? (
                  <Badge variant="secondary">{queueStats.stale}</Badge>
                ) : null}
              </div>
              <p className="text-sm text-muted-foreground">
                Supprimer les entrées sans heartbeat depuis plus de 2 minutes
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={cleanupStaleQueue}
              disabled={isLoading || !queueStats?.stale}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              Nettoyer
            </Button>
          </div>

          {/* Reset entire queue (danger) */}
          <div className="flex items-center justify-between p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <div>
              <p className="font-medium text-destructive">Réinitialiser toute la queue</p>
              <p className="text-sm text-muted-foreground">
                Supprime toutes les entrées de la file d'attente (action irréversible)
              </p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={resetQueue}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              Réinitialiser
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default AdminMaintenanceTab;
