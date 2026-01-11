import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Camera, CameraOff, Wifi, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface LocalVideoPlayerProps {
  isStreamer: boolean;
  isVideoOff: boolean;
  isInitialized: boolean;
  stream: MediaStream | null;
  streamerId: string;
  streamerName?: string | null;
  streamerAvatar?: string | null;
  setVideoRef: (ref: HTMLVideoElement | null) => void;
}

const LocalVideoPlayer = ({
  isStreamer,
  isVideoOff,
  isInitialized,
  stream,
  streamerId,
  streamerName,
  streamerAvatar,
  setVideoRef,
}: LocalVideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  const defaultAvatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${streamerId}`;

  // Attach stream to video element
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  // Pass ref to parent
  useEffect(() => {
    if (videoRef.current) {
      setVideoRef(videoRef.current);
    }
  }, [setVideoRef]);

  // Streamer view - show local camera
  if (isStreamer) {
    if (isInitialized && !isVideoOff && stream) {
      return (
        <div className="absolute inset-0 bg-black">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
            style={{ transform: "scaleX(-1)" }}
          />
          {/* Live indicator */}
          <div className="absolute top-16 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-destructive/90 backdrop-blur-sm z-10">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
            <span className="text-xs font-bold text-white">EN DIRECT</span>
          </div>
          {/* Status */}
          <div className="absolute top-16 right-16 flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-500/20 backdrop-blur-sm z-10">
            <Wifi className="w-3 h-3 text-green-500" />
            <span className="text-xs text-green-500">Connecté</span>
          </div>
        </div>
      );
    }

    // Camera off state for streamer
    if (isVideoOff && isInitialized) {
      return (
        <div className="absolute inset-0 bg-gradient-to-br from-muted to-background flex items-center justify-center">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center"
          >
            <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
              <CameraOff className="w-12 h-12 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">Caméra désactivée</p>
          </motion.div>
          {/* Still show live indicator */}
          <div className="absolute top-16 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-destructive/90 backdrop-blur-sm">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
            <span className="text-xs font-bold text-white">EN DIRECT</span>
          </div>
        </div>
      );
    }

    // Initializing camera
    return (
      <div className="absolute inset-0 bg-gradient-to-br from-muted to-background flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <Loader2 className="w-16 h-16 mx-auto mb-4 text-primary animate-spin" />
          <p className="text-muted-foreground">Initialisation de la caméra...</p>
        </motion.div>
      </div>
    );
  }

  // Viewer view - show streamer placeholder (LiveKit would show actual stream)
  return (
    <div className="absolute inset-0 bg-gradient-to-br from-muted to-background">
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <Avatar className="w-32 h-32 mx-auto mb-4 border-4 border-primary shadow-lg">
            <AvatarImage src={streamerAvatar || defaultAvatar} />
            <AvatarFallback className="text-2xl">
              {streamerName?.[0] || "?"}
            </AvatarFallback>
          </Avatar>
          <h2 className="text-xl font-bold text-foreground mb-2">
            {streamerName || "Streamer"}
          </h2>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Camera className="w-4 h-4" />
            <span>Stream en cours...</span>
          </div>
        </motion.div>
      </div>

      {/* Live indicator */}
      <div className="absolute top-16 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-destructive/90 backdrop-blur-sm">
        <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
        <span className="text-xs font-bold text-white">EN DIRECT</span>
      </div>

      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-64 h-64 rounded-full bg-primary/5"
            initial={{
              x: Math.random() * 100 - 50,
              y: Math.random() * 100 - 50,
              scale: 0.8,
            }}
            animate={{
              x: Math.random() * 200 - 100,
              y: Math.random() * 200 - 100,
              scale: [0.8, 1.2, 0.8],
            }}
            transition={{
              duration: 8 + Math.random() * 4,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            style={{
              left: `${20 + i * 15}%`,
              top: `${10 + i * 20}%`,
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default LocalVideoPlayer;
