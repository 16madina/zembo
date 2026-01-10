import { motion } from "framer-motion";
import { Heart, X, Loader2, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DecisionScreenProps {
  onDecide: (wantsMatch: boolean) => void;
  waitingForOther: boolean;
}

const DecisionScreen = ({ onDecide, waitingForOther }: DecisionScreenProps) => {
  if (waitingForOther) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center gap-6"
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <Loader2 className="w-12 h-12 text-primary" />
        </motion.div>
        <div className="text-center space-y-2">
          <h2 className="text-xl font-semibold text-foreground">
            En attente de l'autre...
          </h2>
          <p className="text-muted-foreground">
            L'autre personne fait son choix
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="flex flex-col items-center justify-center gap-8"
    >
      {/* Anonymous avatar */}
      <motion.div
        initial={{ y: -20 }}
        animate={{ y: 0 }}
        className="w-28 h-28 rounded-full glass flex items-center justify-center"
      >
        <UserCircle className="w-20 h-20 text-muted-foreground" />
      </motion.div>

      <div className="text-center space-y-3">
        <motion.h2
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-2xl font-bold text-foreground"
        >
          L'appel est terminé !
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-muted-foreground"
        >
          Voulez-vous découvrir cette personne et matcher ?
        </motion.p>
      </div>

      {/* Decision buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="flex gap-6"
      >
        <motion.button
          onClick={() => onDecide(false)}
          className="w-20 h-20 rounded-full bg-muted flex items-center justify-center group"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          <X className="w-10 h-10 text-muted-foreground group-hover:text-destructive transition-colors" />
        </motion.button>

        <motion.button
          onClick={() => onDecide(true)}
          className="w-20 h-20 rounded-full btn-gold flex items-center justify-center group"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          <Heart className="w-10 h-10 text-primary-foreground" fill="currentColor" />
        </motion.button>
      </motion.div>

      <p className="text-xs text-muted-foreground text-center max-w-xs">
        Si vous matchez tous les deux, vous pourrez voir vos profils et discuter !
      </p>
    </motion.div>
  );
};

export default DecisionScreen;
