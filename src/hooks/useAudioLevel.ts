import { useState, useRef, useEffect, useCallback } from "react";

export const useAudioLevel = (stream: MediaStream | null) => {
  const [audioLevel, setAudioLevel] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  const cleanup = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if (analyserRef.current) {
      analyserRef.current.disconnect();
      analyserRef.current = null;
    }
    // Don't close AudioContext as it may be used elsewhere
    setAudioLevel(0);
    setIsActive(false);
  }, []);

  useEffect(() => {
    if (!stream || stream.getAudioTracks().length === 0) {
      cleanup();
      return;
    }

    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) {
        console.warn("[useAudioLevel] AudioContext not supported");
        return;
      }

      // Create or reuse AudioContext
      if (!audioContextRef.current || audioContextRef.current.state === "closed") {
        audioContextRef.current = new AudioContext();
      }

      const audioContext = audioContextRef.current;
      
      // Resume if suspended
      if (audioContext.state === "suspended") {
        audioContext.resume();
      }

      // Create analyser
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      analyserRef.current = analyser;

      // Connect stream to analyser
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      sourceRef.current = source;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateLevel = () => {
        if (!analyserRef.current) return;

        analyserRef.current.getByteFrequencyData(dataArray);
        
        // Calculate average level
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const average = sum / dataArray.length;
        
        // Normalize to 0-100
        const level = Math.min(100, Math.round((average / 128) * 100));
        
        setAudioLevel(level);
        setIsActive(level > 5);

        animationFrameRef.current = requestAnimationFrame(updateLevel);
      };

      updateLevel();

      return cleanup;
    } catch (error) {
      console.error("[useAudioLevel] Error setting up audio analysis:", error);
      cleanup();
    }
  }, [stream, cleanup]);

  return { audioLevel, isActive };
};
