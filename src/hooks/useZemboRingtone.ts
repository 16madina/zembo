import { useCallback, useRef, useState } from "react";
import { haptics, isNative } from "@/lib/capacitor";

// Cache key for localStorage
const RINGTONE_CACHE_KEY = "zembo-ringtone-cache";

export const useZemboRingtone = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const cachedRingtoneRef = useRef<string | null>(null);

  // Try to get cached ringtone from localStorage
  const getCachedRingtone = useCallback((): string | null => {
    if (cachedRingtoneRef.current) return cachedRingtoneRef.current;
    
    try {
      const cached = localStorage.getItem(RINGTONE_CACHE_KEY);
      if (cached) {
        cachedRingtoneRef.current = cached;
        return cached;
      }
    } catch (error) {
      console.warn("Failed to get cached ringtone:", error);
    }
    return null;
  }, []);

  // Cache the ringtone to localStorage
  const cacheRingtone = useCallback((dataUrl: string) => {
    try {
      localStorage.setItem(RINGTONE_CACHE_KEY, dataUrl);
      cachedRingtoneRef.current = dataUrl;
    } catch (error) {
      console.warn("Failed to cache ringtone:", error);
    }
  }, []);

  // Generate premium Zembo ringtone via ElevenLabs
  const generateRingtone = useCallback(async (): Promise<string | null> => {
    setIsGenerating(true);
    
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-sfx`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            prompt: "Premium luxury phone ringtone, elegant golden chime bells with ascending melodic tones, sophisticated VIP exclusive notification sound, crystal clear harmonious notes like a luxury brand, high-end magical sparkle finish",
            duration: 5,
          }),
        }
      );

      if (!response.ok) {
        console.error("Failed to generate ringtone:", response.status);
        return null;
      }

      const audioBlob = await response.blob();
      
      // Convert blob to base64 data URL for caching
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const dataUrl = reader.result as string;
          cacheRingtone(dataUrl);
          resolve(dataUrl);
        };
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(audioBlob);
      });
    } catch (error) {
      console.error("Error generating ringtone:", error);
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [cacheRingtone]);

  // Get ringtone (from cache or generate)
  const getRingtone = useCallback(async (): Promise<string> => {
    // First try cache
    const cached = getCachedRingtone();
    if (cached) return cached;

    // Generate new ringtone
    const generated = await generateRingtone();
    if (generated) return generated;

    // Fallback to default ringtone
    return "/sounds/incoming-call.mp3";
  }, [getCachedRingtone, generateRingtone]);

  // Play the Zembo ringtone
  const playRingtone = useCallback(async (loop = true): Promise<HTMLAudioElement | null> => {
    try {
      // Trigger haptic feedback
      if (isNative) {
        haptics.notification('success');
      }

      const ringtoneUrl = await getRingtone();
      
      // Stop any currently playing ringtone
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      const audio = new Audio(ringtoneUrl);
      audio.loop = loop;
      audio.volume = 1.0;
      
      audio.onplay = () => setIsPlaying(true);
      audio.onended = () => setIsPlaying(false);
      audio.onpause = () => setIsPlaying(false);

      await audio.play();
      audioRef.current = audio;
      
      return audio;
    } catch (error) {
      console.error("Error playing Zembo ringtone:", error);
      setIsPlaying(false);
      return null;
    }
  }, [getRingtone]);

  // Stop the ringtone
  const stopRingtone = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
      setIsPlaying(false);
    }
  }, []);

  // Preview the ringtone (play once without looping)
  const previewRingtone = useCallback(async () => {
    await playRingtone(false);
  }, [playRingtone]);

  // Force regenerate the ringtone
  const regenerateRingtone = useCallback(async () => {
    // Clear cache
    try {
      localStorage.removeItem(RINGTONE_CACHE_KEY);
      cachedRingtoneRef.current = null;
    } catch (error) {
      console.warn("Failed to clear ringtone cache:", error);
    }

    // Generate new
    await generateRingtone();
  }, [generateRingtone]);

  // Check if we have a cached ringtone
  const hasCachedRingtone = useCallback(() => {
    return getCachedRingtone() !== null;
  }, [getCachedRingtone]);

  return {
    playRingtone,
    stopRingtone,
    previewRingtone,
    regenerateRingtone,
    hasCachedRingtone,
    isGenerating,
    isPlaying,
  };
};
