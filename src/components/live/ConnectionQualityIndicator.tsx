import { motion, AnimatePresence } from "framer-motion";
import { Wifi, WifiOff, Signal, SignalLow, SignalMedium, SignalHigh } from "lucide-react";
import { ConnectionQuality } from "@/hooks/useWebRTCQuality";
import { useState } from "react";

interface ConnectionQualityIndicatorProps {
  quality: ConnectionQuality;
  score: number;
  showDetails?: boolean;
  stats?: {
    roundTripTime: number | null;
    packetLoss: number | null;
    jitter: number | null;
    bitrate: number | null;
    framesPerSecond: number | null;
  };
  size?: "sm" | "md";
}

const qualityConfig: Record<ConnectionQuality, {
  label: string;
  color: string;
  bgColor: string;
  icon: typeof Signal;
  bars: number;
}> = {
  excellent: {
    label: "Excellent",
    color: "text-green-400",
    bgColor: "bg-green-500/20",
    icon: SignalHigh,
    bars: 4,
  },
  good: {
    label: "Bonne",
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/20",
    icon: SignalHigh,
    bars: 3,
  },
  medium: {
    label: "Moyenne",
    color: "text-yellow-400",
    bgColor: "bg-yellow-500/20",
    icon: SignalMedium,
    bars: 2,
  },
  poor: {
    label: "Faible",
    color: "text-red-400",
    bgColor: "bg-red-500/20",
    icon: SignalLow,
    bars: 1,
  },
  unknown: {
    label: "...",
    color: "text-muted-foreground",
    bgColor: "bg-muted/50",
    icon: Signal,
    bars: 0,
  },
};

const ConnectionQualityIndicator = ({
  quality,
  score,
  showDetails = false,
  stats,
  size = "sm",
}: ConnectionQualityIndicatorProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const config = qualityConfig[quality];
  const IconComponent = config.icon;

  const barHeight = size === "sm" ? "h-1.5 sm:h-2" : "h-2 sm:h-3";
  const barWidth = size === "sm" ? "w-0.5 sm:w-1" : "w-1 sm:w-1.5";
  const containerPadding = size === "sm" ? "px-1 py-0.5" : "px-1.5 py-1";

  return (
    <div 
      className="relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={`flex items-center gap-0.5 sm:gap-1 ${containerPadding} rounded-full ${config.bgColor} backdrop-blur-sm`}
      >
        {/* Signal bars */}
        <div className="flex items-end gap-px">
          {[1, 2, 3, 4].map((bar) => (
            <motion.div
              key={bar}
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ delay: bar * 0.1 }}
              className={`${barWidth} rounded-full ${
                bar <= config.bars
                  ? quality === "excellent"
                    ? "bg-green-400"
                    : quality === "good"
                    ? "bg-emerald-400"
                    : quality === "medium"
                    ? "bg-yellow-400"
                    : quality === "poor"
                    ? "bg-red-400"
                    : "bg-muted-foreground/50"
                  : "bg-muted-foreground/30"
              }`}
              style={{
                height: `${bar * 3 + 2}px`,
                transformOrigin: "bottom",
              }}
            />
          ))}
        </div>

        {/* Quality label (optional) */}
        {showDetails && (
          <span className={`text-[8px] sm:text-[9px] font-medium ${config.color}`}>
            {config.label}
          </span>
        )}
      </motion.div>

      {/* Detailed tooltip on hover */}
      <AnimatePresence>
        {isHovered && stats && (
          <motion.div
            initial={{ opacity: 0, y: 5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.95 }}
            className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50"
          >
            <div className="bg-background/95 backdrop-blur-md rounded-lg p-2 shadow-xl border border-border min-w-[120px]">
              <div className={`text-[10px] font-semibold ${config.color} mb-1.5 text-center`}>
                {config.label} ({score}%)
              </div>
              <div className="space-y-1 text-[9px]">
                {stats.roundTripTime !== null && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Latence:</span>
                    <span className="text-foreground font-medium">{Math.round(stats.roundTripTime)}ms</span>
                  </div>
                )}
                {stats.packetLoss !== null && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Perte:</span>
                    <span className={`font-medium ${stats.packetLoss > 2 ? "text-red-400" : "text-foreground"}`}>
                      {stats.packetLoss.toFixed(1)}%
                    </span>
                  </div>
                )}
                {stats.framesPerSecond !== null && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">FPS:</span>
                    <span className={`font-medium ${stats.framesPerSecond < 20 ? "text-yellow-400" : "text-foreground"}`}>
                      {Math.round(stats.framesPerSecond)}
                    </span>
                  </div>
                )}
                {stats.bitrate !== null && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Débit:</span>
                    <span className="text-foreground font-medium">{Math.round(stats.bitrate)} kbps</span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ConnectionQualityIndicator;
