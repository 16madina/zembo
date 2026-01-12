import { motion } from "framer-motion";
import { Lock, Clock, AlertTriangle } from "lucide-react";

interface ChatRestrictionBannerProps {
  status: "none" | "pending" | "approved" | "rejected";
}

const ChatRestrictionBanner = ({ status }: ChatRestrictionBannerProps) => {
  if (status === "approved") {
    return null;
  }

  if (status === "pending") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-4 py-3 bg-amber-500/20 border-t border-amber-500/30"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-amber-500/30 flex-shrink-0">
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-amber-300">
              <span className="font-semibold">Vérification en attente</span> — Vous pourrez envoyer des messages une fois votre identité vérifiée.
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  if (status === "rejected" || status === "none") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-4 py-3 bg-destructive/20 border-t border-destructive/30"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-destructive/30 flex-shrink-0">
            <Lock className="w-4 h-4 text-destructive" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-destructive/90">
              <span className="font-semibold">Accès limité</span> — Veuillez compléter la vérification d'identité pour envoyer des messages.
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  return null;
};

export default ChatRestrictionBanner;
