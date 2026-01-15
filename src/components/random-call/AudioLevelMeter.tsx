import { motion } from "framer-motion";
import { memo } from "react";

interface AudioLevelMeterProps {
  level: number; // 0-100
  isActive: boolean;
}

const AudioLevelMeter = memo(({ level, isActive }: AudioLevelMeterProps) => {
  const normalizedLevel = Math.min(100, Math.max(0, level));
  const barCount = 12;
  
  // Generate bar heights based on audio level
  const getBarHeight = (index: number) => {
    if (!isActive) return 4;
    
    // Create a wave-like pattern centered on the middle bars
    const center = barCount / 2;
    const distance = Math.abs(index - center);
    const maxDistance = center;
    const falloff = 1 - (distance / maxDistance) * 0.5;
    
    // Add some randomness for natural feel
    const randomFactor = 0.8 + Math.random() * 0.4;
    const baseHeight = (normalizedLevel / 100) * 32 * falloff * randomFactor;
    
    return Math.max(4, Math.min(32, baseHeight));
  };

  // Color based on level
  const getBarColor = (height: number) => {
    if (!isActive) return "bg-muted-foreground/30";
    if (height > 24) return "bg-green-400";
    if (height > 16) return "bg-green-500";
    if (height > 8) return "bg-primary";
    return "bg-primary/60";
  };

  return (
    <div className="flex flex-col items-center gap-2">
      {/* VU Meter bars */}
      <div className="flex items-end justify-center gap-[3px] h-10 px-4 py-2 rounded-lg bg-card/50 backdrop-blur-sm border border-border/50">
        {Array.from({ length: barCount }).map((_, i) => {
          const height = getBarHeight(i);
          return (
            <motion.div
              key={i}
              className={`w-[5px] rounded-full transition-colors duration-100 ${getBarColor(height)}`}
              animate={{ height }}
              transition={{
                type: "spring",
                stiffness: 400,
                damping: 15,
                mass: 0.5,
              }}
            />
          );
        })}
      </div>
      
      {/* Label */}
      <span className={`text-xs font-medium ${isActive ? "text-green-500" : "text-muted-foreground"}`}>
        {isActive ? "🔊 Son actif" : "🔇 En attente..."}
      </span>
    </div>
  );
});

AudioLevelMeter.displayName = "AudioLevelMeter";

export default AudioLevelMeter;
