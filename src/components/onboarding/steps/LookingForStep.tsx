import { motion } from "framer-motion";
import { Check } from "lucide-react";
import type { OnboardingData } from "../OnboardingSteps";

interface LookingForStepProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
}

const lookingForOptions = [
  { id: "homme", label: "Homme", emoji: "👨" },
  { id: "femme", label: "Femme", emoji: "👩" },
  { id: "lgbt", label: "LGBT+", emoji: "🏳️‍🌈" },
];

const LookingForStep = ({ data, updateData }: LookingForStepProps) => {
  const toggleOption = (id: string) => {
    const current = data.lookingFor;
    if (current.includes(id)) {
      updateData({ lookingFor: current.filter((item) => item !== id) });
    } else {
      updateData({ lookingFor: [...current, id] });
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm mb-6">
        Qui souhaitez-vous rencontrer ? Vous pouvez sélectionner plusieurs options.
      </p>

      <div className="grid gap-3">
        {lookingForOptions.map((option, index) => {
          const isSelected = data.lookingFor.includes(option.id);
          return (
            <motion.button
              key={option.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => toggleOption(option.id)}
              className={`w-full p-5 rounded-2xl flex items-center gap-4 transition-all tap-highlight ${
                isSelected
                  ? "bg-primary/20 border-2 border-primary"
                  : "glass border-2 border-transparent"
              }`}
            >
              <span className="text-4xl">{option.emoji}</span>
              <span className="flex-1 text-left text-lg font-medium text-foreground">
                {option.label}
              </span>
              {isSelected && (
                <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                  <Check className="w-4 h-4 text-primary-foreground" />
                </div>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

export default LookingForStep;
