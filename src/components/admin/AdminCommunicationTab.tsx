import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Mail,
  Bell,
  MessageSquare,
  Send,
  Plus,
  Trash2,
  Edit,
  Loader2,
  Users,
  User,
  Save,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

interface PredefinedMessage {
  id: string;
  title: string;
  message: string;
  category: string;
  is_active: boolean;
  created_at: string;
}

interface UserProfile {
  id: string;
  user_id: string;
  display_name: string | null;
  email: string | null;
}

const AdminCommunicationTab = () => {
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState("send");
  const [predefinedMessages, setPredefinedMessages] = useState<PredefinedMessage[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  // Send message form
  const [recipientType, setRecipientType] = useState<"all" | "individual">("individual");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [messageTitle, setMessageTitle] = useState("");
  const [messageContent, setMessageContent] = useState("");
  const [sendEmail, setSendEmail] = useState(false);
  const [sendPush, setSendPush] = useState(true);
  const [notificationType, setNotificationType] = useState("info");

  // Predefined message form
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [editingMessage, setEditingMessage] = useState<PredefinedMessage | null>(null);
  const [newMessageTitle, setNewMessageTitle] = useState("");
  const [newMessageContent, setNewMessageContent] = useState("");
  const [newMessageCategory, setNewMessageCategory] = useState("general");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [messagesRes, usersRes] = await Promise.all([
        supabase
          .from("predefined_messages")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from("profiles")
          .select("id, user_id, display_name, email")
          .order("display_name"),
      ]);

      if (messagesRes.error) throw messagesRes.error;
      if (usersRes.error) throw usersRes.error;

      setPredefinedMessages(messagesRes.data || []);
      setUsers(usersRes.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Erreur lors du chargement des données");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendNotification = async () => {
    if (!currentUser || !messageTitle || !messageContent) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }

    if (recipientType === "individual" && !selectedUserId) {
      toast.error("Veuillez sélectionner un destinataire");
      return;
    }

    setIsSending(true);
    try {
      const { error } = await supabase.from("admin_notifications").insert({
        sender_id: currentUser.id,
        recipient_id: recipientType === "individual" ? selectedUserId : null,
        recipient_type: recipientType,
        title: messageTitle,
        message: messageContent,
        notification_type: notificationType,
        is_email: sendEmail,
        is_push: sendPush,
        email_sent_at: sendEmail ? new Date().toISOString() : null,
        push_sent_at: sendPush ? new Date().toISOString() : null,
      });

      if (error) throw error;

      toast.success(
        recipientType === "all"
          ? "Notification envoyée à tous les utilisateurs"
          : "Notification envoyée avec succès"
      );

      // Reset form
      setMessageTitle("");
      setMessageContent("");
      setSelectedUserId("");
      setSendEmail(false);
      setSendPush(true);
    } catch (error) {
      console.error("Error sending notification:", error);
      toast.error("Erreur lors de l'envoi");
    } finally {
      setIsSending(false);
    }
  };

  const handleSavePredefinedMessage = async () => {
    if (!currentUser || !newMessageTitle || !newMessageContent) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }

    try {
      if (editingMessage) {
        const { error } = await supabase
          .from("predefined_messages")
          .update({
            title: newMessageTitle,
            message: newMessageContent,
            category: newMessageCategory,
          })
          .eq("id", editingMessage.id);

        if (error) throw error;

        setPredefinedMessages((prev) =>
          prev.map((m) =>
            m.id === editingMessage.id
              ? {
                  ...m,
                  title: newMessageTitle,
                  message: newMessageContent,
                  category: newMessageCategory,
                }
              : m
          )
        );
        toast.success("Message modifié");
      } else {
        const { data, error } = await supabase
          .from("predefined_messages")
          .insert({
            title: newMessageTitle,
            message: newMessageContent,
            category: newMessageCategory,
            created_by: currentUser.id,
          })
          .select()
          .single();

        if (error) throw error;

        setPredefinedMessages((prev) => [data, ...prev]);
        toast.success("Message créé");
      }

      setShowMessageDialog(false);
      resetMessageForm();
    } catch (error) {
      console.error("Error saving message:", error);
      toast.error("Erreur lors de la sauvegarde");
    }
  };

  const handleDeleteMessage = async (id: string) => {
    try {
      const { error } = await supabase
        .from("predefined_messages")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setPredefinedMessages((prev) => prev.filter((m) => m.id !== id));
      toast.success("Message supprimé");
    } catch (error) {
      console.error("Error deleting message:", error);
      toast.error("Erreur lors de la suppression");
    }
  };

  const handleUsePredefinedMessage = (message: PredefinedMessage) => {
    setMessageTitle(message.title);
    setMessageContent(message.message);
    setActiveTab("send");
    toast.success("Message prédéfini chargé");
  };

  const resetMessageForm = () => {
    setNewMessageTitle("");
    setNewMessageContent("");
    setNewMessageCategory("general");
    setEditingMessage(null);
  };

  const openEditDialog = (message: PredefinedMessage) => {
    setEditingMessage(message);
    setNewMessageTitle(message.title);
    setNewMessageContent(message.message);
    setNewMessageCategory(message.category);
    setShowMessageDialog(true);
  };

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
    >
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="send" className="flex items-center gap-2">
            <Send className="w-4 h-4" />
            Envoyer
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Messages prédéfinis
          </TabsTrigger>
        </TabsList>

        {/* Send Notification Tab */}
        <TabsContent value="send">
          <Card className="glass-strong">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary" />
                Envoyer une notification
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Recipient Type */}
              <div className="flex gap-4">
                <Button
                  variant={recipientType === "individual" ? "default" : "outline"}
                  onClick={() => setRecipientType("individual")}
                  className="flex-1"
                >
                  <User className="w-4 h-4 mr-2" />
                  Individuel
                </Button>
                <Button
                  variant={recipientType === "all" ? "default" : "outline"}
                  onClick={() => setRecipientType("all")}
                  className="flex-1"
                >
                  <Users className="w-4 h-4 mr-2" />
                  Tous les utilisateurs
                </Button>
              </div>

              {/* Individual User Select */}
              {recipientType === "individual" && (
                <div>
                  <Label>Destinataire</Label>
                  <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un utilisateur" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.user_id} value={user.user_id}>
                          {user.display_name || user.email || "Sans nom"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Notification Type */}
              <div>
                <Label>Type de notification</Label>
                <Select value={notificationType} onValueChange={setNotificationType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">Information</SelectItem>
                    <SelectItem value="warning">Avertissement</SelectItem>
                    <SelectItem value="success">Succès</SelectItem>
                    <SelectItem value="promo">Promotion</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Title */}
              <div>
                <Label>Titre</Label>
                <Input
                  placeholder="Titre de la notification"
                  value={messageTitle}
                  onChange={(e) => setMessageTitle(e.target.value)}
                />
              </div>

              {/* Message */}
              <div>
                <Label>Message</Label>
                <Textarea
                  placeholder="Contenu du message..."
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  rows={4}
                />
              </div>

              {/* Channels */}
              <div className="flex gap-6">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={sendPush}
                    onCheckedChange={setSendPush}
                    id="push"
                  />
                  <Label htmlFor="push" className="flex items-center gap-1">
                    <Bell className="w-4 h-4" />
                    Push
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={sendEmail}
                    onCheckedChange={setSendEmail}
                    id="email"
                  />
                  <Label htmlFor="email" className="flex items-center gap-1">
                    <Mail className="w-4 h-4" />
                    Email
                  </Label>
                </div>
              </div>

              <Button
                className="w-full"
                onClick={handleSendNotification}
                disabled={isSending || !messageTitle || !messageContent}
              >
                {isSending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                Envoyer
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Predefined Messages Tab */}
        <TabsContent value="templates">
          <Card className="glass-strong">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-primary" />
                Messages prédéfinis
              </CardTitle>
              <Button
                size="sm"
                onClick={() => {
                  resetMessageForm();
                  setShowMessageDialog(true);
                }}
              >
                <Plus className="w-4 h-4 mr-1" />
                Nouveau
              </Button>
            </CardHeader>
            <CardContent>
              {predefinedMessages.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Aucun message prédéfini</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {predefinedMessages.map((message) => (
                    <div
                      key={message.id}
                      className="p-4 rounded-lg bg-background/50 border border-border/50"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium">{message.title}</h4>
                            <Badge variant="secondary" className="text-xs">
                              {message.category}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {message.message}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={() => handleUsePredefinedMessage(message)}
                          >
                            <Send className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={() => openEditDialog(message)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-red-500"
                            onClick={() => handleDeleteMessage(message.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create/Edit Message Dialog */}
      <Dialog open={showMessageDialog} onOpenChange={setShowMessageDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingMessage ? "Modifier le message" : "Nouveau message prédéfini"}
            </DialogTitle>
            <DialogDescription>
              Créez un message réutilisable pour vos communications.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Catégorie</Label>
              <Select
                value={newMessageCategory}
                onValueChange={setNewMessageCategory}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">Général</SelectItem>
                  <SelectItem value="warning">Avertissement</SelectItem>
                  <SelectItem value="promo">Promotion</SelectItem>
                  <SelectItem value="update">Mise à jour</SelectItem>
                  <SelectItem value="welcome">Bienvenue</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Titre</Label>
              <Input
                placeholder="Titre du message"
                value={newMessageTitle}
                onChange={(e) => setNewMessageTitle(e.target.value)}
              />
            </div>

            <div>
              <Label>Message</Label>
              <Textarea
                placeholder="Contenu du message..."
                value={newMessageContent}
                onChange={(e) => setNewMessageContent(e.target.value)}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMessageDialog(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleSavePredefinedMessage}
              disabled={!newMessageTitle || !newMessageContent}
            >
              <Save className="w-4 h-4 mr-2" />
              {editingMessage ? "Modifier" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default AdminCommunicationTab;
