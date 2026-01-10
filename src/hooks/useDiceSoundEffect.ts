import { useCallback, useRef, useEffect } from "react";

export const useDiceSoundEffect = () => {
  const audioUrlRef = useRef<string | null>(null);
  const isLoadingRef = useRef<boolean>(false);

  useEffect(() => {
    const preloadSound = async () => {
      if (audioUrlRef.current || isLoadingRef.current) return;
      
      isLoadingRef.current = true;
      
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

        if (!response.ok) {
          console.error("Failed to preload dice sound:", response.status);
          return;
        }

        const audioBlob = await response.blob();
        audioUrlRef.current = URL.createObjectURL(audioBlob);
        console.log("Dice sound preloaded successfully");
      } catch (error) {
        console.error("Error preloading dice sound:", error);
      } finally {
        isLoadingRef.current = false;
      }
    };

    preloadSound();
  }, []);

  const playDiceSound = useCallback(async () => {
    try {
      if (audioUrlRef.current) {
        const audio = new Audio(audioUrlRef.current);
        audio.volume = 0.6;
        await audio.play();
        return;
      }

      console.log("Sound not preloaded, generating...");
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

      if (!response.ok) {
        console.error("Failed to generate dice sound:", response.status);
        return;
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      audioUrlRef.current = audioUrl;
      
      const audio = new Audio(audioUrl);
      audio.volume = 0.6;
      await audio.play();
    } catch (error) {
      console.error("Error playing dice sound:", error);
    }
  }, []);

  return { playDiceSound };
};
