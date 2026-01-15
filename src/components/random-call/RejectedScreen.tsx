import { motion } from "framer-motion";
import { PhoneOff, RotateCcw, HeartCrack } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";
import { useSoundEffects } from "@/hooks/useSoundEffects";

interface RejectedScreenProps {
  onRetry: () => void;
}

const RejectedScreen = ({ onRetry }: RejectedScreenProps) => {
  const { playRejectionSound } = useSoundEffects();

  // Play rejection sound on mount
  useEffect(() => {
    playRejectionSound();
  }, [playRejectionSound]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center gap-8"
    >
      {/* Animated broken heart with shake effect */}
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ 
          scale: 1, 
          rotate: 0,
          x: [0, -5, 5, -5, 5, 0]
        }}
        transition={{ 
          type: "spring", 
          damping: 12,
          x: { delay: 0.3, duration: 0.5 }
        }}
        className="relative"
      >
        {/* Outer glow ring */}
        <motion.div
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.5, 0.2, 0.5]
          }}
          transition={{ 
            duration: 2, 
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute inset-0 w-32 h-32 rounded-full bg-destructive/30 blur-xl"
        />
        
        {/* Main circle */}
        <motion.div
          className="relative w-28 h-28 rounded-full bg-gradient-to-br from-destructive/30 to-destructive/10 flex items-center justify-center border-2 border-destructive/20"
        >
          <motion.div
            animate={{ 
              y: [0, -3, 0],
              rotate: [0, -5, 5, 0]
            }}
            transition={{ 
              duration: 3, 
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <HeartCrack className="w-14 h-14 text-destructive" />
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Falling particles animation */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ 
              opacity: 0, 
              y: -20,
              x: `${20 + i * 10}%`
            }}
            animate={{ 
              opacity: [0, 0.6, 0],
              y: [0, 200],
              rotate: [0, 180]
            }}
            transition={{
              duration: 2.5,
              delay: i * 0.2,
              repeat: Infinity,
              repeatDelay: 3
            }}
            className="absolute text-destructive/40 text-lg"
          >
            💔
          </motion.div>
        ))}
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-center space-y-3"
      >
        <motion.h2 
          className="text-2xl font-semibold text-foreground"
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          Pas cette fois...
        </motion.h2>
        <p className="text-muted-foreground max-w-xs">
          L'autre personne a décidé de ne pas continuer. Ce n'est pas grave, réessayez avec quelqu'un d'autre !
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5 }}
      >
        <Button
          onClick={onRetry}
          className="btn-gold gap-2"
        >
          <RotateCcw className="w-5 h-5" />
          Nouvelle rencontre
        </Button>
      </motion.div>
    </motion.div>
  );
};

export default RejectedScreen;
