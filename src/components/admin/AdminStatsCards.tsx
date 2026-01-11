import { motion } from "framer-motion";
import { Phone, TrendingUp, Clock, AlertTriangle, Users, Ban } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

interface AdminStatsCardsProps {
  stats: Stats | null;
}

const AdminStatsCards = ({ stats }: AdminStatsCardsProps) => {
  return (
    <motion.div
      className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      <Card className="glass-strong">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Users className="w-4 h-4" />
            Utilisateurs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{stats?.totalUsers || 0}</p>
        </CardContent>
      </Card>

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

      <Card className="glass-strong">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Ban className="w-4 h-4" />
            Utilisateurs bannis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-red-500">
            {stats?.bannedUsers || 0}
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default AdminStatsCards;
