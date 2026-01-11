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
    <div className="absolute bottom-20 left-0 right-0 flex justify-center gap-3 z-30">
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log("Toggle mute clicked, current:", isMuted);
          onToggleMute();
        }}
        className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-lg active:scale-90",
          isMuted
            ? "bg-destructive text-destructive-foreground"
            : "bg-background/90 text-foreground border border-border"
        )}
      >
        {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
      </button>

      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log("Toggle video clicked, current:", isVideoOff);
          onToggleVideo();
        }}
        className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-lg active:scale-90",
          isVideoOff
            ? "bg-destructive text-destructive-foreground"
            : "bg-background/90 text-foreground border border-border"
        )}
      >
        {isVideoOff ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
      </button>

      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log("Switch camera clicked");
          onSwitchCamera();
        }}
        className="w-10 h-10 rounded-full bg-background/90 text-foreground border border-border flex items-center justify-center shadow-lg active:scale-90 transition-all"
      >
        <SwitchCamera className="w-4 h-4" />
      </button>

      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log("End stream clicked");
          onEndStream();
        }}
        className="w-10 h-10 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-lg active:scale-90 transition-all"
      >
        <PhoneOff className="w-4 h-4" />
      </button>
    </div>
  );
};

export default StreamControls;
