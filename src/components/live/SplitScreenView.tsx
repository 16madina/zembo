import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Wifi, X, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

interface SplitScreenViewProps {
  // Streamer props
  streamerStream: MediaStream | null;
  streamerName: string | null;
  streamerAvatar: string | null;
  streamerId: string;
  isVideoOff: boolean;
  filterString?: string;
  
  // Guest props
  guestName: string | null;
  guestAvatar: string | null;
  guestId: string;
  guestStream?: MediaStream | null;
  
  // Control props
  isStreamer: boolean;
  onRemoveGuest?: () => void;
  
  // Connection status
  isConnecting?: boolean;
  isConnected?: boolean;
}

const SplitScreenView = ({
  streamerStream,
  streamerName,
  streamerAvatar,
  streamerId,
  isVideoOff,
  filterString,
  guestName,
  guestAvatar,
  guestId,
  guestStream,
  isStreamer,
  onRemoveGuest,
  isConnecting = false,
  isConnected = false,
}: SplitScreenViewProps) => {
  const streamerVideoRef = useRef<HTMLVideoElement>(null);
  const guestVideoRef = useRef<HTMLVideoElement>(null);

  // Attach streamer stream
  useEffect(() => {
    if (streamerVideoRef.current && streamerStream) {
      streamerVideoRef.current.srcObject = streamerStream;
    }
  }, [streamerStream]);

  // Attach guest stream
  useEffect(() => {
    if (guestVideoRef.current && guestStream) {
      guestVideoRef.current.srcObject = guestStream;
    }
  }, [guestStream]);

  const defaultStreamerAvatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${streamerId}`;
  const defaultGuestAvatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${guestId}`;

  return (
    <div className="absolute inset-0 bg-black flex flex-col">
      {/* Top video - Streamer */}
      <div className="relative flex-1 border-b-2 border-primary/50">
        {streamerStream && !isVideoOff ? (
          <video
            ref={streamerVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
            style={{
              transform: "scaleX(-1)",
              filter: filterString || "none",
            }}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-muted to-background flex items-center justify-center">
            <Avatar className="w-20 h-20 border-2 border-primary">
              <AvatarImage src={streamerAvatar || defaultStreamerAvatar} />
              <AvatarFallback>{streamerName?.[0] || "?"}</AvatarFallback>
            </Avatar>
          </div>
        )}
        
        {/* Streamer label */}
        <div className="absolute bottom-2 left-2 flex items-center gap-2 px-2 py-1 rounded-full bg-background/80 backdrop-blur-sm">
          <span className="w-2 h-2 bg-destructive rounded-full animate-pulse" />
          <span className="text-xs font-medium text-foreground">
            {streamerName || "Streamer"}
          </span>
        </div>
      </div>

      {/* Bottom video - Guest */}
      <div className="relative flex-1">
        {guestStream ? (
          <video
            ref={guestVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
            style={{ transform: "scaleX(-1)" }}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-card to-muted flex items-center justify-center">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="w-12 h-12 mx-auto mb-3 text-primary animate-spin" />
                  <p className="text-sm font-medium text-foreground">
                    Connexion avec {guestName || "l'invité"}...
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Établissement de la connexion vidéo
                  </p>
                </>
              ) : (
                <>
                  <Avatar className="w-20 h-20 mx-auto mb-2 border-2 border-primary">
                    <AvatarImage src={guestAvatar || defaultGuestAvatar} />
                    <AvatarFallback>{guestName?.[0] || "?"}</AvatarFallback>
                  </Avatar>
                  <p className="text-sm font-medium text-foreground">
                    {guestName || "Invité"}
                  </p>
                  <p className="text-xs text-muted-foreground animate-pulse">
                    En attente de la caméra...
                  </p>
                </>
              )}
            </motion.div>
          </div>
        )}

        {/* Guest label */}
        <div className="absolute bottom-2 left-2 flex items-center gap-2 px-2 py-1 rounded-full bg-background/80 backdrop-blur-sm">
          <span className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500" : isConnecting ? "bg-yellow-500 animate-pulse" : "bg-gray-400"}`} />
          <span className="text-xs font-medium text-foreground">
            {guestName || "Invité"}
          </span>
        </div>

        {/* Remove guest button (streamer only) */}
        {isStreamer && onRemoveGuest && (
          <Button
            size="sm"
            variant="destructive"
            onClick={onRemoveGuest}
            className="absolute top-2 right-2"
          >
            <X className="w-4 h-4 mr-1" />
            Retirer
          </Button>
        )}
      </div>

      {/* Live indicator */}
      <div className="absolute top-16 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-destructive/90 backdrop-blur-sm z-10">
        <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
        <span className="text-xs font-bold text-white">EN DIRECT</span>
      </div>

      {/* Connection status */}
      <div className="absolute top-16 right-16 flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-500/20 backdrop-blur-sm z-10">
        <Wifi className="w-3 h-3 text-green-500" />
        <span className="text-xs text-green-500">Duo</span>
      </div>
    </div>
  );
};

export default SplitScreenView;
