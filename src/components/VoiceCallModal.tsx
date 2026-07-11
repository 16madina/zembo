import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, PhoneOff, Mic, MicOff, Video, Volume2, VolumeX, Wifi, MoreVertical, Flag, Ban } from "lucide-react";
import { useEffect, useRef, useCallback, useState } from "react";
import { useZemboRingtone } from "@/hooks/useZemboRingtone";
import { useAudioLevel } from "@/hooks/useAudioLevel";
// AudioLevelMeter removed with random-call cleanup
import ReportModal from "@/components/ReportModal";
import BlockUserModal from "@/components/BlockUserModal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { haptics, isNative, ImpactStyle } from "@/lib/capacitor";

interface VoiceCallModalProps {
  isOpen: boolean;
  isRinging: boolean;
  isIncoming: boolean;
  isInCall: boolean;
  callType: "audio" | "video";
  remoteUserName: string | null;
  remoteUserPhoto: string | null;
  remoteUserId?: string;
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
  remoteUserId,
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
  const { playRingtone, stopRingtone } = useZemboRingtone();
  const outgoingToneRef = useRef<HTMLAudioElement | null>(null);
  const zemboRingtoneRef = useRef<HTMLAudioElement | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  
  // Safety modals
  const [showReportModal, setShowReportModal] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  
  // Audio level monitoring
  const { audioLevel: remoteAudioLevel, isActive: remoteAudioActive } = useAudioLevel(remoteStreamRef?.current || null);
  const { audioLevel: localAudioLevel, isActive: localAudioActive } = useAudioLevel(localStreamRef?.current || null);
  
  // Audio connection status
  const [audioStatus, setAudioStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const audioRetryCountRef = useRef(0);
  const audioRetryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Force audio playback on iOS - must be triggered by user interaction
  const unlockAudio = useCallback(() => {
    // Create silent audio context to unlock audio on iOS
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContext) {
      const ctx = new AudioContext();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
    }
    
    // The remote audio is handled by the persistent element in useVoiceCall
    // Just mark as connected since the element handles playback
    console.log("[VoiceCall] Audio unlocked");
    setAudioStatus('connected');
  }, []);

  // Reset audio status when call starts
  useEffect(() => {
    if (isInCall) {
      setAudioStatus('connecting');
      audioRetryCountRef.current = 0;
    } else {
      setAudioStatus('connecting');
      audioRetryCountRef.current = 0;
    }
    
    return () => {
      if (audioRetryTimeoutRef.current) {
        clearTimeout(audioRetryTimeoutRef.current);
      }
    };
  }, [isInCall]);

  // Play ringtone when ringing (incoming call)
  useEffect(() => {
    if (isRinging && isIncoming) {
      // Incoming call - play Zembo premium ringtone
      playRingtone(true).then((audio) => {
        zemboRingtoneRef.current = audio;
      });
    } else if (isRinging && !isIncoming) {
      // Outgoing call - play dialing tone
      outgoingToneRef.current = new Audio("/sounds/outgoing-call.mp3");
      outgoingToneRef.current.loop = true;
      outgoingToneRef.current.volume = 0.5;
      outgoingToneRef.current.play().catch(() => {});
    }

    return () => {
      stopRingtone();
      if (outgoingToneRef.current) {
        outgoingToneRef.current.pause();
        outgoingToneRef.current = null;
      }
    };
  }, [isRinging, isIncoming, playRingtone, stopRingtone]);

  // Stop tones when call is answered and unlock audio
  useEffect(() => {
    if (isInCall) {
      stopRingtone();
      if (outgoingToneRef.current) {
        outgoingToneRef.current.pause();
        outgoingToneRef.current = null;
      }
      
      // Force unlock audio playback when call connects
      unlockAudio();
    }
  }, [isInCall, unlockAudio, stopRingtone]);

  // Attach local video stream
  useEffect(() => {
    if (callType === "video" && isInCall && localVideoRef.current && localStreamRef?.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
      localVideoRef.current.play().catch(console.error);
    }
  }, [isInCall, callType, localStreamRef?.current]);

  // Attach remote video stream (audio is handled by persistent element in useVoiceCall)
  useEffect(() => {
    if (isInCall && remoteStreamRef?.current) {
      // Attach to video element for video calls
      if (callType === "video" && remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStreamRef.current;
        remoteVideoRef.current.play().catch(console.error);
      }
      
      // Mark audio as connected since it's handled by the persistent element
      setAudioStatus('connected');
    }
  }, [isInCall, callType, remoteStreamRef?.current]);

  // Auto-mark as connected after a short delay if still connecting
  // This handles cases where audio works but play() promise doesn't resolve properly
  useEffect(() => {
    if (isInCall && audioStatus === 'connecting') {
      const timeout = setTimeout(() => {
        // After 3 seconds in call, if still "connecting", assume audio is working
        // (user would have complained by now otherwise)
        if (audioStatus === 'connecting') {
          console.log("[VoiceCall] Auto-marking audio as connected after timeout");
          setAudioStatus('connected');
        }
      }, 3000);
      
      return () => clearTimeout(timeout);
    }
  }, [isInCall, audioStatus]);

  // Audio status indicator component
  const AudioStatusIndicator = () => {
    if (!isInCall) return null;
    
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
          audioStatus === 'connected' 
            ? 'bg-success/20 text-success' 
            : audioStatus === 'error'
            ? 'bg-destructive/20 text-destructive'
            : 'bg-muted text-muted-foreground'
        }`}
      >
        {audioStatus === 'connected' ? (
          <>
            <Volume2 className="w-3.5 h-3.5" />
            <span>Audio connecté</span>
            <motion.div
              className="w-2 h-2 rounded-full bg-success"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          </>
        ) : audioStatus === 'error' ? (
          <>
            <VolumeX className="w-3.5 h-3.5" />
            <span>Erreur audio</span>
          </>
        ) : (
          <>
            <Wifi className="w-3.5 h-3.5 animate-pulse" />
            <span>Connexion...</span>
          </>
        )}
      </motion.div>
    );
  };

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
        {/* Audio is handled by persistent element in useVoiceCall hook */}

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
            <div className="absolute top-8 left-0 right-0 z-10 flex flex-col items-center gap-2">
              <h2 className="text-xl font-bold text-white drop-shadow-lg">
                {remoteUserName || "Utilisateur"}
              </h2>
              <p className="text-white/80 text-sm">{formatDuration(duration)}</p>
              <AudioStatusIndicator />
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
              <div className="flex items-center gap-2 mb-4">
                {callType === "video" ? (
                  <Video className="w-5 h-5 text-primary" />
                ) : (
                  <Phone className="w-5 h-5 text-primary" />
                )}
                <span className="text-sm text-muted-foreground">
                  {callType === "video" ? "Appel vidéo" : "Appel vocal"}
                </span>
              </div>
              
              {/* Audio status indicator */}
              <AudioStatusIndicator />
              
              {/* Real-time audio level meter */}
              {/* Audio level meter removed */}
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
              {/* Safety menu */}
              {remoteUserId && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      className="w-12 h-12 rounded-full glass flex items-center justify-center text-muted-foreground"
                    >
                      <MoreVertical className="w-5 h-5" />
                    </motion.button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem
                      onClick={() => setShowReportModal(true)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Flag className="w-4 h-4 mr-2" />
                      Signaler
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setShowBlockModal(true)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Ban className="w-4 h-4 mr-2" />
                      Bloquer
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => {
                  if (isNative) {
                    haptics.impact(ImpactStyle.Medium);
                  }
                  onToggleMute();
                }}
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
                onClick={() => {
                  if (isNative) {
                    haptics.impact(ImpactStyle.Heavy);
                  }
                  onEnd();
                }}
                className="w-16 h-16 rounded-full bg-destructive flex items-center justify-center"
              >
                <PhoneOff className="w-7 h-7 text-destructive-foreground" />
              </motion.button>
            </div>
          )}
        </div>

        {/* Safety Modals - Using portals for proper z-index */}
        {remoteUserId && createPortal(
          <>
            <ReportModal
              isOpen={showReportModal}
              onClose={() => setShowReportModal(false)}
              reportedUserId={remoteUserId}
            />
            <BlockUserModal
              isOpen={showBlockModal}
              onClose={() => setShowBlockModal(false)}
              userId={remoteUserId}
              userName={remoteUserName || undefined}
            />
          </>,
          document.body
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default VoiceCallModal;
