import { motion } from "framer-motion";
import { Mic, MicOff, Video, VideoOff, SwitchCamera, PhoneOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface StreamControlsProps {
  isMuted: boolean;
  isVideoOff: boolean;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onSwitchCamera: () => void;
  onEndStream: () => void;
  isStreamer: boolean;
}

const StreamControls = ({
  isMuted,
  isVideoOff,
  onToggleMute,
  onToggleVideo,
  onSwitchCamera,
  onEndStream,
  isStreamer,
}: StreamControlsProps) => {
  if (!isStreamer) return null;

  return (
    <div className="absolute bottom-32 left-0 right-0 flex justify-center gap-4">
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={onToggleMute}
        className={cn(
          "w-12 h-12 rounded-full flex items-center justify-center transition-colors",
          isMuted
            ? "bg-destructive text-destructive-foreground"
            : "bg-background/80 text-foreground"
        )}
      >
        {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
      </motion.button>

      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={onToggleVideo}
        className={cn(
          "w-12 h-12 rounded-full flex items-center justify-center transition-colors",
          isVideoOff
            ? "bg-destructive text-destructive-foreground"
            : "bg-background/80 text-foreground"
        )}
      >
        {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
      </motion.button>

      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={onSwitchCamera}
        className="w-12 h-12 rounded-full bg-background/80 text-foreground flex items-center justify-center"
      >
        <SwitchCamera className="w-6 h-6" />
      </motion.button>

      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={onEndStream}
        className="w-12 h-12 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
      >
        <PhoneOff className="w-6 h-6" />
      </motion.button>
    </div>
  );
};

export default StreamControls;
