import { useRef, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Camera, CameraOff } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface VideoPlayerProps {
  isStreamer: boolean;
  isVideoOff: boolean;
  streamerId: string;
  streamerName?: string | null;
  streamerAvatar?: string | null;
  demoMode?: boolean;
}

const VideoPlayer = ({
  isStreamer,
  isVideoOff,
  streamerId,
  streamerName,
  streamerAvatar,
  demoMode = true,
}: VideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasCamera, setHasCamera] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const defaultAvatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${streamerId}`;

  useEffect(() => {
    const initCamera = async () => {
      if (isStreamer && demoMode && !isVideoOff) {
        try {
          const mediaStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "user", width: 1280, height: 720 },
            audio: true,
          });
          setStream(mediaStream);
          setHasCamera(true);

          if (videoRef.current) {
            videoRef.current.srcObject = mediaStream;
          }
        } catch (err) {
          console.error("Camera access error:", err);
          setHasCamera(false);
        }
      }
    };

    initCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isStreamer, demoMode, isVideoOff]);

  // Handle video off state
  useEffect(() => {
    if (stream && isVideoOff) {
      stream.getVideoTracks().forEach((track) => {
        track.enabled = false;
      });
    } else if (stream && !isVideoOff) {
      stream.getVideoTracks().forEach((track) => {
        track.enabled = true;
      });
    }
  }, [isVideoOff, stream]);

  // Streamer view with camera
  if (isStreamer && demoMode) {
    if (hasCamera && !isVideoOff) {
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
          <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-destructive/90 backdrop-blur-sm">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
            <span className="text-xs font-bold text-white">EN DIRECT</span>
          </div>
        </div>
      );
    }

    // Camera off state
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

  // Viewer view - show streamer's video or placeholder
  if (!isStreamer) {
    return (
      <div className="absolute inset-0 bg-gradient-to-br from-muted to-background">
        {/* Demo mode placeholder for viewers */}
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
              <span>Mode démo - LiveKit à intégrer</span>
            </div>
          </motion.div>
        </div>

        {/* Animated background elements */}
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
  }

  return null;
};

export default VideoPlayer;
