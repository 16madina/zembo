import { motion } from "framer-motion";
import { Check } from "lucide-react";
import type { OnboardingData } from "../OnboardingSteps";

interface GenderAndPreferenceStepProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
}

const genderOptions = [
  { id: "homme", label: "Homme", emoji: "👨" },
  { id: "femme", label: "Femme", emoji: "👩" },
  { id: "lgbt", label: "LGBT+", emoji: "🏳️‍🌈" },
];

const GenderAndPreferenceStep = ({ data, updateData }: GenderAndPreferenceStepProps) => {
  const toggleLookingFor = (id: string) => {
    const current = data.lookingFor;
    if (current.includes(id)) {
      updateData({ lookingFor: current.filter((item) => item !== id) });
    } else {
      updateData({ lookingFor: [...current, id] });
    }
  };

  return (
    <div className="space-y-6">
      {/* Gender Selection */}
      <div>
        <p className="text-muted-foreground text-sm mb-4">
          Je suis...
        </p>
        <div className="grid grid-cols-3 gap-3">
          {genderOptions.map((option, index) => (
            <motion.button
              key={option.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => updateData({ gender: option.id })}
              className={`p-4 rounded-2xl flex flex-col items-center gap-2 transition-all tap-highlight ${
                data.gender === option.id
                  ? "bg-primary/20 border-2 border-primary"
                  : "glass border-2 border-transparent"
              }`}
            >
              <span className="text-3xl">{option.emoji}</span>
              <span className="text-sm font-medium text-foreground">
                {option.label}
              </span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Looking For Selection */}
      <div>
        <p className="text-muted-foreground text-sm mb-4">
          Je recherche... <span className="text-xs">(plusieurs choix possibles)</span>
        </p>
        <div className="grid grid-cols-3 gap-3">
          {genderOptions.map((option, index) => {
            const isSelected = data.lookingFor.includes(option.id);
            return (
              <motion.button
                key={option.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
                onClick={() => toggleLookingFor(option.id)}
                className={`p-4 rounded-2xl flex flex-col items-center gap-2 transition-all tap-highlight relative ${
                  isSelected
                    ? "bg-primary/20 border-2 border-primary"
                    : "glass border-2 border-transparent"
                }`}
              >
                <span className="text-3xl">{option.emoji}</span>
                <span className="text-sm font-medium text-foreground">
                  {option.label}
                </span>
                {isSelected && (
                  <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                    <Check className="w-3 h-3 text-primary-foreground" />
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default GenderAndPreferenceStep;
