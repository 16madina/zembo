import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Volume2, Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Haptics, ImpactStyle } from "@capacitor/haptics";

interface MicrophoneTestProps {
  onTestComplete?: (success: boolean) => void;
}

const MicrophoneTest = ({ onTestComplete }: MicrophoneTestProps) => {
  const [status, setStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [audioLevel, setAudioLevel] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const testTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const cleanup = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (testTimeoutRef.current) {
      clearTimeout(testTimeoutRef.current);
      testTimeoutRef.current = null;
    }
    analyserRef.current = null;
  }, []);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  const startTest = async () => {
    setStatus("testing");
    setErrorMessage(null);
    setAudioLevel(0);

    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });
      streamRef.current = stream;

      // Set up audio analysis
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      analyserRef.current = analyser;
      
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      let maxLevelReached = 0;
      let hasSpoken = false;

      const updateLevel = () => {
        if (!analyserRef.current) return;
        
        analyserRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        const normalizedLevel = Math.min(100, average * 1.5);
        
        setAudioLevel(normalizedLevel);
        
        if (normalizedLevel > maxLevelReached) {
          maxLevelReached = normalizedLevel;
        }
        
        // Consider test successful if audio level goes above threshold
        if (normalizedLevel > 30 && !hasSpoken) {
          hasSpoken = true;
          // Give feedback vibration
          Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
        }

        animationFrameRef.current = requestAnimationFrame(updateLevel);
      };

      updateLevel();

      // Auto-complete test after 4 seconds
      testTimeoutRef.current = setTimeout(() => {
        const success = maxLevelReached > 25;
        cleanup();
        setStatus(success ? "success" : "error");
        setErrorMessage(success ? null : "Aucun son détecté. Vérifiez votre microphone.");
        Haptics.impact({ style: success ? ImpactStyle.Medium : ImpactStyle.Heavy }).catch(() => {});
        onTestComplete?.(success);
      }, 4000);

    } catch (err) {
      console.error("[mic-test]", "Failed to access microphone:", err);
      cleanup();
      setStatus("error");
      setErrorMessage("Impossible d'accéder au microphone. Vérifiez les permissions.");
      onTestComplete?.(false);
    }
  };

  const handleRetry = () => {
    cleanup();
    setStatus("idle");
    setAudioLevel(0);
    setErrorMessage(null);
  };

  const barCount = 8;
  const getBarHeight = (index: number) => {
    if (status !== "testing") return 4;
    const center = barCount / 2;
    const distance = Math.abs(index - center);
    const falloff = 1 - (distance / center) * 0.4;
    return Math.max(4, (audioLevel / 100) * 28 * falloff);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center gap-4 p-4 rounded-2xl bg-card/50 backdrop-blur-sm border border-border/50"
    >
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Volume2 className="w-4 h-4" />
        <span>Test du microphone</span>
      </div>

      {/* VU Meter */}
      <div className="flex items-end justify-center gap-1 h-10 px-4">
        {Array.from({ length: barCount }).map((_, i) => {
          const height = getBarHeight(i);
          const isActive = status === "testing" && audioLevel > 10;
          return (
            <motion.div
              key={i}
              className={`w-2 rounded-full transition-colors ${
                status === "success" ? "bg-green-500" :
                status === "error" ? "bg-destructive" :
                isActive ? "bg-primary" : "bg-muted-foreground/30"
              }`}
              animate={{ height }}
              transition={{ type: "spring", stiffness: 400, damping: 15 }}
            />
          );
        })}
      </div>

      {/* Status indicator */}
      <AnimatePresence mode="wait">
        {status === "idle" && (
          <motion.p
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-xs text-muted-foreground text-center"
          >
            Testez votre micro avant l'appel
          </motion.p>
        )}
        
        {status === "testing" && (
          <motion.p
            key="testing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-xs text-primary text-center flex items-center gap-2"
          >
            <Loader2 className="w-3 h-3 animate-spin" />
            Parlez maintenant...
          </motion.p>
        )}
        
        {status === "success" && (
          <motion.p
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="text-xs text-green-500 text-center flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            Microphone fonctionnel !
          </motion.p>
        )}
        
        {status === "error" && (
          <motion.p
            key="error"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="text-xs text-destructive text-center flex items-center gap-2"
          >
            <X className="w-4 h-4" />
            {errorMessage}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Action button */}
      <div className="flex gap-2">
        {status === "idle" && (
          <Button
            onClick={startTest}
            size="sm"
            variant="outline"
            className="gap-2"
          >
            <Mic className="w-4 h-4" />
            Tester le micro
          </Button>
        )}
        
        {status === "testing" && (
          <Button
            onClick={cleanup}
            size="sm"
            variant="ghost"
            className="gap-2"
          >
            <MicOff className="w-4 h-4" />
            Annuler
          </Button>
        )}
        
        {(status === "success" || status === "error") && (
          <Button
            onClick={handleRetry}
            size="sm"
            variant="outline"
            className="gap-2"
          >
            <Mic className="w-4 h-4" />
            Retester
          </Button>
        )}
      </div>
    </motion.div>
  );
};

export default MicrophoneTest;
