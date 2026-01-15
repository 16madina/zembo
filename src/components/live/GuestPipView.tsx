import { useEffect, useRef, useState, useCallback } from "react";
import { motion, useDragControls, PanInfo, AnimatePresence } from "framer-motion";
import { X, Loader2, Maximize2, Minimize2, Mic, MicOff, Sparkles } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import ConnectionQualityIndicator from "./ConnectionQualityIndicator";
import { useWebRTCQuality } from "@/hooks/useWebRTCQuality";

interface GuestPipViewProps {
  guestName: string | null;
  guestAvatar: string | null;
  guestId: string;
  guestStream?: MediaStream | null;
  isStreamer: boolean;
  isGuest: boolean;
  isMuted?: boolean;
  onToggleMute?: () => void;
  onRemoveGuest?: () => void;
  isConnecting?: boolean;
  isConnected?: boolean;
  peerConnection?: RTCPeerConnection | null;
}

// Particle component for the entry animation
const Particle = ({ delay, x, y }: { delay: number; x: number; y: number }) => (
  <motion.div
    initial={{ opacity: 1, scale: 1, x: 0, y: 0 }}
    animate={{ 
      opacity: 0, 
      scale: 0,
      x: x,
      y: y,
    }}
    transition={{ 
      duration: 1.2, 
      delay,
      ease: "easeOut"
    }}
    className="absolute w-2 h-2 rounded-full"
    style={{
      background: `linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 100%)`,
      boxShadow: "0 0 8px hsl(var(--primary))",
    }}
  />
);

// Sparkle burst effect
const SparkleParticles = () => {
  const particles = Array.from({ length: 12 }, (_, i) => {
    const angle = (i / 12) * Math.PI * 2;
    const distance = 60 + Math.random() * 40;
    return {
      id: i,
      delay: Math.random() * 0.3,
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
    };
  });

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-visible z-50">
      {particles.map((p) => (
        <Particle key={p.id} delay={p.delay} x={p.x} y={p.y} />
      ))}
    </div>
  );
};

// Glowing ring animation
const GlowRing = () => (
  <motion.div
    initial={{ scale: 0.8, opacity: 1 }}
    animate={{ scale: 2, opacity: 0 }}
    transition={{ duration: 1, ease: "easeOut" }}
    className="absolute inset-0 rounded-2xl border-2 border-primary pointer-events-none"
    style={{
      boxShadow: "0 0 20px hsl(var(--primary)), inset 0 0 20px hsl(var(--primary) / 0.3)",
    }}
  />
);

const GuestPipView = ({
  guestName,
  guestAvatar,
  guestId,
  guestStream,
  isStreamer,
  isGuest,
  isMuted = false,
  onToggleMute,
  onRemoveGuest,
  isConnecting = false,
  isConnected = false,
  peerConnection = null,
}: GuestPipViewProps) => {
  const guestVideoRef = useRef<HTMLVideoElement>(null);
  const dragControls = useDragControls();
  const [isExpanded, setIsExpanded] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [showEntryEffect, setShowEntryEffect] = useState(true);

  // WebRTC quality monitoring
  const { quality, stats, qualityScore } = useWebRTCQuality(
    peerConnection,
    isConnected
  );

  // Hide entry effects after animation completes
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowEntryEffect(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  // Attach guest stream
  useEffect(() => {
    if (guestVideoRef.current && guestStream) {
      guestVideoRef.current.srcObject = guestStream;
    }
  }, [guestStream]);

  const defaultGuestAvatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${guestId}`;

  // Responsive sizing: smaller on mobile, larger on tablet/desktop
  const pipSize = isExpanded 
    ? "w-40 h-52 sm:w-48 sm:h-64 md:w-56 md:h-72" 
    : "w-28 h-36 sm:w-32 sm:h-44 md:w-40 md:h-52";
  
  const handleDragEnd = useCallback((event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setPosition({ x: info.offset.x, y: info.offset.y });
  }, []);

  return (
    <motion.div
      drag
      dragControls={dragControls}
      dragMomentum={false}
      dragElastic={0.1}
      onDragEnd={handleDragEnd}
      initial={{ x: 200, opacity: 0, scale: 0.5, rotate: 15 }}
      animate={{ x: 0, opacity: 1, scale: 1, rotate: 0 }}
      exit={{ x: 200, opacity: 0, scale: 0.5 }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 25,
        delay: 0.1,
      }}
      className={`absolute right-2 sm:right-4 ${pipSize} rounded-2xl overflow-visible shadow-2xl border-2 border-primary/60 z-30 cursor-grab active:cursor-grabbing`}
      style={{
        // Responsive vertical positioning: higher on mobile to avoid bottom controls
        top: "clamp(30%, 40%, 50%)",
        transform: "translateY(-50%)",
        background: "linear-gradient(135deg, hsl(var(--card)) 0%, hsl(var(--muted)) 100%)",
      }}
    >
      {/* Entry animation effects */}
      <AnimatePresence>
        {showEntryEffect && (
          <>
            <SparkleParticles />
            <GlowRing />
          </>
        )}
      </AnimatePresence>

      {/* Shimmer border effect on entry */}
      <motion.div
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 2, delay: 0.5 }}
        className="absolute inset-0 rounded-2xl pointer-events-none"
        style={{
          background: "linear-gradient(90deg, transparent 0%, hsl(var(--primary) / 0.5) 50%, transparent 100%)",
          backgroundSize: "200% 100%",
          animation: "shimmer 1s ease-in-out",
        }}
      />

      {/* Main content container with overflow hidden */}
      <div className="absolute inset-0 rounded-2xl overflow-hidden">
        {/* Video or Avatar */}
        {guestStream ? (
          <video
            ref={guestVideoRef}
            autoPlay
            playsInline
            muted={false}
            className="w-full h-full object-cover"
            style={{ transform: "scaleX(-1)" }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-card to-muted">
            {isConnecting ? (
              <div className="text-center p-2">
                <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 text-primary animate-spin" />
                <p className="text-[10px] sm:text-xs text-muted-foreground">Connexion...</p>
              </div>
            ) : (
              <div className="text-center p-2">
                <Avatar className="w-10 h-10 sm:w-14 sm:h-14 mx-auto mb-1 border-2 border-primary">
                  <AvatarImage src={guestAvatar || defaultGuestAvatar} />
                  <AvatarFallback>{guestName?.[0] || "?"}</AvatarFallback>
                </Avatar>
                <p className="text-[10px] sm:text-xs text-muted-foreground animate-pulse">
                  Caméra...
                </p>
              </div>
            )}
          </div>
        )}

        {/* Top gradient overlay */}
        <div className="absolute inset-x-0 top-0 h-10 sm:h-12 bg-gradient-to-b from-black/70 to-transparent pointer-events-none" />
        
        {/* Bottom gradient overlay */}
        <div className="absolute inset-x-0 bottom-0 h-8 sm:h-10 bg-gradient-to-t from-black/70 to-transparent pointer-events-none" />

        {/* Guest name label with connection quality */}
        <div className="absolute bottom-1 left-1 right-1 flex items-center justify-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-0.5 rounded-full bg-background/60 backdrop-blur-sm">
          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isConnected ? "bg-green-500" : isConnecting ? "bg-yellow-500 animate-pulse" : "bg-gray-400"}`} />
          <span className="text-[9px] sm:text-[10px] font-medium text-foreground truncate max-w-[40px] sm:max-w-[60px]">
            {guestName || "Invité"}
          </span>
          {isMuted && <MicOff className="w-2 h-2 sm:w-2.5 sm:h-2.5 text-destructive flex-shrink-0" />}
          {/* Connection quality indicator */}
          {isConnected && peerConnection && (
            <ConnectionQualityIndicator
              quality={quality}
              score={qualityScore}
              stats={stats}
              size="sm"
            />
          )}
        </div>

        {/* Controls */}
        <div className="absolute top-1 right-1 flex gap-0.5 sm:gap-1">
          {/* Mute button (guest only) */}
          {isGuest && onToggleMute && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={onToggleMute}
              className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full backdrop-blur-sm flex items-center justify-center ${
                isMuted ? "bg-destructive/80" : "bg-background/60"
              }`}
            >
              {isMuted ? (
                <MicOff className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" />
              ) : (
                <Mic className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-foreground" />
              )}
            </motion.button>
          )}

          {/* Expand/Collapse */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-background/60 backdrop-blur-sm flex items-center justify-center"
          >
            {isExpanded ? (
              <Minimize2 className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-foreground" />
            ) : (
              <Maximize2 className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-foreground" />
            )}
          </motion.button>

          {/* Remove (streamer only) */}
          {isStreamer && onRemoveGuest && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={onRemoveGuest}
              className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-destructive/80 backdrop-blur-sm flex items-center justify-center"
            >
              <X className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" />
            </motion.button>
          )}
        </div>

        {/* DUO badge with sparkle */}
        <div className="absolute top-1 left-1">
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 20, delay: 0.3 }}
            className="flex items-center gap-0.5 sm:gap-1 px-1 sm:px-1.5 py-0.5 rounded-full bg-gradient-to-r from-primary to-accent backdrop-blur-sm"
          >
            <Sparkles className="w-2 h-2 sm:w-2.5 sm:h-2.5 text-white" />
            <span className="text-[7px] sm:text-[8px] font-bold text-white">DUO</span>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};

export default GuestPipView;
