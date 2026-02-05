import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Camera, CameraOff, Wifi, Loader2, WifiOff, VideoOff } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Track } from "livekit-client";

interface LocalVideoPlayerProps {
  isStreamer: boolean;
  isVideoOff: boolean;
  isInitialized: boolean;
  stream: MediaStream | null;
  streamerId: string;
  streamerName?: string | null;
  streamerAvatar?: string | null;
  setVideoRef: (ref: HTMLVideoElement | null) => void;
  filterString?: string;
  // LiveKit props for viewers
  remoteVideoTrack?: Track | null;
  isLiveKitConnected?: boolean;
  isLiveKitConnecting?: boolean;
  setRemoteVideoRef?: (ref: HTMLVideoElement | null) => void;
  isStreamerVideoOff?: boolean;
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
  filterString = "none",
  remoteVideoTrack,
  isLiveKitConnected = false,
  isLiveKitConnecting = false,
  setRemoteVideoRef,
  isStreamerVideoOff = false,
}: LocalVideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  const defaultAvatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${streamerId}`;

  // Attach local stream to video element (for streamer)
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  // Mobile/WebView hardening: after turning video back ON, force play() again.
  // Some environments pause the element after track.enabled toggles.
  useEffect(() => {
    if (!isStreamer) return;
    if (!videoRef.current) return;
    if (!isInitialized) return;
    if (!stream) return;
    if (isVideoOff) return;

    const el = videoRef.current;
    // Defer one tick to let track state propagate
    const t = window.setTimeout(() => {
      el.play().catch(() => {
        // ignore: may require user interaction on some platforms
      });
    }, 50);

    return () => window.clearTimeout(t);
  }, [isStreamer, isVideoOff, isInitialized, stream]);

  // Pass ref to parent
  useEffect(() => {
    if (videoRef.current) {
      setVideoRef(videoRef.current);
    }
  }, [setVideoRef]);

  // Attach remote video track (for viewers via LiveKit)
  useEffect(() => {
    if (remoteVideoRef.current && remoteVideoTrack) {
      console.log("LocalVideoPlayer - Attaching remote video track");
      remoteVideoTrack.attach(remoteVideoRef.current);
    }
    
    return () => {
      if (remoteVideoTrack) {
        remoteVideoTrack.detach();
      }
    };
  }, [remoteVideoTrack]);

  // Pass remote ref to parent
  useEffect(() => {
    if (remoteVideoRef.current && setRemoteVideoRef) {
      setRemoteVideoRef(remoteVideoRef.current);
    }
  }, [setRemoteVideoRef]);

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
            style={{ 
              transform: "scaleX(-1)",
              filter: filterString,
            }}
          />
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

  // === VIEWER VIEW ===

  // Viewer: Show remote video if connected and track available
  if (isLiveKitConnected && remoteVideoTrack) {
    return (
      <div className="absolute inset-0 bg-black">
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />
        {/* Live indicator */}
        <div className="absolute top-16 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-destructive/90 backdrop-blur-sm z-10">
          <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
          <span className="text-xs font-bold text-white">EN DIRECT</span>
        </div>
      </div>
    );
  }

  // Viewer: Connecting to LiveKit
  if (isLiveKitConnecting) {
    return (
      <div className="absolute inset-0 bg-gradient-to-br from-muted to-background flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="relative">
            <Loader2 className="w-16 h-16 mx-auto mb-4 text-primary animate-spin" />
            <Wifi className="w-6 h-6 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-primary" />
          </div>
          <p className="text-muted-foreground">Connexion au stream...</p>
        </motion.div>
      </div>
    );
  }

  // Viewer: Connected but waiting for video
  if (isLiveKitConnected && !remoteVideoTrack) {
    // Streamer has intentionally turned off camera
    if (isStreamerVideoOff) {
      return (
        <div className="absolute inset-0 bg-gradient-to-br from-muted to-background flex items-center justify-center">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center"
          >
            <Avatar className="w-28 h-28 mx-auto mb-4 border-4 border-primary/50 shadow-lg">
              <AvatarImage src={streamerAvatar || defaultAvatar} />
              <AvatarFallback className="text-2xl">
                {streamerName?.[0] || "?"}
              </AvatarFallback>
            </Avatar>
            <h2 className="text-xl font-bold text-foreground mb-3">
              {streamerName || "Streamer"}
            </h2>
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex flex-col items-center gap-2"
            >
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted/80 backdrop-blur-sm">
                <VideoOff className="w-5 h-5 text-amber-500" />
                <span className="text-sm font-medium text-foreground">Vidéo en pause</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {streamerName || "Le streamer"} a mis sa caméra en pause
              </p>
            </motion.div>
          </motion.div>
          
          {/* Pause badge */}
          <div className="absolute top-16 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/90 backdrop-blur-sm z-10">
            <VideoOff className="w-3 h-3 text-white" />
            <span className="text-xs font-bold text-white">PAUSE</span>
          </div>
        </div>
      );
    }

    // Normal state: waiting for video track
    return (
      <div className="absolute inset-0 bg-gradient-to-br from-muted to-background flex items-center justify-center">
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
            <Wifi className="w-4 h-4 text-green-500" />
            <span>En attente de la vidéo...</span>
          </div>
        </motion.div>
      </div>
    );
  }

  // Viewer: Not connected yet - show placeholder
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
            <span>Préparation du stream...</span>
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

export default LocalVideoPlayer;
