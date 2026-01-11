import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Users,
  Search,
  Ban,
  Eye,
  Mail,
  Loader2,
  CheckCircle,
  Shield,
  ShieldOff,
  Crown,
  Coins,
  Gift,
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface UserProfile {
  id: string;
  user_id: string;
  display_name: string | null;
  email: string | null;
  avatar_url: string | null;
  gender: string | null;
  age: number | null;
  location: string | null;
  is_verified: boolean | null;
  email_verified: boolean | null;
  is_online: boolean | null;
  created_at: string;
  is_banned?: boolean;
}

interface BanData {
  reason: string;
  description: string;
  duration: string;
}

interface GrantAccessData {
  tier: "premium" | "vip";
  duration: string;
  coins: number;
}

interface UserSubscription {
  tier: "free" | "premium" | "vip";
  is_active: boolean;
  current_period_end: string | null;
}

interface UserCoins {
  balance: number;
}

const AdminUsersTab = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [bannedUserIds, setBannedUserIds] = useState<Set<string>>(new Set());
  const [userSubscriptions, setUserSubscriptions] = useState<Record<string, UserSubscription>>({});
  const [userCoins, setUserCoins] = useState<Record<string, UserCoins>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [showBanDialog, setShowBanDialog] = useState(false);
  const [showGrantAccessDialog, setShowGrantAccessDialog] = useState(false);
  const [banData, setBanData] = useState<BanData>({
    reason: "",
    description: "",
    duration: "permanent",
  });
  const [grantAccessData, setGrantAccessData] = useState<GrantAccessData>({
    tier: "premium",
    duration: "30",
    coins: 0,
  });
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      // Fetch all profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch banned users
      const { data: bansData, error: bansError } = await supabase
        .from("banned_users")
        .select("user_id")
        .eq("is_active", true);

      if (bansError) throw bansError;

      // Fetch all subscriptions
      const { data: subsData } = await supabase
        .from("user_subscriptions")
        .select("user_id, tier, is_active, current_period_end");

      // Fetch all coins
      const { data: coinsData } = await supabase
        .from("user_coins")
        .select("user_id, balance");

      const bannedIds = new Set((bansData || []).map((b) => b.user_id));
      setBannedUserIds(bannedIds);

      // Build subscriptions map
      const subsMap: Record<string, UserSubscription> = {};
      (subsData || []).forEach((s) => {
        subsMap[s.user_id] = {
          tier: s.tier,
          is_active: s.is_active,
          current_period_end: s.current_period_end,
        };
      });
      setUserSubscriptions(subsMap);

      // Build coins map
      const coinsMap: Record<string, UserCoins> = {};
      (coinsData || []).forEach((c) => {
        coinsMap[c.user_id] = { balance: c.balance };
      });
      setUserCoins(coinsMap);

      setUsers(
        (profilesData || []).map((p) => ({
          ...p,
          is_banned: bannedIds.has(p.user_id),
        }))
      );
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Erreur lors du chargement des utilisateurs");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBanUser = async () => {
    if (!selectedUser || !currentUser || !banData.reason) return;

    setIsProcessing(true);
    try {
      const expiresAt =
        banData.duration === "permanent"
          ? null
          : banData.duration === "7days"
          ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
          : banData.duration === "30days"
          ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
          : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      const { error } = await supabase.from("banned_users").insert({
        user_id: selectedUser.user_id,
        banned_by: currentUser.id,
        reason: banData.reason,
        description: banData.description || null,
        is_permanent: banData.duration === "permanent",
        expires_at: expiresAt,
      });

      if (error) throw error;

      setBannedUserIds((prev) => new Set([...prev, selectedUser.user_id]));
      setUsers((prev) =>
        prev.map((u) =>
          u.user_id === selectedUser.user_id ? { ...u, is_banned: true } : u
        )
      );

      toast.success(`${selectedUser.display_name || "Utilisateur"} a été banni`);
      setShowBanDialog(false);
      setBanData({ reason: "", description: "", duration: "permanent" });
      setSelectedUser(null);
    } catch (error) {
      console.error("Error banning user:", error);
      toast.error("Erreur lors du bannissement");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUnbanUser = async (userProfile: UserProfile) => {
    if (!currentUser) return;

    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from("banned_users")
        .update({
          is_active: false,
          unbanned_at: new Date().toISOString(),
          unbanned_by: currentUser.id,
        })
        .eq("user_id", userProfile.user_id)
        .eq("is_active", true);

      if (error) throw error;

      setBannedUserIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(userProfile.user_id);
        return newSet;
      });
      setUsers((prev) =>
        prev.map((u) =>
          u.user_id === userProfile.user_id ? { ...u, is_banned: false } : u
        )
      );

      toast.success(`${userProfile.display_name || "Utilisateur"} a été débanni`);
    } catch (error) {
      console.error("Error unbanning user:", error);
      toast.error("Erreur lors du débannissement");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGrantAccess = async () => {
    if (!selectedUser || !currentUser) return;

    setIsProcessing(true);
    try {
      const durationDays = parseInt(grantAccessData.duration);
      const periodEnd = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();

      // Check if subscription exists
      const existingSub = userSubscriptions[selectedUser.user_id];

      if (existingSub) {
        // Update existing subscription
        const { error } = await supabase
          .from("user_subscriptions")
          .update({
            tier: grantAccessData.tier,
            is_active: true,
            current_period_start: new Date().toISOString(),
            current_period_end: periodEnd,
          })
          .eq("user_id", selectedUser.user_id);

        if (error) throw error;
      } else {
        // Insert new subscription
        const { error } = await supabase.from("user_subscriptions").insert({
          user_id: selectedUser.user_id,
          tier: grantAccessData.tier,
          is_active: true,
          current_period_start: new Date().toISOString(),
          current_period_end: periodEnd,
        });

        if (error) throw error;
      }

      // Update local state
      setUserSubscriptions((prev) => ({
        ...prev,
        [selectedUser.user_id]: {
          tier: grantAccessData.tier,
          is_active: true,
          current_period_end: periodEnd,
        },
      }));

      // Handle coins if amount > 0
      if (grantAccessData.coins > 0) {
        const existingCoins = userCoins[selectedUser.user_id];

        if (existingCoins) {
          const { error } = await supabase
            .from("user_coins")
            .update({
              balance: existingCoins.balance + grantAccessData.coins,
              total_earned: grantAccessData.coins,
            })
            .eq("user_id", selectedUser.user_id);

          if (error) throw error;

          setUserCoins((prev) => ({
            ...prev,
            [selectedUser.user_id]: {
              balance: existingCoins.balance + grantAccessData.coins,
            },
          }));
        } else {
          const { error } = await supabase.from("user_coins").insert({
            user_id: selectedUser.user_id,
            balance: grantAccessData.coins,
            total_earned: grantAccessData.coins,
          });

          if (error) throw error;

          setUserCoins((prev) => ({
            ...prev,
            [selectedUser.user_id]: { balance: grantAccessData.coins },
          }));
        }
      }

      toast.success(
        `Accès ${grantAccessData.tier.toUpperCase()} accordé à ${selectedUser.display_name || "l'utilisateur"} pour ${durationDays} jours${grantAccessData.coins > 0 ? ` + ${grantAccessData.coins} coins` : ""}`
      );

      setShowGrantAccessDialog(false);
      setGrantAccessData({ tier: "premium", duration: "30", coins: 0 });
      setSelectedUser(null);
    } catch (error) {
      console.error("Error granting access:", error);
      toast.error("Erreur lors de l'attribution de l'accès");
    } finally {
      setIsProcessing(false);
    }
  };

  const getSubscriptionBadge = (userId: string) => {
    const sub = userSubscriptions[userId];
    if (!sub || !sub.is_active || sub.tier === "free") return null;

    const isExpired = sub.current_period_end && new Date(sub.current_period_end) < new Date();
    if (isExpired) return null;

    const daysLeft = sub.current_period_end
      ? Math.ceil((new Date(sub.current_period_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null;

    return (
      <Badge className={sub.tier === "vip" ? "bg-yellow-500/20 text-yellow-400" : "bg-purple-500/20 text-purple-400"}>
        <Crown className="w-3 h-3 mr-1" />
        {sub.tier.toUpperCase()}
        {daysLeft !== null && ` (${daysLeft}j)`}
      </Badge>
    );
  };

  const getCoinsBadge = (userId: string) => {
    const coins = userCoins[userId];
    if (!coins || coins.balance === 0) return null;

    return (
      <Badge className="bg-amber-500/20 text-amber-400">
        <Coins className="w-3 h-3 mr-1" />
        {coins.balance}
      </Badge>
    );
  };

  const filteredUsers = users.filter((user) => {
    const query = searchQuery.toLowerCase();
    return (
      (user.display_name?.toLowerCase().includes(query) || false) ||
      (user.email?.toLowerCase().includes(query) || false) ||
      (user.location?.toLowerCase().includes(query) || false)
    );
  });

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
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher un utilisateur..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Users Table */}
      <Card className="glass-strong">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Utilisateurs ({filteredUsers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Utilisateur</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Genre</TableHead>
                  <TableHead>Localisation</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((profile) => (
                  <TableRow key={profile.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={profile.avatar_url || undefined} />
                          <AvatarFallback>
                            {profile.display_name?.[0]?.toUpperCase() || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">
                            {profile.display_name || "Sans nom"}
                          </p>
                          {profile.age && (
                            <p className="text-xs text-muted-foreground">
                              {profile.age} ans
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      <div className="flex items-center gap-1">
                        {profile.email || "-"}
                        {profile.email_verified && (
                          <CheckCircle className="w-3 h-3 text-green-500" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm capitalize">
                      {profile.gender || "-"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {profile.location || "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {profile.is_banned ? (
                          <Badge className="bg-red-500/20 text-red-400">
                            Banni
                          </Badge>
                        ) : profile.is_online ? (
                          <Badge className="bg-green-500/20 text-green-400">
                            En ligne
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Hors ligne</Badge>
                        )}
                        {profile.is_verified && (
                          <Badge className="bg-blue-500/20 text-blue-400">
                            Vérifié
                          </Badge>
                        )}
                        {getSubscriptionBadge(profile.user_id)}
                        {getCoinsBadge(profile.user_id)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={() => setSelectedUser(profile)}
                          title="Voir détails"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-purple-500 hover:text-purple-400"
                          onClick={() => {
                            setSelectedUser(profile);
                            setShowGrantAccessDialog(true);
                          }}
                          title="Accorder accès Premium/VIP"
                        >
                          <Gift className="w-4 h-4" />
                        </Button>
                        {profile.is_banned ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-green-500 hover:text-green-400"
                            onClick={() => handleUnbanUser(profile)}
                            disabled={isProcessing}
                            title="Débannir"
                          >
                            <ShieldOff className="w-4 h-4" />
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-400"
                            onClick={() => {
                              setSelectedUser(profile);
                              setShowBanDialog(true);
                            }}
                            title="Bannir"
                          >
                            <Ban className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* User Detail Dialog */}
      <Dialog
        open={!!selectedUser && !showBanDialog}
        onOpenChange={() => setSelectedUser(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Détails de l'utilisateur</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="w-16 h-16">
                  <AvatarImage src={selectedUser.avatar_url || undefined} />
                  <AvatarFallback className="text-xl">
                    {selectedUser.display_name?.[0]?.toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold text-lg">
                    {selectedUser.display_name || "Sans nom"}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedUser.email || "Pas d'email"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Genre</p>
                  <p className="capitalize">{selectedUser.gender || "-"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Âge</p>
                  <p>{selectedUser.age ? `${selectedUser.age} ans` : "-"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Localisation</p>
                  <p>{selectedUser.location || "-"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Inscrit le</p>
                  <p>
                    {new Date(selectedUser.created_at).toLocaleDateString("fr-FR")}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {selectedUser.is_verified && (
                  <Badge className="bg-blue-500/20 text-blue-400">
                    <Shield className="w-3 h-3 mr-1" />
                    Identité vérifiée
                  </Badge>
                )}
                {selectedUser.email_verified && (
                  <Badge className="bg-green-500/20 text-green-400">
                    <Mail className="w-3 h-3 mr-1" />
                    Email vérifié
                  </Badge>
                )}
                {selectedUser.is_banned && (
                  <Badge className="bg-red-500/20 text-red-400">
                    <Ban className="w-3 h-3 mr-1" />
                    Banni
                  </Badge>
                )}
              </div>

              {/* Subscription Info */}
              {userSubscriptions[selectedUser.user_id] && userSubscriptions[selectedUser.user_id].tier !== "free" && (
                <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Crown className="w-4 h-4 text-purple-400" />
                    <span className="font-medium text-purple-400">
                      Abonnement {userSubscriptions[selectedUser.user_id].tier.toUpperCase()}
                    </span>
                  </div>
                  {userSubscriptions[selectedUser.user_id].current_period_end && (
                    <p className="text-sm text-muted-foreground">
                      Expire le:{" "}
                      {new Date(userSubscriptions[selectedUser.user_id].current_period_end!).toLocaleDateString("fr-FR")}
                    </p>
                  )}
                </div>
              )}

              {/* Coins Info */}
              {userCoins[selectedUser.user_id] && (
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <div className="flex items-center gap-2">
                    <Coins className="w-4 h-4 text-amber-400" />
                    <span className="font-medium text-amber-400">
                      {userCoins[selectedUser.user_id].balance} coins
                    </span>
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowGrantAccessDialog(true);
                  }}
                >
                  <Gift className="w-4 h-4 mr-2" />
                  Accorder accès
                </Button>
                {!selectedUser.is_banned && (
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={() => setShowBanDialog(true)}
                  >
                    <Ban className="w-4 h-4 mr-2" />
                    Bannir
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Ban Dialog */}
      <Dialog open={showBanDialog} onOpenChange={setShowBanDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bannir l'utilisateur</DialogTitle>
            <DialogDescription>
              Bannir {selectedUser?.display_name || "cet utilisateur"} de la
              plateforme.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Raison du bannissement</Label>
              <Select
                value={banData.reason}
                onValueChange={(value) =>
                  setBanData((prev) => ({ ...prev, reason: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une raison" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="harassment">Harcèlement</SelectItem>
                  <SelectItem value="inappropriate">Contenu inapproprié</SelectItem>
                  <SelectItem value="spam">Spam</SelectItem>
                  <SelectItem value="fake">Faux profil</SelectItem>
                  <SelectItem value="scam">Arnaque</SelectItem>
                  <SelectItem value="violence">Violence/Menaces</SelectItem>
                  <SelectItem value="other">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Durée du bannissement</Label>
              <Select
                value={banData.duration}
                onValueChange={(value) =>
                  setBanData((prev) => ({ ...prev, duration: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1day">24 heures</SelectItem>
                  <SelectItem value="7days">7 jours</SelectItem>
                  <SelectItem value="30days">30 jours</SelectItem>
                  <SelectItem value="permanent">Permanent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Description (optionnel)</Label>
              <Textarea
                placeholder="Détails supplémentaires..."
                value={banData.description}
                onChange={(e) =>
                  setBanData((prev) => ({ ...prev, description: e.target.value }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBanDialog(false)}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleBanUser}
              disabled={!banData.reason || isProcessing}
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Ban className="w-4 h-4 mr-2" />
              )}
              Confirmer le ban
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Grant Access Dialog */}
      <Dialog open={showGrantAccessDialog} onOpenChange={setShowGrantAccessDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-purple-400" />
              Accorder un accès Premium/VIP
            </DialogTitle>
            <DialogDescription>
              Donnez un accès illimité à {selectedUser?.display_name || "cet utilisateur"}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Type d'abonnement</Label>
              <Select
                value={grantAccessData.tier}
                onValueChange={(value: "premium" | "vip") =>
                  setGrantAccessData((prev) => ({ ...prev, tier: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="premium">
                    <div className="flex items-center gap-2">
                      <Crown className="w-4 h-4 text-purple-400" />
                      Premium
                    </div>
                  </SelectItem>
                  <SelectItem value="vip">
                    <div className="flex items-center gap-2">
                      <Crown className="w-4 h-4 text-yellow-400" />
                      VIP
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Durée (en jours)</Label>
              <Select
                value={grantAccessData.duration}
                onValueChange={(value) =>
                  setGrantAccessData((prev) => ({ ...prev, duration: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 jours</SelectItem>
                  <SelectItem value="30">30 jours</SelectItem>
                  <SelectItem value="90">90 jours</SelectItem>
                  <SelectItem value="180">6 mois (180 jours)</SelectItem>
                  <SelectItem value="365">1 an (365 jours)</SelectItem>
                  <SelectItem value="3650">Illimité (10 ans)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Bonus de coins (optionnel)</Label>
              <Input
                type="number"
                placeholder="0"
                min="0"
                value={grantAccessData.coins || ""}
                onChange={(e) =>
                  setGrantAccessData((prev) => ({
                    ...prev,
                    coins: parseInt(e.target.value) || 0,
                  }))
                }
              />
              <p className="text-xs text-muted-foreground mt-1">
                Ces coins seront ajoutés au solde de l'utilisateur
              </p>
            </div>

            {/* Current Status */}
            {selectedUser && (
              <div className="p-3 rounded-lg bg-muted/50 space-y-2">
                <p className="text-sm font-medium">Statut actuel :</p>
                <div className="flex flex-wrap gap-2">
                  {userSubscriptions[selectedUser.user_id] ? (
                    <Badge
                      className={
                        userSubscriptions[selectedUser.user_id].tier === "vip"
                          ? "bg-yellow-500/20 text-yellow-400"
                          : userSubscriptions[selectedUser.user_id].tier === "premium"
                          ? "bg-purple-500/20 text-purple-400"
                          : "bg-muted"
                      }
                    >
                      {userSubscriptions[selectedUser.user_id].tier.toUpperCase()}
                    </Badge>
                  ) : (
                    <Badge variant="secondary">FREE</Badge>
                  )}
                  {userCoins[selectedUser.user_id] && (
                    <Badge className="bg-amber-500/20 text-amber-400">
                      <Coins className="w-3 h-3 mr-1" />
                      {userCoins[selectedUser.user_id].balance} coins
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGrantAccessDialog(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleGrantAccess}
              disabled={isProcessing}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Gift className="w-4 h-4 mr-2" />
              )}
              Accorder l'accès
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default AdminUsersTab;
