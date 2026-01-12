import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  Trash2,
  Check,
  Mail,
  Smartphone,
  Filter,
  RefreshCw,
  User,
  Users,
  Clock,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface AdminNotification {
  id: string;
  title: string;
  message: string;
  notification_type: string;
  recipient_type: string;
  recipient_id: string | null;
  sender_id: string;
  is_email: boolean;
  is_push: boolean;
  email_sent_at: string | null;
  push_sent_at: string | null;
  created_at: string;
  sender_profile?: { display_name: string | null };
  recipient_profile?: { display_name: string | null };
}

const AdminNotificationsTab = () => {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from("admin_notifications")
        .select("*")
        .order("created_at", { ascending: false });

      if (filter !== "all") {
        query = query.eq("notification_type", filter);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Fetch profiles for senders and recipients
      const notificationsWithProfiles = await Promise.all(
        (data || []).map(async (notification) => {
          const [senderRes, recipientRes] = await Promise.all([
            supabase
              .from("profiles")
              .select("display_name")
              .eq("user_id", notification.sender_id)
              .maybeSingle(),
            notification.recipient_id
              ? supabase
                  .from("profiles")
                  .select("display_name")
                  .eq("user_id", notification.recipient_id)
                  .maybeSingle()
              : Promise.resolve({ data: null }),
          ]);

          return {
            ...notification,
            sender_profile: senderRes.data,
            recipient_profile: recipientRes.data,
          };
        })
      );

      setNotifications(notificationsWithProfiles);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      toast.error("Erreur lors du chargement des notifications");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [filter]);

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("admin_notifications")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setNotifications((prev) => prev.filter((n) => n.id !== id));
      toast.success("Notification supprimée");
    } catch (error) {
      console.error("Error deleting notification:", error);
      toast.error("Erreur lors de la suppression");
    }
  };

  const handleDeleteAll = async () => {
    try {
      const { error } = await supabase.from("admin_notifications").delete().neq("id", "");

      if (error) throw error;

      setNotifications([]);
      toast.success("Toutes les notifications ont été supprimées");
    } catch (error) {
      console.error("Error deleting all notifications:", error);
      toast.error("Erreur lors de la suppression");
    }
  };

  const getNotificationTypeLabel = (type: string) => {
    const types: Record<string, { label: string; color: string }> = {
      announcement: { label: "Annonce", color: "bg-blue-500" },
      warning: { label: "Avertissement", color: "bg-amber-500" },
      system: { label: "Système", color: "bg-slate-500" },
      promotion: { label: "Promotion", color: "bg-green-500" },
      identity_verification: { label: "Vérification", color: "bg-purple-500" },
    };
    return types[type] || { label: type, color: "bg-gray-500" };
  };

  const getRecipientLabel = (notification: AdminNotification) => {
    if (notification.recipient_type === "all") {
      return (
        <span className="flex items-center gap-1">
          <Users className="w-3 h-3" />
          Tous les utilisateurs
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1">
        <User className="w-3 h-3" />
        {notification.recipient_profile?.display_name || "Utilisateur inconnu"}
      </span>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            <CardTitle>Historique des Notifications</CardTitle>
          </div>

          <div className="flex items-center gap-2">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filtrer par type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                <SelectItem value="announcement">Annonces</SelectItem>
                <SelectItem value="warning">Avertissements</SelectItem>
                <SelectItem value="system">Système</SelectItem>
                <SelectItem value="promotion">Promotions</SelectItem>
                <SelectItem value="identity_verification">Vérifications</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" size="icon" onClick={fetchNotifications}>
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            </Button>

            {notifications.length > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Tout supprimer
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                    <AlertDialogDescription>
                      Êtes-vous sûr de vouloir supprimer toutes les notifications ?
                      Cette action est irréversible.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteAll}>
                      Supprimer tout
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Aucune notification trouvée</p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {notifications.map((notification) => {
                const typeInfo = getNotificationTypeLabel(notification.notification_type);
                return (
                  <motion.div
                    key={notification.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    layout
                    className="border border-border rounded-lg p-4 bg-card hover:bg-accent/5 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <Badge className={`${typeInfo.color} text-white`}>
                            {typeInfo.label}
                          </Badge>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {format(new Date(notification.created_at), "dd MMM yyyy HH:mm", { locale: fr })}
                          </span>
                        </div>

                        <h4 className="font-semibold text-foreground mb-1">
                          {notification.title}
                        </h4>
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                          {notification.message}
                        </p>

                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>Destinataire: {getRecipientLabel(notification)}</span>
                          <span>Expéditeur: {notification.sender_profile?.display_name || "Admin"}</span>
                        </div>

                        <div className="flex items-center gap-3 mt-2">
                          {notification.is_email && (
                            <span className="flex items-center gap-1 text-xs">
                              <Mail className="w-3 h-3" />
                              {notification.email_sent_at ? (
                                <span className="text-green-600 flex items-center gap-1">
                                  <CheckCircle className="w-3 h-3" />
                                  Envoyé
                                </span>
                              ) : (
                                <span className="text-amber-600 flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3" />
                                  En attente
                                </span>
                              )}
                            </span>
                          )}
                          {notification.is_push && (
                            <span className="flex items-center gap-1 text-xs">
                              <Smartphone className="w-3 h-3" />
                              {notification.push_sent_at ? (
                                <span className="text-green-600 flex items-center gap-1">
                                  <CheckCircle className="w-3 h-3" />
                                  Envoyé
                                </span>
                              ) : (
                                <span className="text-amber-600 flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3" />
                                  En attente
                                </span>
                              )}
                            </span>
                          )}
                        </div>
                      </div>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Supprimer cette notification ?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Cette action est irréversible.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(notification.id)}>
                              Supprimer
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminNotificationsTab;
