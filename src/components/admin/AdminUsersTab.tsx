import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Users,
  Search,
  Ban,
  Eye,
  Mail,
  Bell,
  Loader2,
  CheckCircle,
  XCircle,
  Shield,
  ShieldOff,
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

const AdminUsersTab = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [bannedUserIds, setBannedUserIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [showBanDialog, setShowBanDialog] = useState(false);
  const [banData, setBanData] = useState<BanData>({
    reason: "",
    description: "",
    duration: "permanent",
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

      const bannedIds = new Set((bansData || []).map((b) => b.user_id));
      setBannedUserIds(bannedIds);

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
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={() => setSelectedUser(profile)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {profile.is_banned ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-green-500 hover:text-green-400"
                            onClick={() => handleUnbanUser(profile)}
                            disabled={isProcessing}
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

              <div className="flex gap-2 pt-4">
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
    </motion.div>
  );
};

export default AdminUsersTab;
