import { motion } from "framer-motion";
import { Mic, MicOff, UserCircle, Flag, Phone, PhoneOff, Loader2 } from "lucide-react";
import { useState, memo } from "react";
import ReportModal from "./ReportModal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface InCallScreenLiveKitProps {
  timeRemaining: number;
  isConnected: boolean;
  isMuted: boolean;
  audioLevel: number;
  error: string | null;
  matchedUserId?: string;
  sessionId?: string;
  onToggleMute: () => void;
  onEndCall: () => void;
}

const InCallScreenLiveKit = memo(({ 
  timeRemaining, 
  isConnected,
  isMuted,
  audioLevel,
  error,
  matchedUserId,
  sessionId,
  onToggleMute,
  onEndCall,
}: InCallScreenLiveKitProps) => {
  const [showReportModal, setShowReportModal] = useState(false);
  const [showHangUpConfirm, setShowHangUpConfirm] = useState(false);

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
        {/* Connection status */}
        {!isConnected && !error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/20 text-primary"
          >
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm font-medium">Connexion en cours...</span>
          </motion.div>
        )}

        {isConnected && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/20 text-green-500"
          >
            <Phone className="w-4 h-4" />
            <span className="text-sm font-medium">Connecté via LiveKit</span>
          </motion.div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-destructive/20 text-destructive"
          >
            <PhoneOff className="w-4 h-4" />
            <span className="text-sm font-medium">{error}</span>
          </motion.div>
        )}

        {/* Timer */}
        <motion.div
          className={`text-5xl font-bold ${isLowTime ? "text-destructive" : "text-primary"}`}
          animate={isLowTime ? { scale: [1, 1.1, 1] } : {}}
          transition={{ duration: 0.5, repeat: isLowTime ? Infinity : 0 }}
        >
          {formatTime(timeRemaining)}
        </motion.div>

        {/* Anonymous caller visual with audio visualization */}
        <div className="relative">
          <motion.div
            className="w-36 h-36 rounded-full glass flex items-center justify-center overflow-hidden"
            animate={isConnected ? { 
              boxShadow: [
                `0 0 0 0 rgba(34, 197, 94, 0.4)`,
                `0 0 0 ${normalizedAudioLevel * 0.3}px rgba(34, 197, 94, 0)`,
              ]
            } : {}}
            transition={{ duration: 0.3 }}
          >
            <UserCircle className="w-24 h-24 text-muted-foreground" />
          </motion.div>
          
          {/* Audio wave indicator */}
          <motion.div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            {[0, 1, 2, 3, 4].map((i) => (
              <motion.div
                key={i}
                className={`w-1 rounded-full ${isConnected ? "bg-green-500" : "bg-primary"}`}
                animate={{ 
                  height: isConnected 
                    ? [4, Math.max(8, normalizedAudioLevel * 0.4 * (1 - Math.abs(i - 2) * 0.2)), 4]
                    : [4, 8, 4]
                }}
                transition={{ duration: 0.15, delay: i * 0.05 }}
              />
            ))}
          </motion.div>
        </div>

        <div className="text-center space-y-1">
          <h3 className="text-lg font-medium text-foreground">
            {isConnected ? "Appel en cours" : "Appel anonyme"}
          </h3>
          <p className="text-sm text-muted-foreground">
            {isConnected 
              ? "Vous pouvez maintenant parler" 
              : "Découvrez-vous par la voix uniquement"
            }
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-4">
          {/* Mute button */}
          <motion.button
            onClick={onToggleMute}
            className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors ${
              isMuted 
                ? "bg-destructive text-destructive-foreground" 
                : "glass text-foreground"
            }`}
            whileTap={{ scale: 0.95 }}
          >
            {isMuted ? <MicOff className="w-7 h-7" /> : <Mic className="w-7 h-7" />}
          </motion.button>

          {/* Hang up button */}
          <motion.button
            onClick={() => setShowHangUpConfirm(true)}
            className="w-16 h-16 rounded-full bg-destructive flex items-center justify-center text-destructive-foreground"
            whileTap={{ scale: 0.95 }}
          >
            <PhoneOff className="w-7 h-7" />
          </motion.button>

          {/* Report button */}
          {matchedUserId && (
            <motion.button
              onClick={() => setShowReportModal(true)}
              className="w-12 h-12 rounded-full glass flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
              whileTap={{ scale: 0.95 }}
            >
              <Flag className="w-5 h-5" />
            </motion.button>
          )}
        </div>

        {/* Info text */}
        <p className="text-xs text-muted-foreground text-center max-w-xs">
          {isConnected 
            ? "L'appel se terminera automatiquement. Vous pourrez ensuite décider si vous voulez matcher."
            : "Connexion à LiveKit en cours..."
          }
        </p>
      </motion.div>

      {/* Hang Up Confirmation Dialog */}
      <AlertDialog open={showHangUpConfirm} onOpenChange={setShowHangUpConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Raccrocher l'appel ?</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr(e) de vouloir mettre fin à cet appel ? Vous ne pourrez pas matcher avec cette personne.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={onEndCall}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Raccrocher
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {matchedUserId && (
        <ReportModal
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
          reportedUserId={matchedUserId}
          sessionId={sessionId}
        />
      )}
    </>
  );
});

InCallScreenLiveKit.displayName = "InCallScreenLiveKit";

export default InCallScreenLiveKit;
