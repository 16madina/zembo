import { motion } from "framer-motion";
import { Heart, X, Loader2, UserCircle } from "lucide-react";

interface DecisionOverlayProps {
  onDecide: (decision: "yes" | "no") => void;
  waitingForOther: boolean;
  timeRemaining: number;
}

const DecisionOverlay = ({ onDecide, waitingForOther, timeRemaining }: DecisionOverlayProps) => {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (waitingForOther) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex flex-col items-center justify-center gap-6 p-6 rounded-3xl glass max-w-sm mx-4"
        >
          {/* Timer continues */}
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
            className="text-3xl font-bold text-primary"
          >
            {formatTime(timeRemaining)}
          </motion.div>
          
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
            L'appel continue en arrière-plan
          </p>
        </motion.div>
      </motion.div>
    );
  }

  const isLowTime = timeRemaining <= 10;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="flex flex-col items-center justify-center gap-5 p-6 rounded-3xl glass max-w-sm mx-4"
      >
        {/* Timer continues counting down */}
        <motion.div
          animate={isLowTime ? { scale: [1, 1.1, 1] } : { scale: [1, 1.05, 1] }}
          transition={{ duration: isLowTime ? 0.5 : 1, repeat: Infinity }}
          className={`text-3xl font-bold ${isLowTime ? "text-destructive" : "text-primary"}`}
        >
          {formatTime(timeRemaining)}
        </motion.div>

        {/* Anonymous avatar */}
        <motion.div
          initial={{ y: -10 }}
          animate={{ y: 0 }}
          className="w-20 h-20 rounded-full glass flex items-center justify-center"
        >
          <UserCircle className="w-14 h-14 text-muted-foreground" />
        </motion.div>

        <div className="text-center space-y-1">
          <h2 className="text-lg font-bold text-foreground">
            1 minute écoulée !
          </h2>
          <p className="text-muted-foreground text-sm">
            Voulez-vous révéler vos profils ?
          </p>
        </div>

        {/* Decision buttons - only 2 options */}
        <div className="flex flex-col gap-3 w-full">
          {/* Match button */}
          <motion.button
            onClick={() => onDecide("yes")}
            className="flex items-center justify-center gap-3 p-4 rounded-2xl btn-gold"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Heart className="w-5 h-5" fill="currentColor" />
            <span className="font-semibold">Oui, matcher !</span>
          </motion.button>

          {/* No button */}
          <motion.button
            onClick={() => onDecide("no")}
            className="flex items-center justify-center gap-3 p-4 rounded-2xl bg-muted hover:bg-muted/80 transition-colors"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <X className="w-5 h-5 text-muted-foreground" />
            <span className="font-medium text-muted-foreground">Pas intéressé(e)</span>
          </motion.button>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          {isLowTime 
            ? "L'appel se termine bientôt !" 
            : "Si vous matchez, vos profils seront révélés"
          }
        </p>
      </motion.div>
    </motion.div>
  );
};

export default DecisionOverlay;
