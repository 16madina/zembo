import { useCallback, useRef, useEffect } from "react";

export const useSoundEffects = () => {
  const diceAudioUrlRef = useRef<string | null>(null);
  const zemboAudioUrlRef = useRef<string | null>(null);
  const isLoadingDiceRef = useRef<boolean>(false);
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
              text: "ZEMMMBOOO!",
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

  const playZemboVoice = useCallback(async () => {
    try {
      if (zemboAudioUrlRef.current) {
        const audio = new Audio(zemboAudioUrlRef.current);
        audio.volume = 0.9;
        await audio.play();
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
            text: "ZEMMMBOOO!",
          }),
        }
      );

      if (response.ok) {
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        zemboAudioUrlRef.current = audioUrl;
        
        const audio = new Audio(audioUrl);
        audio.volume = 0.9;
        await audio.play();
      }
    } catch (error) {
      console.error("Error playing Zembo voice:", error);
    }
  }, []);

  return { playDiceSound, playZemboVoice };
};
