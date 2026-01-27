import { useCallback, useRef, useState, useEffect } from "react";

import { haptics, isNative } from "@/lib/capacitor";

// Import static audio files
import diceRollSound from "@/assets/sounds/dice-roll.mp3";
import drumrollSound from "@/assets/sounds/drumroll.mp3";
import revealMagicSound from "@/assets/sounds/reveal-magic.mp3";
import successChimeSound from "@/assets/sounds/success-chime.mp3";
import zemboVoiceSound from "@/assets/sounds/zembo-voice.mp3";

// Cache for dynamically generated sounds
let flameSoundCache: string | null = null;

// Sound settings key
const SOUND_ENABLED_KEY = "zembo-sounds-enabled";

// Helper to get sound preference
export const getSoundsEnabled = (): boolean => {
  const saved = localStorage.getItem(SOUND_ENABLED_KEY);
  return saved === null ? true : saved === "true";
};

// Helper to set sound preference
export const setSoundsEnabled = (enabled: boolean): void => {
  localStorage.setItem(SOUND_ENABLED_KEY, String(enabled));
  window.dispatchEvent(new Event("zembo-sounds-changed"));
};

export const useSoundEffects = () => {
  const [isDrumrollPlaying, setIsDrumrollPlaying] = useState(false);
  const [soundsEnabled, setSoundsEnabledState] = useState(getSoundsEnabled);
  
  // Audio refs to manage playback
  const diceAudioRef = useRef<HTMLAudioElement | null>(null);
  const drumrollAudioRef = useRef<HTMLAudioElement | null>(null);
  const revealAudioRef = useRef<HTMLAudioElement | null>(null);
  const successAudioRef = useRef<HTMLAudioElement | null>(null);
  const roseSoundCacheRef = useRef<string | null>(null);

  // Listen for sound preference changes
  useEffect(() => {
    const handleSoundsChanged = () => {
      setSoundsEnabledState(getSoundsEnabled());
    };
    window.addEventListener("zembo-sounds-changed", handleSoundsChanged);
    return () => window.removeEventListener("zembo-sounds-changed", handleSoundsChanged);
  }, []);

  const playDiceSound = useCallback(() => {
    if (!soundsEnabled) return;
    try {
      // Trigger medium haptic feedback on mobile for better sensation
      if (isNative) {
        haptics.impact('medium');
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
  }, [soundsEnabled]);

  const playZemboVoice = useCallback(() => {
    if (!soundsEnabled) return;
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
  }, [soundsEnabled]);

  const playRevealSound = useCallback(() => {
    if (!soundsEnabled) return;
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
  }, [soundsEnabled]);

  const playNotificationSound = useCallback(() => {
    if (!soundsEnabled) return;
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
  }, [soundsEnabled]);

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

  // Flame sound for ZFlamme (super like)
  const playFlameSound = useCallback(async () => {
    try {
      // Trigger heavy haptic feedback on mobile for ZFlamme
      if (isNative) {
        haptics.notification('success');
      }
      
      // Check if we have a cached flame sound
      if (flameSoundCache) {
        const audio = new Audio(flameSoundCache);
        audio.volume = 0.85;
        audio.play().catch((err) => {
          console.warn("Failed to play cached flame sound:", err);
        });
        return;
      }
      
      // Generate fire/flame sound via ElevenLabs
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
            prompt: "Magical fire ignition whoosh with crackling flames, powerful yet romantic fire burst, warm and passionate sound effect",
            duration: 2,
          }),
        }
      );
      
      if (!response.ok) {
        // Fallback to reveal magic sound if ElevenLabs fails
        console.warn("ElevenLabs failed for flame sound, using fallback");
        const audio = new Audio(revealMagicSound);
        audio.volume = 0.8;
        audio.play().catch((err) => {
          console.warn("Failed to play fallback flame sound:", err);
        });
        return;
      }
      
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      // Cache the sound for future use
      flameSoundCache = audioUrl;
      
      const audio = new Audio(audioUrl);
      audio.volume = 0.85;
      audio.play().catch((err) => {
        console.warn("Failed to play flame sound:", err);
      });
    } catch (error) {
      console.error("Error playing flame sound:", error);
      // Fallback to reveal magic sound
      const audio = new Audio(revealMagicSound);
      audio.volume = 0.7;
      audio.play().catch((err) => {
        console.warn("Failed to play fallback flame sound:", err);
      });
    }
  }, []);

  // Very subtle navigation tab sound - soft tick
  const playNavSound = useCallback(() => {
    if (!soundsEnabled) return;
    try {
      // Light haptic feedback on mobile
      if (isNative) {
        haptics.impact('light');
      }
      
      // Create an ultra-subtle "tick" sound using Web Audio API
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Create oscillator for a very soft tick
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Very soft, brief tick - lower frequency and volume
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.03);
      
      // Ultra-quiet and very brief
      gainNode.gain.setValueAtTime(0.06, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.04);
      
      oscillator.type = 'sine';
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.04);
      
      // Cleanup
      oscillator.onended = () => {
        audioContext.close();
      };
    } catch (error) {
      // Silent fail - navigation sound is non-critical
    }
  }, [soundsEnabled]);

  // Toggle sounds function
  const toggleSounds = useCallback((enabled: boolean) => {
    setSoundsEnabled(enabled);
  }, []);

  return {
    playDiceSound,
    playZemboVoice,
    playRevealSound,
    playNotificationSound,
    playMatchSound,
    playRoseSound,
    playRejectionSound,
    playFlameSound,
    playNavSound,
    isDrumrollPlaying,
    soundsEnabled,
    toggleSounds,
  };
};
