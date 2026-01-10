import { useCallback, useRef, useEffect } from "react";

export const useSoundEffects = () => {
  const diceAudioUrlRef = useRef<string | null>(null);
  const drumrollAudioUrlRef = useRef<string | null>(null);
  const zemboAudioUrlRef = useRef<string | null>(null);
  const isLoadingDiceRef = useRef<boolean>(false);
  const isLoadingDrumrollRef = useRef<boolean>(false);
  const isLoadingZemboRef = useRef<boolean>(false);

  // Pre-load sounds on mount
  useEffect(() => {
    const preloadDiceSound = async () => {
      if (diceAudioUrlRef.current || isLoadingDiceRef.current) return;
      
      isLoadingDiceRef.current = true;
      
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
              prompt: "Dice rolling and bouncing on wooden table, casino game sound effect",
              duration: 2,
            }),
          }
        );

        if (response.ok) {
          const audioBlob = await response.blob();
          diceAudioUrlRef.current = URL.createObjectURL(audioBlob);
          console.log("Dice sound preloaded successfully");
        }
      } catch (error) {
        console.error("Error preloading dice sound:", error);
      } finally {
        isLoadingDiceRef.current = false;
      }
    };

    const preloadDrumrollSound = async () => {
      if (drumrollAudioUrlRef.current || isLoadingDrumrollRef.current) return;
      
      isLoadingDrumrollRef.current = true;
      
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
              prompt: "Intense dramatic drumroll building suspense, theatrical drum roll crescendo, epic anticipation",
              duration: 3,
            }),
          }
        );

        if (response.ok) {
          const audioBlob = await response.blob();
          drumrollAudioUrlRef.current = URL.createObjectURL(audioBlob);
          console.log("Drumroll sound preloaded successfully");
        }
      } catch (error) {
        console.error("Error preloading drumroll sound:", error);
      } finally {
        isLoadingDrumrollRef.current = false;
      }
    };

    const preloadZemboVoice = async () => {
      if (zemboAudioUrlRef.current || isLoadingZemboRef.current) return;
      
      isLoadingZemboRef.current = true;
      
      try {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({
              text: "ZEMMMMMBOOOOOO!",
            }),
          }
        );

        if (response.ok) {
          const audioBlob = await response.blob();
          zemboAudioUrlRef.current = URL.createObjectURL(audioBlob);
          console.log("Zembo voice preloaded successfully");
        }
      } catch (error) {
        console.error("Error preloading Zembo voice:", error);
      } finally {
        isLoadingZemboRef.current = false;
      }
    };

    preloadDiceSound();
    preloadDrumrollSound();
    preloadZemboVoice();
  }, []);

  const playDiceSound = useCallback(async () => {
    try {
      if (diceAudioUrlRef.current) {
        const audio = new Audio(diceAudioUrlRef.current);
        audio.volume = 0.6;
        await audio.play();
        return;
      }
      console.log("Dice sound not preloaded yet");
    } catch (error) {
      console.error("Error playing dice sound:", error);
    }
  }, []);

  const playZemboWithDrumroll = useCallback(async () => {
    try {
      // Play drumroll first
      if (drumrollAudioUrlRef.current) {
        const drumrollAudio = new Audio(drumrollAudioUrlRef.current);
        drumrollAudio.volume = 0.7;
        await drumrollAudio.play();
        
        // Wait for drumroll to build up (2.5 seconds) then play ZEMBO
        await new Promise(resolve => setTimeout(resolve, 2500));
      }
      
      // Play ZEMBO voice
      if (zemboAudioUrlRef.current) {
        const zemboAudio = new Audio(zemboAudioUrlRef.current);
        zemboAudio.volume = 1.0;
        await zemboAudio.play();
        return;
      }
      
      // Fallback: generate on-the-fly
      console.log("Zembo voice not preloaded, generating...");
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            text: "ZEMMMMMBOOOOOO!",
          }),
        }
      );

      if (response.ok) {
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        zemboAudioUrlRef.current = audioUrl;
        
        const audio = new Audio(audioUrl);
        audio.volume = 1.0;
        await audio.play();
      }
    } catch (error) {
      console.error("Error playing Zembo with drumroll:", error);
    }
  }, []);

  return { playDiceSound, playZemboVoice: playZemboWithDrumroll };
};
