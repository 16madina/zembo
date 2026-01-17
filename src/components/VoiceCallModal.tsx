import { motion, AnimatePresence } from "framer-motion";
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff } from "lucide-react";
import { useEffect, useRef, useCallback } from "react";

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
  localStreamRef?: React.RefObject<MediaStream | null>;
  remoteStreamRef?: React.RefObject<MediaStream | null>;
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
  localStreamRef,
  remoteStreamRef,
}: VoiceCallModalProps) => {
  const ringtoneRef = useRef<HTMLAudioElement | null>(null);
  const outgoingToneRef = useRef<HTMLAudioElement | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  // Force audio playback on iOS - must be triggered by user interaction
  const unlockAudio = useCallback(() => {
    if (remoteAudioRef.current) {
      // Create silent audio context to unlock audio on iOS
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContext) {
        const ctx = new AudioContext();
        if (ctx.state === 'suspended') {
          ctx.resume();
        }
      }
      
      // Try to play the audio element
      remoteAudioRef.current.muted = false;
      remoteAudioRef.current.volume = 1.0;
      remoteAudioRef.current.play().then(() => {
        console.log("[VoiceCall] Remote audio playback started");
      }).catch((err) => {
        console.warn("[VoiceCall] Failed to play remote audio:", err);
      });
    }
  }, [remoteAudioRef]);

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

  // Stop tones when call is answered and unlock audio
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
      
      // Force unlock audio playback when call connects
      unlockAudio();
    }
  }, [isInCall, unlockAudio]);

  // Attach local video stream
  useEffect(() => {
    if (callType === "video" && isInCall && localVideoRef.current && localStreamRef?.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
      localVideoRef.current.play().catch(console.error);
    }
  }, [isInCall, callType, localStreamRef?.current]);

  // Attach remote video/audio stream
  useEffect(() => {
    if (isInCall && remoteStreamRef?.current) {
      // Attach to video element for video calls
      if (callType === "video" && remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStreamRef.current;
        remoteVideoRef.current.play().catch(console.error);
      }
      
      // Always attach to audio element for audio playback
      if (remoteAudioRef.current && remoteStreamRef.current) {
        remoteAudioRef.current.srcObject = remoteStreamRef.current;
        remoteAudioRef.current.muted = false;
        remoteAudioRef.current.volume = 1.0;
        remoteAudioRef.current.play().then(() => {
          console.log("[VoiceCall] Remote audio attached and playing");
        }).catch((err) => {
          console.warn("[VoiceCall] Failed to play remote audio on attach:", err);
        });
      }
    }
  }, [isInCall, callType, remoteStreamRef?.current, remoteAudioRef]);

  if (!isOpen) return null;

  const isVideoCall = callType === "video";
  const showVideoUI = isVideoCall && isInCall;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center"
        style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {/* Hidden audio element for remote stream (for audio-only or fallback) */}
        <audio 
          ref={remoteAudioRef} 
          autoPlay 
          playsInline
          // @ts-ignore - webkit attribute for iOS
          webkit-playsinline="true"
          style={{ display: 'none' }}
        />

        {/* Video call UI */}
        {showVideoUI ? (
          <>
            {/* Remote video - fullscreen */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="absolute inset-0 w-full h-full object-cover bg-black"
            />
            
            {/* Overlay gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30" />
            
            {/* Local video - PiP in corner */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="absolute top-20 right-4 w-28 h-40 rounded-2xl overflow-hidden border-2 border-primary/50 shadow-xl z-20"
            >
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover bg-muted"
              />
            </motion.div>

            {/* Call info overlay */}
            <div className="absolute top-8 left-0 right-0 z-10 flex flex-col items-center">
              <h2 className="text-xl font-bold text-white drop-shadow-lg">
                {remoteUserName || "Utilisateur"}
              </h2>
              <p className="text-white/80 text-sm">{formatDuration(duration)}</p>
            </div>
          </>
        ) : (
          <>
            {/* Background gradient for audio call */}
            <div className="absolute inset-0 bg-gradient-to-b from-primary/20 via-background to-background" />

            {/* Audio call content */}
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
          </>
        )}

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
