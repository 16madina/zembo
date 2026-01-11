import { useState, useRef, useCallback, useEffect } from "react";

export interface BeautySettings {
  smoothness: number; // 0-100 - skin smoothing
  brightness: number; // 0-100 - brightness adjustment
  contrast: number; // 0-100 - contrast adjustment
  saturation: number; // 0-100 - color saturation
  warmth: number; // 0-100 - warm/cool tone
  sharpness: number; // 0-100 - sharpness
}

const DEFAULT_SETTINGS: BeautySettings = {
  smoothness: 30,
  brightness: 50,
  contrast: 50,
  saturation: 50,
  warmth: 50,
  sharpness: 40,
};

export const useBeautyFilters = () => {
  const [settings, setSettings] = useState<BeautySettings>(DEFAULT_SETTINGS);
  const [isEnabled, setIsEnabled] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);

  // Generate CSS filter string based on settings
  const getFilterString = useCallback(() => {
    if (!isEnabled) return "none";

    const brightness = settings.brightness / 50; // 0-2 range, 1 = normal
    const contrast = settings.contrast / 50; // 0-2 range, 1 = normal
    const saturation = settings.saturation / 50; // 0-2 range, 1 = normal
    const blur = (settings.smoothness / 100) * 1.5; // 0-1.5px blur for smoothness
    const warmth = settings.warmth - 50; // -50 to +50

    // Calculate sepia and hue-rotate for warmth effect
    const sepia = warmth > 0 ? warmth / 100 : 0;
    const hueRotate = warmth < 0 ? warmth * 0.5 : 0;

    const filters = [
      `brightness(${brightness.toFixed(2)})`,
      `contrast(${contrast.toFixed(2)})`,
      `saturate(${saturation.toFixed(2)})`,
    ];

    if (blur > 0.1) {
      filters.push(`blur(${blur.toFixed(1)}px)`);
    }

    if (sepia > 0) {
      filters.push(`sepia(${sepia.toFixed(2)})`);
    }

    if (hueRotate !== 0) {
      filters.push(`hue-rotate(${hueRotate.toFixed(0)}deg)`);
    }

    return filters.join(" ");
  }, [settings, isEnabled]);

  // Update a single setting
  const updateSetting = useCallback(
    (key: keyof BeautySettings, value: number) => {
      setSettings((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  // Reset all settings to default
  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
  }, []);

  // Toggle filters on/off
  const toggleFilters = useCallback(() => {
    setIsEnabled((prev) => !prev);
  }, []);

  // Apply preset
  const applyPreset = useCallback((preset: "natural" | "glamour" | "soft" | "vivid" | "none") => {
    switch (preset) {
      case "natural":
        setSettings({
          smoothness: 20,
          brightness: 52,
          contrast: 48,
          saturation: 50,
          warmth: 52,
          sharpness: 45,
        });
        break;
      case "glamour":
        setSettings({
          smoothness: 50,
          brightness: 55,
          contrast: 55,
          saturation: 55,
          warmth: 55,
          sharpness: 50,
        });
        break;
      case "soft":
        setSettings({
          smoothness: 60,
          brightness: 53,
          contrast: 45,
          saturation: 45,
          warmth: 53,
          sharpness: 30,
        });
        break;
      case "vivid":
        setSettings({
          smoothness: 15,
          brightness: 52,
          contrast: 60,
          saturation: 65,
          warmth: 48,
          sharpness: 60,
        });
        break;
      case "none":
        setSettings({
          smoothness: 0,
          brightness: 50,
          contrast: 50,
          saturation: 50,
          warmth: 50,
          sharpness: 50,
        });
        break;
    }
  }, []);

  // Cleanup animation frame on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return {
    settings,
    isEnabled,
    filterString: getFilterString(),
    updateSetting,
    resetSettings,
    toggleFilters,
    applyPreset,
    setIsEnabled,
  };
};

export type BeautyPreset = "natural" | "glamour" | "soft" | "vivid" | "none";
