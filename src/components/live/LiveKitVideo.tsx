import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Camera, CameraOff, Wifi, WifiOff } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Track } from "livekit-client";

interface LiveKitVideoProps {
  isStreamer: boolean;
  isVideoOff: boolean;
  isConnected: boolean;
  isConnecting: boolean;
  streamerId: string;
  streamerName?: string | null;
  streamerAvatar?: string | null;
  remoteVideoTrack: Track | null;
  setLocalVideoRef: (ref: HTMLVideoElement | null) => void;
  setRemoteVideoRef: (ref: HTMLVideoElement | null) => void;
}

const LiveKitVideo = ({
  isStreamer,
  isVideoOff,
  isConnected,
  isConnecting,
  streamerId,
  streamerName,
  streamerAvatar,
  remoteVideoTrack,
  setLocalVideoRef,
  setRemoteVideoRef,
}: LiveKitVideoProps) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  const defaultAvatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${streamerId}`;

  useEffect(() => {
    if (localVideoRef.current) {
      setLocalVideoRef(localVideoRef.current);
    }
  }, [setLocalVideoRef]);

  useEffect(() => {
    if (remoteVideoRef.current) {
      setRemoteVideoRef(remoteVideoRef.current);
    }
  }, [setRemoteVideoRef]);

  // Connecting state
  if (isConnecting) {
    return (
      <div className="absolute inset-0 bg-gradient-to-br from-muted to-background flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-16 h-16 mx-auto mb-4 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Connexion au stream...</p>
        </motion.div>
      </div>
    );
  }

  // Not connected state
  if (!isConnected) {
    return (
      <div className="absolute inset-0 bg-gradient-to-br from-muted to-background flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
            <WifiOff className="w-10 h-10 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">Non connecté au stream</p>
        </motion.div>
      </div>
    );
  }

  // Streamer view
  if (isStreamer) {
    if (!isVideoOff) {
      return (
        <div className="absolute inset-0 bg-black">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
            style={{ transform: "scaleX(-1)" }}
          />
          {/* Live indicator */}
          <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-destructive/90 backdrop-blur-sm">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
            <span className="text-xs font-bold text-white">EN DIRECT</span>
          </div>
          {/* Connection status */}
          <div className="absolute top-4 right-4 flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-500/20 backdrop-blur-sm">
            <Wifi className="w-3 h-3 text-green-500" />
            <span className="text-xs text-green-500">Connecté</span>
          </div>
        </div>
      );
    }

    // Camera off state for streamer
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
        <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-destructive/90 backdrop-blur-sm">
          <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
          <span className="text-xs font-bold text-white">EN DIRECT</span>
        </div>
      </div>
    );
  }

  // Viewer view - show remote video
  if (remoteVideoTrack) {
    return (
      <div className="absolute inset-0 bg-black">
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />
        {/* Live indicator */}
        <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-destructive/90 backdrop-blur-sm">
          <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
          <span className="text-xs font-bold text-white">EN DIRECT</span>
        </div>
      </div>
    );
  }

  // Viewer waiting for video
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
            <span>En attente de la vidéo...</span>
          </div>
        </motion.div>
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

export default LiveKitVideo;
