import { useCallback, useRef } from "react";

export const useDiceSoundEffect = () => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);

  const playDiceSound = useCallback(async () => {
    try {
      // If we already have a cached audio, play it
      if (audioUrlRef.current) {
        const audio = new Audio(audioUrlRef.current);
        audio.volume = 0.6;
        await audio.play();
        return;
      }

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
      
      // Cache the audio URL for future plays
      audioUrlRef.current = audioUrl;
      
      const audio = new Audio(audioUrl);
      audio.volume = 0.6;
      audioRef.current = audio;
      await audio.play();
    } catch (error) {
      console.error("Error playing dice sound:", error);
    }
  }, []);

  return { playDiceSound };
};
