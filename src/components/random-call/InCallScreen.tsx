import { motion } from "framer-motion";
import { Mic, MicOff, UserCircle, Volume2 } from "lucide-react";
import { useState, useEffect } from "react";

interface InCallScreenProps {
  timeRemaining: number;
}

const InCallScreen = ({ timeRemaining }: InCallScreenProps) => {
  const [isMuted, setIsMuted] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);

  // Simulate audio levels
  useEffect(() => {
    const interval = setInterval(() => {
      setAudioLevel(Math.random() * 100);
    }, 100);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const isLowTime = timeRemaining <= 10;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center gap-8 w-full"
    >
      {/* Timer */}
      <motion.div
        className={`text-5xl font-bold ${isLowTime ? "text-destructive" : "text-primary"}`}
        animate={isLowTime ? { scale: [1, 1.1, 1] } : {}}
        transition={{ duration: 0.5, repeat: isLowTime ? Infinity : 0 }}
      >
        {formatTime(timeRemaining)}
      </motion.div>

      {/* Anonymous caller visual */}
      <div className="relative">
        <motion.div
          className="w-36 h-36 rounded-full glass flex items-center justify-center"
          animate={{ 
            boxShadow: [
              "0 0 0 0 rgba(var(--primary), 0.4)",
              "0 0 0 20px rgba(var(--primary), 0)",
            ]
          }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <UserCircle className="w-24 h-24 text-muted-foreground" />
        </motion.div>
        
        {/* Audio wave indicator */}
        <motion.div
          className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex gap-1"
        >
          {[0, 1, 2, 3, 4].map((i) => (
            <motion.div
              key={i}
              className="w-1 bg-primary rounded-full"
              animate={{ 
                height: [4, Math.max(8, audioLevel * 0.3 * (1 - Math.abs(i - 2) * 0.2)), 4] 
              }}
              transition={{ duration: 0.15, delay: i * 0.05 }}
            />
          ))}
        </motion.div>
      </div>

      <div className="text-center space-y-1">
        <h3 className="text-lg font-medium text-foreground">
          Appel anonyme en cours
        </h3>
        <p className="text-sm text-muted-foreground">
          Découvrez-vous par la voix uniquement
        </p>
      </div>

      {/* Mute button */}
      <motion.button
        onClick={() => setIsMuted(!isMuted)}
        className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors ${
          isMuted 
            ? "bg-destructive text-destructive-foreground" 
            : "glass text-foreground"
        }`}
        whileTap={{ scale: 0.95 }}
      >
        {isMuted ? (
          <MicOff className="w-7 h-7" />
        ) : (
          <Mic className="w-7 h-7" />
        )}
      </motion.button>

      {/* Info text */}
      <p className="text-xs text-muted-foreground text-center max-w-xs">
        L'appel se terminera automatiquement. Vous pourrez ensuite décider si vous voulez matcher.
      </p>
    </motion.div>
  );
};

export default InCallScreen;
