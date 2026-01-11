import { useCallback, useRef, useState } from "react";

// Import static audio files
import diceRollSound from "@/assets/sounds/dice-roll.mp3";
import drumrollSound from "@/assets/sounds/drumroll.mp3";
import revealMagicSound from "@/assets/sounds/reveal-magic.mp3";
import successChimeSound from "@/assets/sounds/success-chime.mp3";

// Function to speak "ZEMBO" using Web Speech API
const speakZembo = () => {
  if ('speechSynthesis' in window) {
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance("ZEMBOO");
    utterance.rate = 0.6; // Slower for dramatic effect
    utterance.pitch = 0.3; // Very deep voice
    utterance.volume = 1.0;
    
    // Try to find a deep male voice
    const voices = window.speechSynthesis.getVoices();
    const deepVoice = voices.find(v => 
      v.name.toLowerCase().includes('male') || 
      v.name.toLowerCase().includes('daniel') ||
      v.name.toLowerCase().includes('thomas') ||
      v.lang.startsWith('fr')
    ) || voices[0];
    
    if (deepVoice) {
      utterance.voice = deepVoice;
    }
    
    window.speechSynthesis.speak(utterance);
  }
};

export const useSoundEffects = () => {
  const [isDrumrollPlaying, setIsDrumrollPlaying] = useState(false);
  
  // Audio refs to manage playback
  const diceAudioRef = useRef<HTMLAudioElement | null>(null);
  const drumrollAudioRef = useRef<HTMLAudioElement | null>(null);
  const revealAudioRef = useRef<HTMLAudioElement | null>(null);
  const successAudioRef = useRef<HTMLAudioElement | null>(null);

  const playDiceSound = useCallback(() => {
    try {
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
        // Speak "ZEMBO" with dramatic voice after drumroll
        speakZembo();
        
        // Play success chime after a short delay
        setTimeout(() => {
          setIsDrumrollPlaying(false);
          const success = new Audio(successChimeSound);
          success.volume = 0.6;
          success.play().catch((err) => {
            console.warn("Failed to play success sound:", err);
          });
          successAudioRef.current = success;
        }, 800); // Wait for ZEMBO speech to complete
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

  return {
    playDiceSound,
    playZemboVoice,
    playRevealSound,
    isDrumrollPlaying,
  };
};
