import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Ban,
  ShieldOff,
  Clock,
  Infinity,
  User,
  Loader2,
  Search,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

interface BannedUser {
  id: string;
  user_id: string;
  reason: string;
  description: string | null;
  banned_at: string;
  expires_at: string | null;
  is_permanent: boolean;
  is_active: boolean;
  profile?: {
    display_name: string | null;
    avatar_url: string | null;
    email: string | null;
  };
}

const reasonLabels: Record<string, string> = {
  harassment: "Harcèlement",
  inappropriate: "Contenu inapproprié",
  spam: "Spam",
  fake: "Faux profil",
  scam: "Arnaque",
  violence: "Violence/Menaces",
  other: "Autre",
};

const AdminBansTab = () => {
  const { user: currentUser } = useAuth();
  const [bans, setBans] = useState<BannedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  useEffect(() => {
    fetchBans();
  }, []);

  const fetchBans = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("banned_users")
        .select("*")
        .order("banned_at", { ascending: false });

      if (error) throw error;

      // Fetch profiles for each banned user
      const bansWithProfiles = await Promise.all(
        (data || []).map(async (ban) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("display_name, avatar_url, email")
            .eq("user_id", ban.user_id)
            .maybeSingle();

          return { ...ban, profile };
        })
      );

      setBans(bansWithProfiles);
    } catch (error) {
      console.error("Error fetching bans:", error);
      toast.error("Erreur lors du chargement des bannissements");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnban = async (ban: BannedUser) => {
    if (!currentUser) return;

    setIsProcessing(ban.id);
    try {
      const { error } = await supabase
        .from("banned_users")
        .update({
          is_active: false,
          unbanned_at: new Date().toISOString(),
          unbanned_by: currentUser.id,
        })
        .eq("id", ban.id);

      if (error) throw error;

      setBans((prev) =>
        prev.map((b) => (b.id === ban.id ? { ...b, is_active: false } : b))
      );

      toast.success("Utilisateur débanni avec succès");
    } catch (error) {
      console.error("Error unbanning user:", error);
      toast.error("Erreur lors du débannissement");
    } finally {
      setIsProcessing(null);
    }
  };

  const filteredBans = bans.filter((ban) => {
    const query = searchQuery.toLowerCase();
    return (
      ban.profile?.display_name?.toLowerCase().includes(query) ||
      ban.profile?.email?.toLowerCase().includes(query) ||
      ban.reason.toLowerCase().includes(query)
    );
  });

  const activeBans = filteredBans.filter((b) => b.is_active);
  const expiredBans = filteredBans.filter((b) => !b.is_active);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher un bannissement..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Active Bans */}
      <Card className="glass-strong">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ban className="w-5 h-5 text-red-500" />
            Bannissements actifs ({activeBans.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeBans.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ShieldOff className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Aucun bannissement actif</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Utilisateur</TableHead>
                    <TableHead>Raison</TableHead>
                    <TableHead>Banni le</TableHead>
                    <TableHead>Durée</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeBans.map((ban) => (
                    <TableRow key={ban.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="w-8 h-8">
                            <AvatarImage
                              src={ban.profile?.avatar_url || undefined}
                            />
                            <AvatarFallback>
                              {ban.profile?.display_name?.[0]?.toUpperCase() ||
                                "?"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">
                              {ban.profile?.display_name || "Sans nom"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {ban.profile?.email || "-"}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {reasonLabels[ban.reason] || ban.reason}
                        </Badge>
                        {ban.description && (
                          <p className="text-xs text-muted-foreground mt-1 max-w-[200px] truncate">
                            {ban.description}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(ban.banned_at).toLocaleDateString("fr-FR", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </TableCell>
                      <TableCell>
                        {ban.is_permanent ? (
                          <Badge className="bg-red-500/20 text-red-400">
                            <Infinity className="w-3 h-3 mr-1" />
                            Permanent
                          </Badge>
                        ) : ban.expires_at ? (
                          <Badge className="bg-orange-500/20 text-orange-400">
                            <Clock className="w-3 h-3 mr-1" />
                            Jusqu'au{" "}
                            {new Date(ban.expires_at).toLocaleDateString(
                              "fr-FR"
                            )}
                          </Badge>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-green-500 hover:text-green-400 hover:bg-green-500/20"
                          onClick={() => handleUnban(ban)}
                          disabled={isProcessing === ban.id}
                        >
                          {isProcessing === ban.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <ShieldOff className="w-4 h-4 mr-1" />
                              Débannir
                            </>
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Expired/Lifted Bans */}
      {expiredBans.length > 0 && (
        <Card className="glass-strong">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-muted-foreground">
              <Clock className="w-5 h-5" />
              Historique des bannissements ({expiredBans.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Utilisateur</TableHead>
                    <TableHead>Raison</TableHead>
                    <TableHead>Période</TableHead>
                    <TableHead>Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expiredBans.map((ban) => (
                    <TableRow key={ban.id} className="opacity-60">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="w-8 h-8">
                            <AvatarImage
                              src={ban.profile?.avatar_url || undefined}
                            />
                            <AvatarFallback>
                              {ban.profile?.display_name?.[0]?.toUpperCase() ||
                                "?"}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">
                            {ban.profile?.display_name || "Sans nom"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {reasonLabels[ban.reason] || ban.reason}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(ban.banned_at).toLocaleDateString("fr-FR")}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">Levé</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
};

export default AdminBansTab;
