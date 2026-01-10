import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flag, X, AlertTriangle, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportedUserId: string;
  sessionId?: string;
}

const reportReasons = [
  { id: "harassment", label: "Harcèlement", emoji: "😠" },
  { id: "inappropriate", label: "Contenu inapproprié", emoji: "🔞" },
  { id: "spam", label: "Spam / Publicité", emoji: "📢" },
  { id: "fake_profile", label: "Faux profil", emoji: "🎭" },
  { id: "other", label: "Autre", emoji: "❓" },
];

const ReportModal = ({ isOpen, onClose, reportedUserId, sessionId }: ReportModalProps) => {
  const { user } = useAuth();
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selectedReason || !user) return;
    
    setIsSubmitting(true);
    
    try {
      const { error } = await supabase.from("user_reports").insert({
        reporter_id: user.id,
        reported_id: reportedUserId,
        session_id: sessionId || null,
        reason: selectedReason,
        description: description.trim() || null,
      });
      
      if (error) throw error;
      
      toast.success("Signalement envoyé", {
        description: "Merci pour votre signalement. Notre équipe l'examinera rapidement.",
      });
      
      onClose();
      setSelectedReason(null);
      setDescription("");
    } catch (error) {
      console.error("Error submitting report:", error);
      toast.error("Erreur", {
        description: "Impossible d'envoyer le signalement. Veuillez réessayer.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-background rounded-t-3xl p-6 pb-10"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                </div>
                <h2 className="text-xl font-bold text-foreground">Signaler</h2>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full glass flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Reason selection */}
            <div className="space-y-3 mb-6">
              <p className="text-sm text-muted-foreground">
                Pourquoi signalez-vous cet utilisateur ?
              </p>
              <div className="grid grid-cols-1 gap-2">
                {reportReasons.map((reason) => (
                  <button
                    key={reason.id}
                    onClick={() => setSelectedReason(reason.id)}
                    className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                      selectedReason === reason.id
                        ? "bg-destructive/20 border-2 border-destructive"
                        : "glass hover:bg-muted"
                    }`}
                  >
                    <span className="text-xl">{reason.emoji}</span>
                    <span className="font-medium text-foreground">{reason.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2 mb-6">
              <p className="text-sm text-muted-foreground">
                Description (optionnel)
              </p>
              <Textarea
                placeholder="Décrivez ce qui s'est passé..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="resize-none"
                rows={3}
              />
            </div>

            {/* Submit button */}
            <Button
              onClick={handleSubmit}
              disabled={!selectedReason || isSubmitting}
              className="w-full bg-destructive hover:bg-destructive/90 text-destructive-foreground gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Envoi en cours...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Envoyer le signalement
                </>
              )}
            </Button>

            <p className="text-xs text-muted-foreground text-center mt-4">
              Les signalements abusifs peuvent entraîner des sanctions sur votre compte.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ReportModal;
