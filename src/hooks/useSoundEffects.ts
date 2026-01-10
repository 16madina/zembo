import { useCallback, useEffect, useRef } from "react";

// Avoid "Rendered more hooks than during the previous render" during Vite Fast Refresh
// when this hook's internal hook count changes.
if (import.meta.hot) {
  import.meta.hot.accept(() => {
    window.location.reload();
  });
}

type AudioUrls = {
  dice: string | null;
  drumroll: string | null;
  zembo: string | null;
};

type LoadingState = {
  dice: boolean;
  drumroll: boolean;
  zembo: boolean;
};

export const useSoundEffects = () => {
  const audioUrlsRef = useRef<AudioUrls>({
    dice: null,
    drumroll: null,
    zembo: null,
  });

  const loadingRef = useRef<LoadingState>({
    dice: false,
    drumroll: false,
    zembo: false,
  });

  useEffect(() => {
    const loadSfx = async (
      key: keyof AudioUrls,
      prompt: string,
      duration: number
    ) => {
      if (audioUrlsRef.current[key] || loadingRef.current[key]) return;

      loadingRef.current = { ...loadingRef.current, [key]: true };

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
            body: JSON.stringify({ prompt, duration }),
          }
        );

        if (!response.ok) return;

        const audioBlob = await response.blob();
        audioUrlsRef.current = {
          ...audioUrlsRef.current,
          [key]: URL.createObjectURL(audioBlob),
        };
      } catch (error) {
        console.error(`Error preloading ${key} sound:`, error);
      } finally {
        loadingRef.current = { ...loadingRef.current, [key]: false };
      }
    };

    const loadTts = async (text: string) => {
      if (audioUrlsRef.current.zembo || loadingRef.current.zembo) return;

      loadingRef.current = { ...loadingRef.current, zembo: true };

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
            body: JSON.stringify({ text }),
          }
        );

        if (!response.ok) return;

        const audioBlob = await response.blob();
        audioUrlsRef.current = {
          ...audioUrlsRef.current,
          zembo: URL.createObjectURL(audioBlob),
        };
      } catch (error) {
        console.error("Error preloading Zembo voice:", error);
      } finally {
        loadingRef.current = { ...loadingRef.current, zembo: false };
      }
    };

    void loadSfx(
      "dice",
      "Dice rolling and bouncing on wooden table, casino game sound effect",
      2
    );

    void loadSfx(
      "drumroll",
      "Intense dramatic drumroll building suspense, theatrical drum roll crescendo, epic anticipation",
      3
    );

    void loadTts("ZEMMMMMBOOOOOO!");
  }, []);

  const playDiceSound = useCallback(async () => {
    try {
      const url = audioUrlsRef.current.dice;
      if (!url) return;

      const audio = new Audio(url);
      audio.volume = 0.6;
      await audio.play();
    } catch (error) {
      console.error("Error playing dice sound:", error);
    }
  }, []);

  const playZemboVoice = useCallback(async () => {
    const playZemboNow = async () => {
      try {
        const url = audioUrlsRef.current.zembo;
        if (url) {
          const zemboAudio = new Audio(url);
          zemboAudio.volume = 1.0;
          await zemboAudio.play();
          return;
        }

        // Fallback: generate on-the-fly
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({ text: "ZEMMMMMBOOOOOO!" }),
          }
        );

        if (!response.ok) return;

        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        audioUrlsRef.current = { ...audioUrlsRef.current, zembo: audioUrl };

        const audio = new Audio(audioUrl);
        audio.volume = 1.0;
        await audio.play();
      } catch (error) {
        console.error("Error playing Zembo voice:", error);
      }
    };

    try {
      const drumUrl = audioUrlsRef.current.drumroll;
      if (!drumUrl) {
        await playZemboNow();
        return;
      }

      const drumAudio = new Audio(drumUrl);
      drumAudio.volume = 0.75;

      drumAudio.onended = () => {
        void playZemboNow();
      };

      await drumAudio.play();
    } catch (error) {
      console.error("Error playing drumroll:", error);
      await playZemboNow();
    }
  }, []);

  return { playDiceSound, playZemboVoice };
};
