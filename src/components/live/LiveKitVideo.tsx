import { useEffect, useRef, useState } from "react";
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
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [hasLocalVideo, setHasLocalVideo] = useState(false);

  const defaultAvatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${streamerId}`;

  // Initialize local camera for streamer (fallback mode when LiveKit not connected)
  useEffect(() => {
    let stream: MediaStream | null = null;

    const initLocalCamera = async () => {
      if (isStreamer && !isVideoOff && !isConnected) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "user", width: 1280, height: 720 },
            audio: true,
          });
          setLocalStream(stream);
          setHasLocalVideo(true);

          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }
        } catch (err) {
          console.error("Camera access error:", err);
          setHasLocalVideo(false);
        }
      }
    };

    initLocalCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isStreamer, isVideoOff, isConnected]);

  // Update video element when stream changes
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Handle video off - stop tracks
  useEffect(() => {
    if (localStream && isVideoOff) {
      localStream.getVideoTracks().forEach((track) => {
        track.enabled = false;
      });
    } else if (localStream && !isVideoOff) {
      localStream.getVideoTracks().forEach((track) => {
        track.enabled = true;
      });
    }
  }, [isVideoOff, localStream]);

  // Set refs for LiveKit
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

  // Streamer view - show local camera
  if (isStreamer) {
    if (!isVideoOff && (hasLocalVideo || isConnected)) {
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
        </div>
      );
    }

    // Camera off state for streamer
    if (isVideoOff) {
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

    // Connecting/initializing state
    return (
      <div className="absolute inset-0 bg-gradient-to-br from-muted to-background flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-16 h-16 mx-auto mb-4 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Initialisation de la caméra...</p>
        </motion.div>
      </div>
    );
  }

  // Viewer view - connecting state
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
        <div className="absolute top-16 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-destructive/90 backdrop-blur-sm">
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
