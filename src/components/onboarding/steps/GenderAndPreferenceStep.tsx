import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import type { OnboardingData } from "../OnboardingSteps";
import { 
  GENDER_OPTIONS, 
  BASE_GENDER_OPTIONS, 
  LGBT_GENDER_OPTIONS,
  GenderOption 
} from "@/data/genderOptions";

interface GenderAndPreferenceStepProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
}

const GenderAndPreferenceStep = ({ data, updateData }: GenderAndPreferenceStepProps) => {
  const [showLgbtOptions, setShowLgbtOptions] = useState(false);
  const [showLgbtLookingFor, setShowLgbtLookingFor] = useState(false);

  const toggleLookingFor = (id: string) => {
    const current = data.lookingFor;
    if (current.includes(id)) {
      updateData({ lookingFor: current.filter((item) => item !== id) });
    } else {
      updateData({ lookingFor: [...current, id] });
    }
  };

  const renderGenderButton = (option: GenderOption, index: number, isSelected: boolean, onClick: () => void, showCheck = false) => (
    <motion.button
      key={option.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={onClick}
      className={`p-3 rounded-2xl flex flex-col items-center gap-1 transition-all tap-highlight relative ${
        isSelected
          ? "bg-primary/20 border-2 border-primary"
          : "glass border-2 border-transparent"
      }`}
    >
      <span className="text-2xl">{option.emoji}</span>
      <span className="text-xs font-medium text-foreground text-center leading-tight">
        {option.label}
      </span>
      {showCheck && isSelected && (
        <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
          <Check className="w-2.5 h-2.5 text-primary-foreground" />
        </div>
      )}
    </motion.button>
  );

  return (
    <div className="space-y-6">
      {/* Gender Selection */}
      <div>
        <p className="text-muted-foreground text-sm mb-3">
          Je suis...
        </p>
        
        {/* Base genders */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          {BASE_GENDER_OPTIONS.map((option, index) => 
            renderGenderButton(
              option, 
              index, 
              data.gender === option.id, 
              () => {
                updateData({ gender: option.id });
                setShowLgbtOptions(false);
              }
            )
          )}
        </div>

        {/* LGBT+ Expandable Section */}
        <motion.button
          onClick={() => setShowLgbtOptions(!showLgbtOptions)}
          className={`w-full p-3 rounded-2xl flex items-center justify-center gap-2 transition-all ${
            LGBT_GENDER_OPTIONS.some(o => data.gender === o.id)
              ? "bg-primary/20 border-2 border-primary"
              : "glass border-2 border-transparent"
          }`}
        >
          <span className="text-2xl">🏳️‍🌈</span>
          <span className="text-sm font-medium text-foreground">LGBT+</span>
          {showLgbtOptions ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </motion.button>

        <AnimatePresence>
          {showLgbtOptions && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-2 gap-2 mt-3 p-3 rounded-2xl bg-background/50">
                {LGBT_GENDER_OPTIONS.map((option, index) => 
                  renderGenderButton(
                    option, 
                    index, 
                    data.gender === option.id, 
                    () => updateData({ gender: option.id })
                  )
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Looking For Selection */}
      <div>
        <p className="text-muted-foreground text-sm mb-3">
          Je recherche... <span className="text-xs">(plusieurs choix possibles)</span>
        </p>
        
        {/* Base genders */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          {BASE_GENDER_OPTIONS.map((option, index) => 
            renderGenderButton(
              option, 
              index, 
              data.lookingFor.includes(option.id), 
              () => toggleLookingFor(option.id),
              true
            )
          )}
        </div>

        {/* LGBT+ Expandable Section */}
        <motion.button
          onClick={() => setShowLgbtLookingFor(!showLgbtLookingFor)}
          className={`w-full p-3 rounded-2xl flex items-center justify-center gap-2 transition-all ${
            LGBT_GENDER_OPTIONS.some(o => data.lookingFor.includes(o.id))
              ? "bg-primary/20 border-2 border-primary"
              : "glass border-2 border-transparent"
          }`}
        >
          <span className="text-2xl">🏳️‍🌈</span>
          <span className="text-sm font-medium text-foreground">LGBT+</span>
          {data.lookingFor.filter(id => LGBT_GENDER_OPTIONS.some(o => o.id === id)).length > 0 && (
            <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
              {data.lookingFor.filter(id => LGBT_GENDER_OPTIONS.some(o => o.id === id)).length}
            </span>
          )}
          {showLgbtLookingFor ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </motion.button>

        <AnimatePresence>
          {showLgbtLookingFor && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-2 gap-2 mt-3 p-3 rounded-2xl bg-background/50">
                {LGBT_GENDER_OPTIONS.map((option, index) => 
                  renderGenderButton(
                    option, 
                    index, 
                    data.lookingFor.includes(option.id), 
                    () => toggleLookingFor(option.id),
                    true
                  )
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default GenderAndPreferenceStep;
