import { motion } from "framer-motion";
import { Heart, HeartCrack, MessageCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import confetti from "canvas-confetti";
import { useEffect } from "react";

interface ResultScreenProps {
  matched: boolean;
  onRetry: () => void;
}

const ResultScreen = ({ matched, onRetry }: ResultScreenProps) => {
  const navigate = useNavigate();

  useEffect(() => {
    if (matched) {
      // Trigger confetti
      const duration = 3000;
      const end = Date.now() + duration;

      const colors = ["#FFD700", "#FFA500", "#FF6347"];

      (function frame() {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: colors,
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: colors,
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      })();
    }
  }, [matched]);

  if (matched) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center gap-8"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", damping: 10, stiffness: 100 }}
          className="w-32 h-32 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center"
        >
          <Heart className="w-16 h-16 text-primary-foreground" fill="currentColor" />
        </motion.div>

        <div className="text-center space-y-3">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-3xl font-bold text-foreground"
          >
            C'est un Match ! 🎉
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-muted-foreground"
          >
            Vous pouvez maintenant voir vos profils et discuter !
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="flex gap-4"
        >
          <Button
            onClick={() => navigate("/messages")}
            className="btn-gold gap-2"
          >
            <MessageCircle className="w-5 h-5" />
            Envoyer un message
          </Button>
        </motion.div>

        <Button
          variant="ghost"
          onClick={onRetry}
          className="gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          Nouvelle rencontre
        </Button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center gap-8"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", damping: 15 }}
        className="w-28 h-28 rounded-full glass flex items-center justify-center"
      >
        <HeartCrack className="w-14 h-14 text-muted-foreground" />
      </motion.div>

      <div className="text-center space-y-3">
        <h2 className="text-2xl font-semibold text-foreground">
          Pas cette fois...
        </h2>
        <p className="text-muted-foreground max-w-xs">
          L'un de vous n'a pas souhaité matcher. Ce n'est pas grave, réessayez !
        </p>
      </div>

      <Button
        onClick={onRetry}
        className="btn-gold gap-2"
      >
        <RotateCcw className="w-5 h-5" />
        Réessayer
      </Button>
    </motion.div>
  );
};

export default ResultScreen;
