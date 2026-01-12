import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Eye, 
  User, 
  FileImage,
  Loader2,
  AlertCircle,
  ExternalLink,
  RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface IdentityVerification {
  id: string;
  user_id: string;
  id_photo_url: string;
  selfie_url: string;
  status: "pending" | "approved" | "rejected";
  rejection_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  profile?: {
    display_name: string | null;
    avatar_url: string | null;
    email: string | null;
  };
}

const AdminIdentityTab = () => {
  const { user } = useAuth();
  const [verifications, setVerifications] = useState<IdentityVerification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedVerification, setSelectedVerification] = useState<IdentityVerification | null>(null);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");

  const fetchVerifications = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from("identity_verifications")
        .select("*")
        .order("created_at", { ascending: false });

      if (filter !== "all") {
        query = query.eq("status", filter);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Fetch profiles for each verification
      const verificationsWithProfiles = await Promise.all(
        (data || []).map(async (v) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("display_name, avatar_url, email")
            .eq("user_id", v.user_id)
            .maybeSingle();

          return { ...v, profile } as IdentityVerification;
        })
      );

      setVerifications(verificationsWithProfiles);
    } catch (error) {
      console.error("Error fetching verifications:", error);
      toast.error("Erreur lors du chargement des vérifications");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVerifications();
  }, [filter]);

  const handleReview = async (approved: boolean) => {
    if (!selectedVerification || !user) return;

    setIsProcessing(true);
    try {
      // Update verification status
      const { error: verificationError } = await supabase
        .from("identity_verifications")
        .update({
          status: approved ? "approved" : "rejected",
          rejection_reason: approved ? null : rejectionReason || "Document non conforme",
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", selectedVerification.id);

      if (verificationError) throw verificationError;

      // Update profile verification status
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          identity_verification_status: approved ? "approved" : "rejected",
          is_verified: approved,
        })
        .eq("user_id", selectedVerification.user_id);

      if (profileError) throw profileError;

      toast.success(
        approved
          ? "Identité approuvée avec succès"
          : "Demande refusée"
      );

      setIsReviewDialogOpen(false);
      setSelectedVerification(null);
      setRejectionReason("");
      fetchVerifications();
    } catch (error) {
      console.error("Error updating verification:", error);
      toast.error("Erreur lors de la mise à jour");
    } finally {
      setIsProcessing(false);
    }
  };

  const openReviewDialog = (verification: IdentityVerification) => {
    setSelectedVerification(verification);
    setIsReviewDialogOpen(true);
    setRejectionReason("");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30"><Clock className="w-3 h-3 mr-1" />En attente</Badge>;
      case "approved":
        return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30"><CheckCircle className="w-3 h-3 mr-1" />Approuvé</Badge>;
      case "rejected":
        return <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30"><XCircle className="w-3 h-3 mr-1" />Refusé</Badge>;
      default:
        return null;
    }
  };

  const pendingCount = verifications.filter(v => v.status === "pending").length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Vérifications d'identité</h2>
          <p className="text-sm text-muted-foreground">
            {pendingCount > 0 ? `${pendingCount} demande(s) en attente` : "Aucune demande en attente"}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchVerifications}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Actualiser
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {(["pending", "approved", "rejected", "all"] as const).map((status) => (
          <Button
            key={status}
            variant={filter === status ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(status)}
          >
            {status === "pending" && <Clock className="w-3 h-3 mr-1" />}
            {status === "approved" && <CheckCircle className="w-3 h-3 mr-1" />}
            {status === "rejected" && <XCircle className="w-3 h-3 mr-1" />}
            {status === "all" && <User className="w-3 h-3 mr-1" />}
            {status === "pending" ? "En attente" : status === "approved" ? "Approuvés" : status === "rejected" ? "Refusés" : "Tous"}
          </Button>
        ))}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : verifications.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="w-12 h-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">Aucune vérification à afficher</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          <AnimatePresence>
            {verifications.map((verification, index) => (
              <motion.div
                key={verification.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="hover:border-primary/30 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      {/* Avatar */}
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                        {verification.profile?.avatar_url ? (
                          <img
                            src={verification.profile.avatar_url}
                            alt="Avatar"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <User className="w-6 h-6 text-muted-foreground" />
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">
                          {verification.profile?.display_name || "Utilisateur inconnu"}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">
                          {verification.profile?.email || verification.user_id}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Soumis le {new Date(verification.created_at).toLocaleDateString("fr-FR", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>

                      {/* Status */}
                      <div className="flex-shrink-0">
                        {getStatusBadge(verification.status)}
                      </div>

                      {/* Actions */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openReviewDialog(verification)}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Examiner
                      </Button>
                    </div>

                    {/* Rejection reason if rejected */}
                    {verification.status === "rejected" && verification.rejection_reason && (
                      <div className="mt-3 p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                        <p className="text-xs text-red-600">
                          <strong>Raison du refus :</strong> {verification.rejection_reason}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Review Dialog */}
      <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileImage className="w-5 h-5" />
              Vérification d'identité
            </DialogTitle>
          </DialogHeader>

          {selectedVerification && (
            <div className="space-y-6">
              {/* User info */}
              <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                  {selectedVerification.profile?.avatar_url ? (
                    <img
                      src={selectedVerification.profile.avatar_url}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-8 h-8 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <p className="font-semibold text-lg">
                    {selectedVerification.profile?.display_name || "Utilisateur"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {selectedVerification.profile?.email}
                  </p>
                  <div className="mt-1">
                    {getStatusBadge(selectedVerification.status)}
                  </div>
                </div>
              </div>

              {/* Documents */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium mb-2 flex items-center gap-2">
                    <FileImage className="w-4 h-4" />
                    Pièce d'identité
                  </p>
                  <div className="relative aspect-[3/2] rounded-lg overflow-hidden bg-muted border">
                    <img
                      src={selectedVerification.id_photo_url}
                      alt="Pièce d'identité"
                      className="w-full h-full object-contain"
                    />
                    <a
                      href={selectedVerification.id_photo_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute bottom-2 right-2 p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4 text-white" />
                    </a>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium mb-2 flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Selfie
                  </p>
                  <div className="relative aspect-[3/2] rounded-lg overflow-hidden bg-muted border">
                    <img
                      src={selectedVerification.selfie_url}
                      alt="Selfie"
                      className="w-full h-full object-contain"
                    />
                    <a
                      href={selectedVerification.selfie_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute bottom-2 right-2 p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4 text-white" />
                    </a>
                  </div>
                </div>
              </div>

              {/* Rejection reason input (only for pending) */}
              {selectedVerification.status === "pending" && (
                <div>
                  <p className="text-sm font-medium mb-2">Raison du refus (optionnel)</p>
                  <Textarea
                    placeholder="Ex: Photo floue, document illisible, visage non visible..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={2}
                  />
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            {selectedVerification?.status === "pending" && (
              <>
                <Button
                  variant="destructive"
                  onClick={() => handleReview(false)}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <XCircle className="w-4 h-4 mr-2" />
                  )}
                  Refuser
                </Button>
                <Button
                  onClick={() => handleReview(true)}
                  disabled={isProcessing}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isProcessing ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <CheckCircle className="w-4 h-4 mr-2" />
                  )}
                  Approuver
                </Button>
              </>
            )}
            <Button variant="outline" onClick={() => setIsReviewDialogOpen(false)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminIdentityTab;
