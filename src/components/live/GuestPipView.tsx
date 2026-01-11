import { useEffect, useRef, useState } from "react";
import { motion, useDragControls, PanInfo } from "framer-motion";
import { X, Loader2, Maximize2, Minimize2, Mic, MicOff } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

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
}

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
}: GuestPipViewProps) => {
  const guestVideoRef = useRef<HTMLVideoElement>(null);
  const dragControls = useDragControls();
  const [isExpanded, setIsExpanded] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  // Attach guest stream
  useEffect(() => {
    if (guestVideoRef.current && guestStream) {
      guestVideoRef.current.srcObject = guestStream;
    }
  }, [guestStream]);

  const defaultGuestAvatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${guestId}`;

  const pipSize = isExpanded ? "w-48 h-64" : "w-32 h-44";
  
  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setPosition({ x: info.offset.x, y: info.offset.y });
  };

  return (
    <motion.div
      drag
      dragControls={dragControls}
      dragMomentum={false}
      dragElastic={0.1}
      onDragEnd={handleDragEnd}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      className={`absolute bottom-56 right-4 ${pipSize} rounded-2xl overflow-hidden shadow-2xl border-2 border-primary/50 z-30 cursor-grab active:cursor-grabbing`}
      style={{
        background: "linear-gradient(135deg, hsl(var(--card)) 0%, hsl(var(--muted)) 100%)",
      }}
    >
      {/* Video or Avatar */}
      {guestStream ? (
        <video
          ref={guestVideoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
          style={{ transform: "scaleX(-1)" }}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          {isConnecting ? (
            <div className="text-center p-2">
              <Loader2 className="w-8 h-8 mx-auto mb-2 text-primary animate-spin" />
              <p className="text-xs text-muted-foreground">Connexion...</p>
            </div>
          ) : (
            <div className="text-center p-2">
              <Avatar className="w-14 h-14 mx-auto mb-1 border-2 border-primary">
                <AvatarImage src={guestAvatar || defaultGuestAvatar} />
                <AvatarFallback>{guestName?.[0] || "?"}</AvatarFallback>
              </Avatar>
              <p className="text-xs text-muted-foreground animate-pulse">
                Caméra...
              </p>
            </div>
          )}
        </div>
      )}

      {/* Top gradient overlay */}
      <div className="absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-black/70 to-transparent pointer-events-none" />
      
      {/* Bottom gradient overlay */}
      <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/70 to-transparent pointer-events-none" />

      {/* Guest name label */}
      <div className="absolute bottom-1 left-1 right-1 flex items-center justify-center gap-1.5 px-2 py-0.5 rounded-full bg-background/60 backdrop-blur-sm">
        <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? "bg-green-500" : isConnecting ? "bg-yellow-500 animate-pulse" : "bg-gray-400"}`} />
        <span className="text-[10px] font-medium text-foreground truncate">
          {guestName || "Invité"}
        </span>
        {isMuted && <MicOff className="w-2.5 h-2.5 text-destructive" />}
      </div>

      {/* Controls */}
      <div className="absolute top-1 right-1 flex gap-1">
        {/* Mute button (guest only) */}
        {isGuest && onToggleMute && (
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onToggleMute}
            className={`w-6 h-6 rounded-full backdrop-blur-sm flex items-center justify-center ${
              isMuted ? "bg-destructive/80" : "bg-background/60"
            }`}
          >
            {isMuted ? (
              <MicOff className="w-3 h-3 text-white" />
            ) : (
              <Mic className="w-3 h-3 text-foreground" />
            )}
          </motion.button>
        )}

        {/* Expand/Collapse */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-6 h-6 rounded-full bg-background/60 backdrop-blur-sm flex items-center justify-center"
        >
          {isExpanded ? (
            <Minimize2 className="w-3 h-3 text-foreground" />
          ) : (
            <Maximize2 className="w-3 h-3 text-foreground" />
          )}
        </motion.button>

        {/* Remove (streamer only) */}
        {isStreamer && onRemoveGuest && (
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onRemoveGuest}
            className="w-6 h-6 rounded-full bg-destructive/80 backdrop-blur-sm flex items-center justify-center"
          >
            <X className="w-3 h-3 text-white" />
          </motion.button>
        )}
      </div>

      {/* Live badge */}
      <div className="absolute top-1 left-1">
        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-destructive/90 backdrop-blur-sm">
          <span className="w-1 h-1 bg-white rounded-full animate-pulse" />
          <span className="text-[8px] font-bold text-white">DUO</span>
        </div>
      </div>
    </motion.div>
  );
};

export default GuestPipView;
