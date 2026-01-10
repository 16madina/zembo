import { motion } from "framer-motion";
import type { OnboardingData } from "../OnboardingSteps";

interface GenderStepProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
  onNext: () => void;
}

const genderOptions = [
  { id: "homme", label: "Homme", emoji: "👨" },
  { id: "femme", label: "Femme", emoji: "👩" },
  { id: "lgbt", label: "LGBT+", emoji: "🏳️‍🌈" },
];

const GenderStep = ({ data, updateData, onNext }: GenderStepProps) => {
  const handleSelect = (genderId: string) => {
    updateData({ gender: genderId });
    // Auto-advance to next step after selection
    setTimeout(() => onNext(), 300);
  };
  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm mb-6">
        Comment vous identifiez-vous ?
      </p>

      <div className="grid gap-3">
        {genderOptions.map((option, index) => (
          <motion.button
            key={option.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => handleSelect(option.id)}
            className={`w-full p-5 rounded-2xl flex items-center gap-4 transition-all tap-highlight ${
              data.gender === option.id
                ? "bg-primary/20 border-2 border-primary"
                : "glass border-2 border-transparent"
            }`}
          >
            <span className="text-4xl">{option.emoji}</span>
            <span className="text-lg font-medium text-foreground">
              {option.label}
            </span>
          </motion.button>
        ))}
      </div>
    </div>
  );
};

export default GenderStep;
