// Centralized gender options for consistency across the app
// Used in: Onboarding, FilterSheet, Oracle questionnaire

export interface GenderOption {
  id: string;
  label: string;
  emoji: string;
  category?: "base" | "lgbt"; // For grouping in UI
}

// Full list of gender options
export const GENDER_OPTIONS: GenderOption[] = [
  { id: "femme", label: "Femme", emoji: "👩", category: "base" },
  { id: "homme", label: "Homme", emoji: "👨", category: "base" },
  { id: "homme_gay", label: "Homme gay", emoji: "👨‍❤️‍👨", category: "lgbt" },
  { id: "femme_lesbienne", label: "Femme lesbienne", emoji: "👩‍❤️‍👩", category: "lgbt" },
  { id: "non_binaire", label: "Non-binaire", emoji: "⚧️", category: "lgbt" },
  { id: "autre_lgbt", label: "Autre LGBT+", emoji: "🏳️‍🌈", category: "lgbt" },
];

// Base genders only (for simpler UIs)
export const BASE_GENDER_OPTIONS = GENDER_OPTIONS.filter(g => g.category === "base");

// LGBT+ options only
export const LGBT_GENDER_OPTIONS = GENDER_OPTIONS.filter(g => g.category === "lgbt");

// All LGBT+ IDs for filtering
export const LGBT_GENDER_IDS = LGBT_GENDER_OPTIONS.map(g => g.id);

// Helper to check if a gender ID is LGBT+
export const isLgbtGender = (genderId: string): boolean => {
  return LGBT_GENDER_IDS.includes(genderId);
};

// Get display label for a gender ID
export const getGenderLabel = (genderId: string): string => {
  return GENDER_OPTIONS.find(g => g.id === genderId)?.label || genderId;
};

// Get emoji for a gender ID
export const getGenderEmoji = (genderId: string): string => {
  return GENDER_OPTIONS.find(g => g.id === genderId)?.emoji || "👤";
};
