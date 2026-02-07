import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Volume2, Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { haptics, isNative, ImpactStyle } from "@/lib/capacitor";

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
      try {
        audioContextRef.current.close();
      } catch (e) {
        console.warn("[mic-test] Error closing audio context:", e);
      }
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
      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("getUserMedia not supported");
      }

      console.log("[mic-test] Requesting microphone access...");
      
      // Request microphone access with Android-compatible constraints
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          // Specify default device for Android compatibility
          deviceId: "default",
        } 
      });
      
      console.log("[mic-test] Got stream:", stream.getAudioTracks().length, "audio tracks");
      streamRef.current = stream;

      // Set up audio analysis with fallback for older browsers
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) {
        throw new Error("AudioContext not supported");
      }
      
      const audioContext = new AudioContextClass();
      audioContextRef.current = audioContext;
      
      // Resume audio context if suspended (required for Android WebView)
      if (audioContext.state === "suspended") {
        console.log("[mic-test] Resuming suspended AudioContext...");
        await audioContext.resume();
      }
      
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
          if (isNative) {
            haptics.impact(ImpactStyle.Light).catch(() => {});
          }
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
        if (isNative) {
          haptics.impact(success ? ImpactStyle.Medium : ImpactStyle.Heavy).catch(() => {});
        }
        onTestComplete?.(success);
      }, 4000);

    } catch (err: any) {
      console.error("[mic-test]", "Failed to access microphone:", err);
      cleanup();
      setStatus("error");
      
      // Provide more specific error messages
      let message = "Impossible d'accéder au microphone.";
      if (err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError") {
        message = "Permission micro refusée. Vérifiez les paramètres de l'app.";
      } else if (err?.name === "NotFoundError" || err?.name === "DevicesNotFoundError") {
        message = "Aucun microphone trouvé sur cet appareil.";
      } else if (err?.name === "NotReadableError" || err?.name === "TrackStartError") {
        message = "Le microphone est utilisé par une autre app.";
      } else if (err?.message?.includes("getUserMedia")) {
        message = "Microphone non disponible sur cet appareil.";
      }
      
      setErrorMessage(message);
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
      className="flex items-center gap-3 px-4 py-2 rounded-xl bg-card/50 backdrop-blur-sm border border-border/50"
    >
      {/* VU Meter - compact horizontal */}
      <div className="flex items-center gap-0.5 h-6">
        {Array.from({ length: barCount }).map((_, i) => {
          const height = getBarHeight(i);
          const isActive = status === "testing" && audioLevel > 10;
          return (
            <motion.div
              key={i}
              className={`w-1.5 rounded-full transition-colors ${
                status === "success" ? "bg-green-500" :
                status === "error" ? "bg-destructive" :
                isActive ? "bg-primary" : "bg-muted-foreground/30"
              }`}
              animate={{ height: Math.max(4, height * 0.8) }}
              transition={{ type: "spring", stiffness: 400, damping: 15 }}
            />
          );
        })}
      </div>

      {/* Status + Action in one row */}
      <div className="flex items-center gap-2">
        {status === "idle" && (
          <Button
            onClick={startTest}
            size="sm"
            variant="outline"
            className="gap-1.5 h-8 text-xs px-3"
          >
            <Mic className="w-3.5 h-3.5" />
            Tester micro
          </Button>
        )}
        
        {status === "testing" && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-primary flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              Parlez...
            </span>
            <Button
              onClick={cleanup}
              size="sm"
              variant="ghost"
              className="h-7 px-2"
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}
        
        {status === "success" && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-green-500 flex items-center gap-1">
              <Check className="w-3.5 h-3.5" />
              OK
            </span>
            <Button
              onClick={handleRetry}
              size="sm"
              variant="ghost"
              className="h-7 px-2"
            >
              <Mic className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}
        
        {status === "error" && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-destructive">Erreur</span>
            <Button
              onClick={handleRetry}
              size="sm"
              variant="outline"
              className="h-7 px-2 gap-1"
            >
              <Mic className="w-3.5 h-3.5" />
              Réessayer
            </Button>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default MicrophoneTest;
