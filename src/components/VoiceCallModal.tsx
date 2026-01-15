import { motion, AnimatePresence } from "framer-motion";
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff } from "lucide-react";
import { useEffect, useRef } from "react";

interface VoiceCallModalProps {
  isOpen: boolean;
  isRinging: boolean;
  isIncoming: boolean;
  isInCall: boolean;
  callType: "audio" | "video";
  remoteUserName: string | null;
  remoteUserPhoto: string | null;
  isMuted: boolean;
  duration: number;
  onAccept: () => void;
  onReject: () => void;
  onEnd: () => void;
  onToggleMute: () => void;
  formatDuration: (seconds: number) => string;
  remoteAudioRef: React.RefObject<HTMLAudioElement>;
}

const VoiceCallModal = ({
  isOpen,
  isRinging,
  isIncoming,
  isInCall,
  callType,
  remoteUserName,
  remoteUserPhoto,
  isMuted,
  duration,
  onAccept,
  onReject,
  onEnd,
  onToggleMute,
  formatDuration,
  remoteAudioRef,
}: VoiceCallModalProps) => {
  const ringtoneRef = useRef<HTMLAudioElement | null>(null);
  const outgoingToneRef = useRef<HTMLAudioElement | null>(null);

  // Play ringtone when ringing (incoming call)
  useEffect(() => {
    if (isRinging && isIncoming) {
      // Incoming call - play ringtone
      ringtoneRef.current = new Audio("/sounds/incoming-call.mp3");
      ringtoneRef.current.loop = true;
      ringtoneRef.current.volume = 1.0;
      ringtoneRef.current.play().catch(() => {});
    } else if (isRinging && !isIncoming) {
      // Outgoing call - play dialing tone
      outgoingToneRef.current = new Audio("/sounds/outgoing-call.mp3");
      outgoingToneRef.current.loop = true;
      outgoingToneRef.current.volume = 0.5;
      outgoingToneRef.current.play().catch(() => {});
    }

    return () => {
      if (ringtoneRef.current) {
        ringtoneRef.current.pause();
        ringtoneRef.current = null;
      }
      if (outgoingToneRef.current) {
        outgoingToneRef.current.pause();
        outgoingToneRef.current = null;
      }
    };
  }, [isRinging, isIncoming]);

  // Stop tones when call is answered
  useEffect(() => {
    if (isInCall) {
      if (ringtoneRef.current) {
        ringtoneRef.current.pause();
        ringtoneRef.current = null;
      }
      if (outgoingToneRef.current) {
        outgoingToneRef.current.pause();
        outgoingToneRef.current = null;
      }
    }
  }, [isInCall]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center"
        style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {/* Hidden audio element for remote stream */}
        <audio ref={remoteAudioRef} autoPlay playsInline />

        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/20 via-background to-background" />

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center justify-center flex-1 px-8">
          {/* Profile Picture */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative mb-8"
          >
            <div className="w-32 h-32 rounded-full overflow-hidden ring-4 ring-primary/30">
              {remoteUserPhoto ? (
                <img
                  src={remoteUserPhoto}
                  alt={remoteUserName || "User"}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  <span className="text-4xl font-bold text-muted-foreground">
                    {remoteUserName?.charAt(0) || "?"}
                  </span>
                </div>
              )}
            </div>

            {/* Ringing animation */}
            {isRinging && (
              <>
                <motion.div
                  className="absolute inset-0 rounded-full border-4 border-primary"
                  animate={{ scale: [1, 1.3, 1.3], opacity: [0.5, 0, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
                <motion.div
                  className="absolute inset-0 rounded-full border-4 border-primary"
                  animate={{ scale: [1, 1.5, 1.5], opacity: [0.3, 0, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
                />
              </>
            )}
          </motion.div>

          {/* Name */}
          <h2 className="text-2xl font-bold text-foreground mb-2">
            {remoteUserName || "Utilisateur"}
          </h2>

          {/* Status */}
          <p className="text-muted-foreground mb-8">
            {isRinging && isIncoming && "Appel entrant..."}
            {isRinging && !isIncoming && "Appel en cours..."}
            {isInCall && formatDuration(duration)}
          </p>

          {/* Call type indicator */}
          <div className="flex items-center gap-2 mb-8">
            {callType === "video" ? (
              <Video className="w-5 h-5 text-primary" />
            ) : (
              <Phone className="w-5 h-5 text-primary" />
            )}
            <span className="text-sm text-muted-foreground">
              {callType === "video" ? "Appel vidéo" : "Appel vocal"}
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="relative z-10 pb-12 px-8">
          {isRinging && isIncoming ? (
            // Incoming call controls
            <div className="flex items-center justify-center gap-12">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={onReject}
                className="w-16 h-16 rounded-full bg-destructive flex items-center justify-center"
              >
                <PhoneOff className="w-7 h-7 text-destructive-foreground" />
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={onAccept}
                className="w-16 h-16 rounded-full bg-success flex items-center justify-center"
              >
                <Phone className="w-7 h-7 text-white" />
              </motion.button>
            </div>
          ) : isRinging ? (
            // Outgoing call - waiting for answer
            <div className="flex items-center justify-center">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={onEnd}
                className="w-16 h-16 rounded-full bg-destructive flex items-center justify-center"
              >
                <PhoneOff className="w-7 h-7 text-destructive-foreground" />
              </motion.button>
            </div>
          ) : (
            // In call controls
            <div className="flex items-center justify-center gap-8">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={onToggleMute}
                className={`w-14 h-14 rounded-full flex items-center justify-center ${
                  isMuted ? "bg-destructive" : "glass"
                }`}
              >
                {isMuted ? (
                  <MicOff className="w-6 h-6 text-destructive-foreground" />
                ) : (
                  <Mic className="w-6 h-6 text-foreground" />
                )}
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={onEnd}
                className="w-16 h-16 rounded-full bg-destructive flex items-center justify-center"
              >
                <PhoneOff className="w-7 h-7 text-destructive-foreground" />
              </motion.button>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default VoiceCallModal;
