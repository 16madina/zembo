import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, X, Send, Play, Pause, Trash2 } from "lucide-react";

interface VoiceRecorderProps {
  onSend: (audioBlob: Blob, duration: number) => Promise<void>;
  onCancel: () => void;
  isDisabled?: boolean;
}

const VoiceRecorder = ({ onSend, onCancel, isDisabled }: VoiceRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playbackIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Start recording
  const startRecording = async () => {
    try {
      // Blur active element to close keyboard
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Setup audio context for waveform
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 64;
      analyserRef.current = analyser;

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      // Setup MediaRecorder
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        setIsPreviewing(true);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setDuration(0);
      setWaveformData([]);

      // Start duration counter
      durationIntervalRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);

      // Start waveform animation
      updateWaveform();
    } catch (error) {
      console.error("Error accessing microphone:", error);
    }
  };

  // Update waveform visualization
  const updateWaveform = useCallback(() => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);

    // Get average amplitude and normalize
    const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
    const normalized = Math.min(average / 128, 1);

    setWaveformData((prev) => {
      const newData = [...prev, normalized];
      // Keep last 50 bars
      if (newData.length > 50) {
        return newData.slice(-50);
      }
      return newData;
    });

    animationFrameRef.current = requestAnimationFrame(updateWaveform);
  }, []);

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }

      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }

      streamRef.current?.getTracks().forEach((track) => track.stop());
    }
  };

  // Cancel recording
  const cancelRecording = () => {
    stopRecording();
    cleanup();
    onCancel();
  };

  // Cleanup
  const cleanup = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioBlob(null);
    setAudioUrl(null);
    setIsPreviewing(false);
    setIsPlaying(false);
    setDuration(0);
    setPlaybackTime(0);
    setWaveformData([]);
    audioChunksRef.current = [];
  };

  // Play preview
  const togglePlayback = () => {
    if (!audioRef.current || !audioUrl) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current);
      }
    } else {
      audioRef.current.play();
      setIsPlaying(true);
      playbackIntervalRef.current = setInterval(() => {
        if (audioRef.current) {
          setPlaybackTime(Math.floor(audioRef.current.currentTime));
        }
      }, 100);
    }
  };

  // Handle audio ended
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.onended = () => {
        setIsPlaying(false);
        setPlaybackTime(0);
        if (playbackIntervalRef.current) {
          clearInterval(playbackIntervalRef.current);
        }
      };
    }
  }, [audioUrl]);

  // Send audio
  const handleSend = async () => {
    if (!audioBlob) return;
    setIsSending(true);
    try {
      await onSend(audioBlob, duration);
      cleanup();
    } catch (error) {
      console.error("Error sending audio:", error);
    } finally {
      setIsSending(false);
    }
  };

  // Delete preview and restart
  const deletePreview = () => {
    cleanup();
  };

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (playbackIntervalRef.current) clearInterval(playbackIntervalRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      audioContextRef.current?.close();
    };
  }, []);

  // Not recording yet - show mic button
  if (!isRecording && !isPreviewing) {
    return (
      <motion.button
        onClick={startRecording}
        disabled={isDisabled}
        className={`p-3 rounded-full flex-shrink-0 btn-gold ${isDisabled ? "opacity-50" : ""}`}
        whileTap={{ scale: 0.9 }}
      >
        <Mic className="w-5 h-5 text-primary-foreground" />
      </motion.button>
    );
  }

  // Preview mode
  if (isPreviewing && audioUrl) {
    return (
      <div className="flex items-center gap-2 flex-1">
        <audio ref={audioRef} src={audioUrl} />
        
        {/* Delete button */}
        <motion.button
          onClick={deletePreview}
          className="p-2.5 tap-highlight rounded-full glass"
          whileTap={{ scale: 0.9 }}
        >
          <Trash2 className="w-5 h-5 text-destructive" />
        </motion.button>

        {/* Playback controls and waveform */}
        <div className="flex-1 flex items-center gap-2 glass rounded-full px-3 py-2">
          <motion.button
            onClick={togglePlayback}
            className="p-1.5 rounded-full bg-primary/20"
            whileTap={{ scale: 0.9 }}
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 text-primary" />
            ) : (
              <Play className="w-4 h-4 text-primary ml-0.5" />
            )}
          </motion.button>

          {/* Static waveform preview */}
          <div className="flex-1 flex items-center gap-0.5 h-8">
            {waveformData.map((value, index) => {
              const progress = duration > 0 ? playbackTime / duration : 0;
              const barProgress = index / waveformData.length;
              const isPlayed = barProgress <= progress;
              
              return (
                <motion.div
                  key={index}
                  className={`w-1 rounded-full transition-colors ${
                    isPlayed ? "bg-primary" : "bg-muted-foreground/40"
                  }`}
                  style={{ height: `${Math.max(value * 100, 15)}%` }}
                />
              );
            })}
          </div>

          <span className="text-xs text-muted-foreground min-w-[40px] text-right">
            {formatTime(isPlaying ? playbackTime : duration)}
          </span>
        </div>

        {/* Send button */}
        <motion.button
          onClick={handleSend}
          disabled={isSending}
          className="p-3 rounded-full flex-shrink-0 btn-gold"
          whileTap={{ scale: 0.9 }}
        >
          {isSending ? (
            <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
          ) : (
            <Send className="w-5 h-5 text-primary-foreground" />
          )}
        </motion.button>
      </div>
    );
  }

  // Recording mode
  return (
    <div className="flex items-center gap-2 flex-1">
      {/* Cancel button */}
      <motion.button
        onClick={cancelRecording}
        className="p-2.5 tap-highlight rounded-full glass"
        whileTap={{ scale: 0.9 }}
      >
        <X className="w-5 h-5 text-destructive" />
      </motion.button>

      {/* Waveform and duration */}
      <div className="flex-1 flex items-center gap-2 glass rounded-full px-3 py-2">
        {/* Recording indicator */}
        <motion.div
          className="w-3 h-3 bg-destructive rounded-full flex-shrink-0"
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
        />

        {/* Live waveform */}
        <div className="flex-1 flex items-center justify-end gap-0.5 h-8 overflow-hidden">
          <AnimatePresence mode="popLayout">
            {waveformData.slice(-35).map((value, index) => (
              <motion.div
                key={`bar-${waveformData.length - 35 + index}`}
                initial={{ scaleY: 0, opacity: 0 }}
                animate={{ scaleY: 1, opacity: 1 }}
                exit={{ scaleY: 0, opacity: 0 }}
                className="w-1 bg-primary rounded-full origin-center"
                style={{ height: `${Math.max(value * 100, 15)}%` }}
              />
            ))}
          </AnimatePresence>
        </div>

        <span className="text-xs text-foreground font-medium min-w-[40px] text-right">
          {formatTime(duration)}
        </span>
      </div>

      {/* Stop/Send button */}
      <motion.button
        onClick={stopRecording}
        className="p-3 rounded-full flex-shrink-0 btn-gold"
        whileTap={{ scale: 0.9 }}
      >
        <Send className="w-5 h-5 text-primary-foreground" />
      </motion.button>
    </div>
  );
};

export default VoiceRecorder;
