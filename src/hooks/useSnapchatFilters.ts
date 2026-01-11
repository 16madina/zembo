import { useState, useRef, useCallback, useEffect } from "react";

// Types pour les différentes catégories de filtres
export interface ColorFilterSettings {
  brightness: number; // 0-100
  contrast: number; // 0-100
  saturation: number; // 0-100
  warmth: number; // 0-100
  exposure: number; // 0-100
  shadows: number; // 0-100
  highlights: number; // 0-100
  vignette: number; // 0-100
  grain: number; // 0-100
}

export interface FaceFilterSettings {
  smoothness: number; // 0-100 - skin smoothing
  eyeSize: number; // 0-100 - eye enlargement
  faceSlim: number; // 0-100 - face slimming
  jawline: number; // 0-100 - jawline definition
  lipColor: number; // 0-100 - lip color intensity
  blush: number; // 0-100 - blush intensity
  eyeBright: number; // 0-100 - eye brightening
}

export interface BackgroundSettings {
  blur: number; // 0-100 - background blur
  replace: boolean; // replace background
  darken: number; // 0-100 - darken background
}

export interface SnapchatFilterState {
  colorFilters: ColorFilterSettings;
  faceFilters: FaceFilterSettings;
  background: BackgroundSettings;
  activeColorPreset: ColorPreset;
  activeFacePreset: FacePreset;
  activeOverlay: OverlayType | null;
  isEnabled: boolean;
}

export type ColorPreset = 
  | "none" 
  | "natural" 
  | "warm" 
  | "cool" 
  | "vintage" 
  | "cinema" 
  | "neon" 
  | "sunset" 
  | "noir"
  | "pastel"
  | "vivid"
  | "golden"
  | "moody"
  | "fresh";

export type FacePreset = 
  | "none" 
  | "natural" 
  | "soft" 
  | "glamour" 
  | "porcelain"
  | "doll"
  | "clear";

export type OverlayType = 
  | "hearts" 
  | "stars" 
  | "sparkles" 
  | "crown" 
  | "bunny" 
  | "cat" 
  | "dog"
  | "glasses"
  | "butterfly";

const DEFAULT_COLOR_FILTERS: ColorFilterSettings = {
  brightness: 50,
  contrast: 50,
  saturation: 50,
  warmth: 50,
  exposure: 50,
  shadows: 50,
  highlights: 50,
  vignette: 0,
  grain: 0,
};

const DEFAULT_FACE_FILTERS: FaceFilterSettings = {
  smoothness: 30,
  eyeSize: 0,
  faceSlim: 0,
  jawline: 0,
  lipColor: 0,
  blush: 0,
  eyeBright: 20,
};

const DEFAULT_BACKGROUND: BackgroundSettings = {
  blur: 0,
  replace: false,
  darken: 0,
};

// Presets de couleur
const COLOR_PRESETS: Record<ColorPreset, ColorFilterSettings> = {
  none: DEFAULT_COLOR_FILTERS,
  natural: {
    brightness: 52,
    contrast: 48,
    saturation: 50,
    warmth: 52,
    exposure: 50,
    shadows: 45,
    highlights: 55,
    vignette: 0,
    grain: 0,
  },
  warm: {
    brightness: 52,
    contrast: 50,
    saturation: 55,
    warmth: 65,
    exposure: 52,
    shadows: 40,
    highlights: 55,
    vignette: 10,
    grain: 0,
  },
  cool: {
    brightness: 50,
    contrast: 52,
    saturation: 45,
    warmth: 35,
    exposure: 50,
    shadows: 55,
    highlights: 50,
    vignette: 0,
    grain: 0,
  },
  vintage: {
    brightness: 48,
    contrast: 45,
    saturation: 40,
    warmth: 60,
    exposure: 48,
    shadows: 35,
    highlights: 45,
    vignette: 25,
    grain: 20,
  },
  cinema: {
    brightness: 48,
    contrast: 60,
    saturation: 45,
    warmth: 55,
    exposure: 48,
    shadows: 30,
    highlights: 40,
    vignette: 30,
    grain: 5,
  },
  neon: {
    brightness: 52,
    contrast: 65,
    saturation: 80,
    warmth: 45,
    exposure: 55,
    shadows: 60,
    highlights: 70,
    vignette: 0,
    grain: 0,
  },
  sunset: {
    brightness: 55,
    contrast: 52,
    saturation: 60,
    warmth: 70,
    exposure: 55,
    shadows: 45,
    highlights: 65,
    vignette: 15,
    grain: 0,
  },
  noir: {
    brightness: 45,
    contrast: 70,
    saturation: 0,
    warmth: 50,
    exposure: 45,
    shadows: 20,
    highlights: 60,
    vignette: 40,
    grain: 15,
  },
  pastel: {
    brightness: 55,
    contrast: 40,
    saturation: 35,
    warmth: 55,
    exposure: 55,
    shadows: 60,
    highlights: 70,
    vignette: 0,
    grain: 0,
  },
  golden: {
    brightness: 54,
    contrast: 52,
    saturation: 55,
    warmth: 68,
    exposure: 54,
    shadows: 42,
    highlights: 60,
    vignette: 12,
    grain: 0,
  },
  moody: {
    brightness: 46,
    contrast: 62,
    saturation: 42,
    warmth: 45,
    exposure: 46,
    shadows: 25,
    highlights: 45,
    vignette: 35,
    grain: 8,
  },
  fresh: {
    brightness: 54,
    contrast: 50,
    saturation: 58,
    warmth: 48,
    exposure: 54,
    shadows: 55,
    highlights: 65,
    vignette: 0,
    grain: 0,
  },
  vivid: {
    brightness: 52,
    contrast: 60,
    saturation: 70,
    warmth: 50,
    exposure: 52,
    shadows: 45,
    highlights: 60,
    vignette: 0,
    grain: 0,
  },
};

// Presets de visage
const FACE_PRESETS: Record<FacePreset, FaceFilterSettings> = {
  none: DEFAULT_FACE_FILTERS,
  natural: {
    smoothness: 20,
    eyeSize: 5,
    faceSlim: 5,
    jawline: 5,
    lipColor: 0,
    blush: 0,
    eyeBright: 15,
  },
  soft: {
    smoothness: 40,
    eyeSize: 10,
    faceSlim: 10,
    jawline: 5,
    lipColor: 10,
    blush: 10,
    eyeBright: 25,
  },
  glamour: {
    smoothness: 50,
    eyeSize: 20,
    faceSlim: 15,
    jawline: 15,
    lipColor: 30,
    blush: 20,
    eyeBright: 35,
  },
  porcelain: {
    smoothness: 70,
    eyeSize: 15,
    faceSlim: 20,
    jawline: 10,
    lipColor: 20,
    blush: 25,
    eyeBright: 30,
  },
  doll: {
    smoothness: 60,
    eyeSize: 40,
    faceSlim: 25,
    jawline: 20,
    lipColor: 40,
    blush: 35,
    eyeBright: 40,
  },
  clear: {
    smoothness: 35,
    eyeSize: 0,
    faceSlim: 0,
    jawline: 0,
    lipColor: 0,
    blush: 0,
    eyeBright: 30,
  },
};

export const useSnapchatFilters = () => {
  const [state, setState] = useState<SnapchatFilterState>({
    colorFilters: DEFAULT_COLOR_FILTERS,
    faceFilters: DEFAULT_FACE_FILTERS,
    background: DEFAULT_BACKGROUND,
    activeColorPreset: "natural",
    activeFacePreset: "natural",
    activeOverlay: null,
    isEnabled: true,
  });

  // Apply initial natural presets
  useEffect(() => {
    setState(prev => ({
      ...prev,
      colorFilters: COLOR_PRESETS.natural,
      faceFilters: FACE_PRESETS.natural,
    }));
  }, []);

  // Generate combined CSS filter string
  const getFilterString = useCallback(() => {
    if (!state.isEnabled) return "none";

    const { colorFilters, faceFilters, background } = state;

    // Normalize values (0-100 to appropriate ranges)
    const brightness = colorFilters.brightness / 50; // 0-2
    const contrast = colorFilters.contrast / 50; // 0-2
    const saturation = colorFilters.saturation / 50; // 0-2
    const exposure = colorFilters.exposure / 50;

    // Warmth via sepia and hue-rotate
    const warmth = colorFilters.warmth - 50;
    const sepia = warmth > 0 ? (warmth / 100) * 0.3 : 0;
    const hueRotate = warmth < 0 ? warmth * 0.3 : 0;

    // Smoothness as slight blur (only for face, keep minimal)
    const smoothBlur = (faceFilters.smoothness / 100) * 1.5;

    // Background blur
    const bgBlur = (background.blur / 100) * 10;

    // Vignette simulation via grayscale mix (limited)
    const grayscaleMix = colorFilters.saturation === 0 ? 1 : 0;

    const filters = [
      `brightness(${(brightness * exposure).toFixed(2)})`,
      `contrast(${contrast.toFixed(2)})`,
      `saturate(${saturation.toFixed(2)})`,
    ];

    if (sepia > 0) {
      filters.push(`sepia(${sepia.toFixed(2)})`);
    }

    if (hueRotate !== 0) {
      filters.push(`hue-rotate(${hueRotate.toFixed(0)}deg)`);
    }

    if (smoothBlur > 0.2) {
      filters.push(`blur(${Math.min(smoothBlur, 1.2).toFixed(1)}px)`);
    }

    if (grayscaleMix > 0) {
      filters.push(`grayscale(${grayscaleMix})`);
    }

    return filters.join(" ");
  }, [state]);

  // Generate vignette style
  const getVignetteStyle = useCallback(() => {
    if (!state.isEnabled || state.colorFilters.vignette === 0) return {};

    const intensity = state.colorFilters.vignette / 100;
    return {
      boxShadow: `inset 0 0 ${100 * intensity}px ${50 * intensity}px rgba(0,0,0,${intensity * 0.7})`,
    };
  }, [state]);

  // Generate grain overlay style
  const getGrainStyle = useCallback(() => {
    if (!state.isEnabled || state.colorFilters.grain === 0) return {};

    const intensity = state.colorFilters.grain / 100;
    return {
      opacity: intensity * 0.3,
    };
  }, [state]);

  // Update specific color filter
  const updateColorFilter = useCallback((key: keyof ColorFilterSettings, value: number) => {
    setState(prev => ({
      ...prev,
      colorFilters: { ...prev.colorFilters, [key]: value },
      activeColorPreset: "none" as ColorPreset, // Custom when manually adjusted
    }));
  }, []);

  // Update specific face filter
  const updateFaceFilter = useCallback((key: keyof FaceFilterSettings, value: number) => {
    setState(prev => ({
      ...prev,
      faceFilters: { ...prev.faceFilters, [key]: value },
      activeFacePreset: "none" as FacePreset, // Custom when manually adjusted
    }));
  }, []);

  // Update background setting
  const updateBackground = useCallback((key: keyof BackgroundSettings, value: number | boolean) => {
    setState(prev => ({
      ...prev,
      background: { ...prev.background, [key]: value },
    }));
  }, []);

  // Apply color preset
  const applyColorPreset = useCallback((preset: ColorPreset) => {
    setState(prev => ({
      ...prev,
      colorFilters: COLOR_PRESETS[preset],
      activeColorPreset: preset,
    }));
  }, []);

  // Apply face preset
  const applyFacePreset = useCallback((preset: FacePreset) => {
    setState(prev => ({
      ...prev,
      faceFilters: FACE_PRESETS[preset],
      activeFacePreset: preset,
    }));
  }, []);

  // Set overlay
  const setOverlay = useCallback((overlay: OverlayType | null) => {
    setState(prev => ({
      ...prev,
      activeOverlay: overlay,
    }));
  }, []);

  // Toggle filters on/off
  const toggleFilters = useCallback(() => {
    setState(prev => ({
      ...prev,
      isEnabled: !prev.isEnabled,
    }));
  }, []);

  // Reset all to defaults
  const resetAll = useCallback(() => {
    setState({
      colorFilters: COLOR_PRESETS.natural,
      faceFilters: FACE_PRESETS.natural,
      background: DEFAULT_BACKGROUND,
      activeColorPreset: "natural",
      activeFacePreset: "natural",
      activeOverlay: null,
      isEnabled: true,
    });
  }, []);

  return {
    state,
    filterString: getFilterString(),
    vignetteStyle: getVignetteStyle(),
    grainStyle: getGrainStyle(),
    updateColorFilter,
    updateFaceFilter,
    updateBackground,
    applyColorPreset,
    applyFacePreset,
    setOverlay,
    toggleFilters,
    resetAll,
    setEnabled: (enabled: boolean) => setState(prev => ({ ...prev, isEnabled: enabled })),
  };
};

// Export preset data for UI
export const COLOR_PRESET_DATA: { id: ColorPreset; label: string; emoji: string; color: string }[] = [
  { id: "none", label: "Aucun", emoji: "🚫", color: "transparent" },
  { id: "natural", label: "Naturel", emoji: "🌿", color: "#7CB342" },
  { id: "warm", label: "Chaud", emoji: "🔥", color: "#FF7043" },
  { id: "cool", label: "Froid", emoji: "❄️", color: "#42A5F5" },
  { id: "golden", label: "Doré", emoji: "✨", color: "#FFD54F" },
  { id: "vintage", label: "Vintage", emoji: "📷", color: "#8D6E63" },
  { id: "cinema", label: "Cinéma", emoji: "🎬", color: "#546E7A" },
  { id: "moody", label: "Moody", emoji: "🌙", color: "#5C6BC0" },
  { id: "neon", label: "Néon", emoji: "💜", color: "#E040FB" },
  { id: "sunset", label: "Coucher", emoji: "🌅", color: "#FF9800" },
  { id: "fresh", label: "Fresh", emoji: "💧", color: "#4DD0E1" },
  { id: "noir", label: "Noir", emoji: "🖤", color: "#37474F" },
  { id: "pastel", label: "Pastel", emoji: "🍬", color: "#F8BBD9" },
  { id: "vivid", label: "Vif", emoji: "🌈", color: "#00BCD4" },
];

export const FACE_PRESET_DATA: { id: FacePreset; label: string; emoji: string }[] = [
  { id: "none", label: "Aucun", emoji: "🚫" },
  { id: "natural", label: "Naturel", emoji: "🌿" },
  { id: "soft", label: "Doux", emoji: "☁️" },
  { id: "clear", label: "Net", emoji: "💎" },
  { id: "glamour", label: "Glamour", emoji: "✨" },
  { id: "porcelain", label: "Porcelaine", emoji: "🪷" },
  { id: "doll", label: "Poupée", emoji: "🎀" },
];

export const OVERLAY_DATA: { id: OverlayType; label: string; emoji: string }[] = [
  { id: "hearts", label: "Coeurs", emoji: "💕" },
  { id: "stars", label: "Étoiles", emoji: "⭐" },
  { id: "sparkles", label: "Étincelles", emoji: "✨" },
  { id: "crown", label: "Couronne", emoji: "👑" },
  { id: "bunny", label: "Lapin", emoji: "🐰" },
  { id: "cat", label: "Chat", emoji: "🐱" },
  { id: "dog", label: "Chien", emoji: "🐶" },
  { id: "glasses", label: "Lunettes", emoji: "🕶️" },
  { id: "butterfly", label: "Papillon", emoji: "🦋" },
];
