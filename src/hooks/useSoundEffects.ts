import { useCallback, useRef, useState } from "react";

import { haptics, isNative } from "@/lib/capacitor";

// Import static audio files
import diceRollSound from "@/assets/sounds/dice-roll.mp3";
import drumrollSound from "@/assets/sounds/drumroll.mp3";
import revealMagicSound from "@/assets/sounds/reveal-magic.mp3";
import successChimeSound from "@/assets/sounds/success-chime.mp3";
import zemboVoiceSound from "@/assets/sounds/zembo-voice.mp3";

export const useSoundEffects = () => {
  const [isDrumrollPlaying, setIsDrumrollPlaying] = useState(false);
  
  // Audio refs to manage playback
  const diceAudioRef = useRef<HTMLAudioElement | null>(null);
  const drumrollAudioRef = useRef<HTMLAudioElement | null>(null);
  const revealAudioRef = useRef<HTMLAudioElement | null>(null);
  const successAudioRef = useRef<HTMLAudioElement | null>(null);
  const roseSoundCacheRef = useRef<string | null>(null);

  const playDiceSound = useCallback(() => {
    try {
      // Trigger light haptic feedback on mobile
      if (isNative) {
        haptics.impact('light');
      }
      
      // Create new audio instance for each play to allow overlapping
      const audio = new Audio(diceRollSound);
      audio.volume = 0.7;
      audio.play().catch((err) => {
        console.warn("Failed to play dice sound:", err);
      });
      diceAudioRef.current = audio;
    } catch (error) {
      console.error("Error playing dice sound:", error);
    }
  }, []);

  const playZemboVoice = useCallback(() => {
    try {
      setIsDrumrollPlaying(true);
      
      // Play drumroll
      const drumroll = new Audio(drumrollSound);
      drumroll.volume = 0.8;
      
      drumroll.onended = () => {
        // Play custom ZEMBO voice after drumroll
        const zemboAudio = new Audio(zemboVoiceSound);
        zemboAudio.volume = 1.0;
        zemboAudio.play().catch((err) => {
          console.warn("Failed to play zembo voice:", err);
        });
        
        // Trigger haptic feedback on mobile when ZEMBO plays
        if (isNative) {
          haptics.notification('success');
        }
        setTimeout(() => {
          setIsDrumrollPlaying(false);
          const success = new Audio(successChimeSound);
          success.volume = 0.6;
          success.play().catch((err) => {
            console.warn("Failed to play success sound:", err);
          });
          successAudioRef.current = success;
        }, 800);
      };
      
      drumroll.play().catch((err) => {
        console.warn("Failed to play drumroll sound:", err);
        setIsDrumrollPlaying(false);
      });
      
      drumrollAudioRef.current = drumroll;
    } catch (error) {
      console.error("Error playing zembo voice:", error);
      setIsDrumrollPlaying(false);
    }
  }, []);

  const playRevealSound = useCallback(() => {
    try {
      const audio = new Audio(revealMagicSound);
      audio.volume = 0.7;
      audio.play().catch((err) => {
        console.warn("Failed to play reveal sound:", err);
      });
      revealAudioRef.current = audio;
    } catch (error) {
      console.error("Error playing reveal sound:", error);
    }
  }, []);

  const playNotificationSound = useCallback(() => {
    try {
      // Trigger haptic feedback on mobile
      if (isNative) {
        haptics.notification('success');
      }
      
      // Play success chime as notification sound
      const audio = new Audio(successChimeSound);
      audio.volume = 0.8;
      audio.play().catch((err) => {
        console.warn("Failed to play notification sound:", err);
      });
    } catch (error) {
      console.error("Error playing notification sound:", error);
    }
  }, []);

  const playMatchSound = useCallback(() => {
    try {
      // Trigger strong haptic feedback on mobile for matches
      if (isNative) {
        haptics.notification('success');
      }
      
      // Play reveal magic sound for matches - more exciting
      const audio = new Audio(revealMagicSound);
      audio.volume = 0.9;
      audio.play().catch((err) => {
        console.warn("Failed to play match sound:", err);
      });
    } catch (error) {
      console.error("Error playing match sound:", error);
    }
  }, []);

  // Romantic harp/chime sound for receiving a rose
  const playRoseSound = useCallback(async () => {
    try {
      // Trigger gentle haptic feedback on mobile
      if (isNative) {
        haptics.notification('success');
      }
      
      // Check if we have a cached rose sound
      if (roseSoundCacheRef.current) {
        const audio = new Audio(roseSoundCacheRef.current);
        audio.volume = 0.8;
        audio.play().catch((err) => {
          console.warn("Failed to play cached rose sound:", err);
        });
        return;
      }
      
      // Generate romantic sound via ElevenLabs
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
            prompt: "Romantic magical sparkle harp glissando with soft chimes, dreamy love notification sound, gentle and enchanting",
            duration: 3,
          }),
        }
      );
      
      if (!response.ok) {
        // Fallback to reveal magic sound if ElevenLabs fails
        console.warn("ElevenLabs failed, using fallback sound");
        const audio = new Audio(revealMagicSound);
        audio.volume = 0.8;
        audio.play().catch((err) => {
          console.warn("Failed to play fallback rose sound:", err);
        });
        return;
      }
      
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      // Cache the sound for future use
      roseSoundCacheRef.current = audioUrl;
      
      const audio = new Audio(audioUrl);
      audio.volume = 0.8;
      audio.play().catch((err) => {
        console.warn("Failed to play rose sound:", err);
      });
    } catch (error) {
      console.error("Error playing rose sound:", error);
      // Fallback to reveal magic sound
      const audio = new Audio(revealMagicSound);
      audio.volume = 0.7;
      audio.play().catch((err) => {
        console.warn("Failed to play fallback rose sound:", err);
      });
    }
  }, []);

  // Sad rejection sound when match is declined
  const playRejectionSound = useCallback(async () => {
    try {
      // Trigger warning haptic feedback on mobile
      if (isNative) {
        haptics.notification('warning');
      }
      
      // Generate sad/rejection sound via ElevenLabs
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
            prompt: "Sad descending piano notes, melancholic rejection sound, gentle disappointment tone, soft and brief",
            duration: 2,
          }),
        }
      );
      
      if (!response.ok) {
        // Fallback: create a simple sad tone using Web Audio API
        console.warn("ElevenLabs failed for rejection sound");
        return;
      }
      
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      const audio = new Audio(audioUrl);
      audio.volume = 0.7;
      audio.play().catch((err) => {
        console.warn("Failed to play rejection sound:", err);
      });
    } catch (error) {
      console.error("Error playing rejection sound:", error);
    }
  }, []);

  return {
    playDiceSound,
    playZemboVoice,
    playRevealSound,
    playNotificationSound,
    playMatchSound,
    playRoseSound,
    playRejectionSound,
    isDrumrollPlaying,
  };
};
