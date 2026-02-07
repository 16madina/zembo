import { motion } from "framer-motion";
import { Mic, MicOff, UserCircle, Clock, Flag, Phone, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useWebRTC } from "@/hooks/useWebRTC";
import { useAuth } from "@/contexts/AuthContext";
import ReportModal from "./ReportModal";

interface ExtendedCallScreenProps {
  timeRemaining: number;
  otherUserId?: string;
  sessionId?: string;
}

const ExtendedCallScreen = ({ timeRemaining, otherUserId, sessionId }: ExtendedCallScreenProps) => {
  const { user } = useAuth();
  const [showReportModal, setShowReportModal] = useState(false);

  // Determine if this user is the initiator
  const isInitiator = user?.id ? user.id < (otherUserId || "") : false;

  const {
    isConnected,
    isConnecting,
    isMuted,
    audioLevel,
    startCall,
    endCall,
    toggleMute,
  } = useWebRTC({
    sessionId: sessionId || null,
    otherUserId: otherUserId || null,
    isInitiator,
  });

  // Auto-start call when component mounts (should already be connected from previous screen)
  useEffect(() => {
    if (sessionId && otherUserId && !isConnected) {
      startCall();
    }
    
    return () => {
      endCall();
    };
  }, [sessionId, otherUserId]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const isLowTime = timeRemaining <= 10;
  const normalizedAudioLevel = Math.min(100, audioLevel * 1.5);

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="flex flex-col items-center justify-center gap-6 w-full"
      >
        {/* Extended call badge */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/20 text-primary"
        >
          <Clock className="w-4 h-4" />
          <span className="text-sm font-medium">Temps supplémentaire</span>
        </motion.div>

        {/* Connection status */}
        {isConnecting && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Reconnexion...</span>
          </div>
        )}

        {isConnected && (
          <div className="flex items-center gap-2 text-sm text-green-500">
            <Phone className="w-4 h-4" />
            <span>Connecté</span>
          </div>
        )}

        {/* Timer */}
        <motion.div
          className={`text-4xl font-bold ${isLowTime ? "text-destructive" : "text-foreground"}`}
          animate={isLowTime ? { scale: [1, 1.1, 1] } : {}}
          transition={{ duration: 0.5, repeat: isLowTime ? Infinity : 0 }}
        >
          {formatTime(timeRemaining)}
        </motion.div>

        {/* Anonymous caller visual */}
        <div className="relative">
          <motion.div
            className="w-32 h-32 rounded-full glass flex items-center justify-center"
            animate={isConnected ? { 
              boxShadow: [
                `0 0 0 0 rgba(34, 197, 94, 0.4)`,
                `0 0 0 ${normalizedAudioLevel * 0.25}px rgba(34, 197, 94, 0)`,
              ]
            } : {}}
            transition={{ duration: 0.3 }}
          >
            <UserCircle className="w-20 h-20 text-muted-foreground" />
          </motion.div>
          
          {/* Audio wave indicator */}
          <motion.div
            className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex gap-1"
          >
            {[0, 1, 2, 3, 4].map((i) => (
              <motion.div
                key={i}
                className={`w-1 rounded-full ${isConnected ? "bg-green-500" : "bg-primary"}`}
                animate={{ 
                  height: isConnected
                    ? [4, Math.max(8, normalizedAudioLevel * 0.35 * (1 - Math.abs(i - 2) * 0.2)), 4]
                    : [4, 8, 4]
                }}
                transition={{ duration: 0.15, delay: i * 0.05 }}
              />
            ))}
          </motion.div>
        </div>

        <div className="text-center space-y-1">
          <h3 className="text-lg font-medium text-foreground">
            Continuez votre conversation
          </h3>
          <p className="text-sm text-muted-foreground">
            L'appel se terminera à la fin du temps
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-4">
          {/* Mute button */}
          <motion.button
            onClick={toggleMute}
            className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors ${
              isMuted 
                ? "bg-destructive text-destructive-foreground" 
                : "glass text-foreground"
            }`}
            whileTap={{ scale: 0.95 }}
          >
            {isMuted ? (
              <MicOff className="w-7 h-7" />
            ) : (
              <Mic className="w-7 h-7" />
            )}
          </motion.button>

          {/* Report button */}
          {otherUserId && (
            <motion.button
              onClick={() => setShowReportModal(true)}
              className="w-12 h-12 rounded-full glass flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
              whileTap={{ scale: 0.95 }}
            >
              <Flag className="w-5 h-5" />
            </motion.button>
          )}
        </div>

        {/* Warning text */}
        <p className="text-xs text-muted-foreground text-center max-w-xs">
          ⚠️ À la fin du temps, vous ne pourrez plus vous contacter
        </p>
      </motion.div>

      {/* Report Modal */}
      {otherUserId && (
        <ReportModal
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
          reportedUserId={otherUserId}
          sessionId={sessionId}
        />
      )}
    </>
  );
};

export default ExtendedCallScreen;
