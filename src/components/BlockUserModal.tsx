import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Ban, X, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useBlockedUsers } from "@/hooks/useBlockedUsers";

interface BlockUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName?: string;
}

const blockReasons = [
  { id: "harassment", label: "Harcèlement", emoji: "😠" },
  { id: "inappropriate", label: "Contenu inapproprié", emoji: "🔞" },
  { id: "spam", label: "Spam / Publicité", emoji: "📢" },
  { id: "fake_profile", label: "Faux profil", emoji: "🎭" },
  { id: "unwanted", label: "Contact non souhaité", emoji: "🚫" },
];

const BlockUserModal = ({ isOpen, onClose, userId, userName }: BlockUserModalProps) => {
  const { blockUser } = useBlockedUsers();
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [additionalInfo, setAdditionalInfo] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selectedReason) return;
    
    setIsSubmitting(true);
    
    const reason = `${selectedReason}${additionalInfo ? `: ${additionalInfo}` : ""}`;
    const success = await blockUser(userId, reason);
    
    if (success) {
      onClose();
      setSelectedReason(null);
      setAdditionalInfo("");
    }
    
    setIsSubmitting(false);
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
      setSelectedReason(null);
      setAdditionalInfo("");
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[10000] flex items-end justify-center bg-black/60 backdrop-blur-sm"
          onClick={handleClose}
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
                  <Ban className="w-5 h-5 text-destructive" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">Bloquer</h2>
                  {userName && (
                    <p className="text-sm text-muted-foreground">{userName}</p>
                  )}
                </div>
              </div>
              <button
                onClick={handleClose}
                className="w-8 h-8 rounded-full glass flex items-center justify-center"
                disabled={isSubmitting}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Warning */}
            <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium text-foreground mb-1">
                    Cette action bloquera immédiatement cet utilisateur
                  </p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Il ne pourra plus vous voir ni vous contacter</li>
                    <li>Vous ne le verrez plus dans vos suggestions</li>
                    <li>Notre équipe sera notifiée pour examen</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Reason selection */}
            <div className="space-y-3 mb-6">
              <p className="text-sm text-muted-foreground">
                Pourquoi bloquez-vous cet utilisateur ?
              </p>
              <div className="grid grid-cols-1 gap-2">
                {blockReasons.map((reason) => (
                  <button
                    key={reason.id}
                    onClick={() => setSelectedReason(reason.id)}
                    className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                      selectedReason === reason.id
                        ? "bg-destructive/20 border-2 border-destructive"
                        : "glass hover:bg-muted"
                    }`}
                    disabled={isSubmitting}
                  >
                    <span className="text-xl">{reason.emoji}</span>
                    <span className="font-medium text-foreground">{reason.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Additional info */}
            <div className="space-y-2 mb-6">
              <p className="text-sm text-muted-foreground">
                Informations supplémentaires (optionnel)
              </p>
              <Textarea
                placeholder="Décrivez brièvement le problème..."
                value={additionalInfo}
                onChange={(e) => setAdditionalInfo(e.target.value)}
                className="resize-none"
                rows={2}
                disabled={isSubmitting}
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
                  Blocage en cours...
                </>
              ) : (
                <>
                  <Ban className="w-4 h-4" />
                  Bloquer cet utilisateur
                </>
              )}
            </Button>

            <p className="text-xs text-muted-foreground text-center mt-4">
              Vous pourrez débloquer cet utilisateur depuis vos paramètres.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default BlockUserModal;
