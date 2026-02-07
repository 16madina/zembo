import { motion, AnimatePresence } from "framer-motion";
import { Crown, Sparkles, Phone, X, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTier: "free" | "premium" | "vip";
}

const UpgradeModal = ({ isOpen, onClose, currentTier }: UpgradeModalProps) => {
  const navigate = useNavigate();

  const handleUpgrade = (plan: "gold" | "platinum") => {
    onClose();
    navigate("/subscriptions", { state: { selectedPlan: plan } });
  };

  // Don't show if already VIP
  if (currentTier === "vip") return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md border-primary/20 bg-gradient-to-b from-background to-background/95">
        <DialogHeader>
          <DialogTitle className="text-center flex flex-col items-center gap-3">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.1 }}
              className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center"
            >
              <Phone className="w-8 h-8 text-primary" />
            </motion.div>
            <span className="text-xl font-bold">Limite d'appels atteinte</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-center text-muted-foreground text-sm">
            {currentTier === "free" 
              ? "Tu as utilisé ton appel gratuit du jour. Passe à Gold ou Platinum pour plus d'appels !"
              : "Tu as utilisé tes 5 appels Gold du jour. Passe à Platinum pour des appels illimités !"
            }
          </p>

          <div className="space-y-3">
            {/* Gold Option - Only show for free users */}
            {currentTier === "free" && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Button
                  onClick={() => handleUpgrade("gold")}
                  variant="outline"
                  className="w-full h-auto py-4 border-amber-500/30 hover:border-amber-500/50 hover:bg-amber-500/5 group"
                >
                  <div className="flex items-center gap-3 w-full">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shrink-0">
                      <Crown className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-left flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-amber-500">GOLD</span>
                        <span className="text-xs text-muted-foreground">$8.99/mois</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Phone className="w-3 h-3" />
                        <span>5 appels/jour</span>
                      </div>
                    </div>
                    <Zap className="w-4 h-4 text-amber-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </Button>
              </motion.div>
            )}

            {/* Platinum Option - Show for both free and gold users */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: currentTier === "free" ? 0.3 : 0.2 }}
            >
              <Button
                onClick={() => handleUpgrade("platinum")}
                className="w-full h-auto py-4 bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 hover:from-violet-500 hover:via-purple-500 hover:to-fuchsia-500 border-0 group"
              >
                <div className="flex items-center gap-3 w-full">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white">PLATINUM</span>
                      <span className="text-xs text-white/70">$17.99/mois</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-white/70">
                      <Phone className="w-3 h-3" />
                      <span>Appels illimités</span>
                    </div>
                  </div>
                  <motion.div
                    animate={{ rotate: [0, 15, -15, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Sparkles className="w-4 h-4 text-white" />
                  </motion.div>
                </div>
              </Button>
            </motion.div>
          </div>

          <p className="text-center text-xs text-muted-foreground pt-2">
            Reviens demain pour un nouvel appel gratuit !
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UpgradeModal;
