import { motion } from "framer-motion";
import { interestsList } from "@/data/countries";
import type { OnboardingData } from "../OnboardingSteps";

interface InterestsStepProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
}

const InterestsStep = ({ data, updateData }: InterestsStepProps) => {
  const toggleInterest = (interest: string) => {
    const current = data.interests;
    if (current.includes(interest)) {
      updateData({ interests: current.filter((item) => item !== interest) });
    } else if (current.length < 10) {
      updateData({ interests: [...current, interest] });
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm mb-2">
        Choisissez au moins 3 centres d'intérêt (max 10)
      </p>
      <p className="text-xs text-primary mb-4">
        {data.interests.length}/10 sélectionné(s)
      </p>

      <div className="flex flex-wrap gap-2">
        {interestsList.map((interest, index) => {
          const isSelected = data.interests.includes(interest);
          return (
            <motion.button
              key={interest}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.02 }}
              onClick={() => toggleInterest(interest)}
              disabled={!isSelected && data.interests.length >= 10}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all tap-highlight ${
                isSelected
                  ? "bg-primary text-primary-foreground"
                  : "glass text-foreground hover:bg-secondary/50 disabled:opacity-50"
              }`}
            >
              {interest}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

export default InterestsStep;
