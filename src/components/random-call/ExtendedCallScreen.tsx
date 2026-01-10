import { motion } from "framer-motion";
import { Mic, MicOff, UserCircle, Clock } from "lucide-react";
import { useState, useEffect } from "react";

interface ExtendedCallScreenProps {
  timeRemaining: number;
}

const ExtendedCallScreen = ({ timeRemaining }: ExtendedCallScreenProps) => {
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
      className="flex flex-col items-center justify-center gap-6 w-full"
    >
      {/* Extended call badge */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/20 text-primary"
      >
        <Clock className="w-4 h-4" />
        <span className="text-sm font-medium">Temps supplémentaire</span>
      </motion.div>

      {/* Timer */}
      <motion.div
        className={`text-4xl font-bold ${isLowTime ? "text-destructive" : "text-foreground"}`}
        animate={isLowTime ? { scale: [1, 1.1, 1] } : {}}
        transition={{ duration: 0.5, repeat: isLowTime ? Infinity : 0 }}
      >
        {formatTime(timeRemaining)}
      </motion.div>

      {/* Anonymous caller visual */}
      <div className="relative">
        <motion.div
          className="w-32 h-32 rounded-full glass flex items-center justify-center"
          animate={{ 
            boxShadow: [
              "0 0 0 0 rgba(var(--primary), 0.4)",
              "0 0 0 15px rgba(var(--primary), 0)",
            ]
          }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <UserCircle className="w-20 h-20 text-muted-foreground" />
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
          Continuez votre conversation
        </h3>
        <p className="text-sm text-muted-foreground">
          L'appel se terminera à la fin du temps
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

      {/* Warning text */}
      <p className="text-xs text-muted-foreground text-center max-w-xs">
        ⚠️ À la fin du temps, vous ne pourrez plus vous contacter
      </p>
    </motion.div>
  );
};

export default ExtendedCallScreen;
