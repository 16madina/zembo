import { motion } from "framer-motion";
import { Heart, X, MessageCircle, Loader2, UserCircle } from "lucide-react";

interface FirstDecisionScreenProps {
  onDecide: (decision: "yes" | "no" | "continue") => void;
  waitingForOther: boolean;
  timeRemaining: number;
}

const FirstDecisionScreen = ({ onDecide, waitingForOther, timeRemaining }: FirstDecisionScreenProps) => {
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
        <p className="text-sm text-muted-foreground">
          Temps restant : {timeRemaining}s
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="flex flex-col items-center justify-center gap-6"
    >
      {/* Timer warning */}
      <motion.div
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 0.5, repeat: Infinity }}
        className="text-2xl font-bold text-primary"
      >
        {timeRemaining}s restantes
      </motion.div>

      {/* Anonymous avatar */}
      <motion.div
        initial={{ y: -20 }}
        animate={{ y: 0 }}
        className="w-24 h-24 rounded-full glass flex items-center justify-center"
      >
        <UserCircle className="w-16 h-16 text-muted-foreground" />
      </motion.div>

      <div className="text-center space-y-2">
        <motion.h2
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-xl font-bold text-foreground"
        >
          1 minute écoulée !
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-muted-foreground text-sm max-w-xs"
        >
          Que voulez-vous faire ?
        </motion.p>
      </div>

      {/* Decision buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="flex flex-col gap-3 w-full max-w-xs"
      >
        {/* Match button */}
        <motion.button
          onClick={() => onDecide("yes")}
          className="flex items-center justify-center gap-3 p-4 rounded-2xl btn-gold"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Heart className="w-5 h-5" fill="currentColor" />
          <span className="font-semibold">Oui, je veux matcher !</span>
        </motion.button>

        {/* Continue button */}
        <motion.button
          onClick={() => onDecide("continue")}
          className="flex items-center justify-center gap-3 p-4 rounded-2xl glass hover:bg-primary/10 transition-colors"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <MessageCircle className="w-5 h-5 text-primary" />
          <span className="font-medium text-foreground">Continuer à parler</span>
        </motion.button>

        {/* No button */}
        <motion.button
          onClick={() => onDecide("no")}
          className="flex items-center justify-center gap-3 p-4 rounded-2xl bg-muted hover:bg-muted/80 transition-colors"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <X className="w-5 h-5 text-muted-foreground" />
          <span className="font-medium text-muted-foreground">Non merci</span>
        </motion.button>
      </motion.div>

      <p className="text-xs text-muted-foreground text-center max-w-xs">
        Si vous dites non, l'appel sera terminé immédiatement
      </p>
    </motion.div>
  );
};

export default FirstDecisionScreen;
