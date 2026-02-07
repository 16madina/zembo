import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, Check } from "lucide-react";
import Dice3D from "./Dice3D";

interface PreferenceSelectorProps {
  onSelect: (preference: string) => void;
  onStartCall: () => void;
  isShaking?: boolean;
}

const preferenceOptions = [
  { id: "homme", label: "Un Homme", emoji: "👨" },
  { id: "femme", label: "Une Femme", emoji: "👩" },
  { id: "tous", label: "Tous", emoji: "🌍" },
];

const PreferenceSelector = ({ onSelect, onStartCall, isShaking = false }: PreferenceSelectorProps) => {
  const [selectedPreference, setSelectedPreference] = useState<string | null>(null);
  const [isLaunching, setIsLaunching] = useState(false);

  const handlePreferenceSelect = (preference: string) => {
    setSelectedPreference(preference);
  };

  const handleStartCall = () => {
    if (selectedPreference) {
      setIsLaunching(true);
      onStartCall();
      // Delay the actual search start to let the drumroll + ZEMBO play
      setTimeout(() => {
        onSelect(selectedPreference);
      }, 4000); // 3s drumroll + 1s ZEMBO
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={`flex flex-col items-center gap-6 w-full max-w-sm ${isShaking ? 'shake-suspense' : ''}`}
    >
      {isLaunching ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-6"
        >
          {/* 3D Animated Dice */}
          <motion.div
            animate={{ 
              scale: [1, 1.1, 1],
            }}
            transition={{ 
              duration: 0.8, 
              repeat: Infinity,
              repeatType: "reverse"
            }}
          >
            <Dice3D isAnimating={true} />
          </motion.div>
          <motion.h2 
            className="text-2xl font-bold text-primary"
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 0.5, repeat: Infinity }}
          >
            Prépare-toi...
          </motion.h2>
        </motion.div>
      ) : (
        <>
          <h2 className="text-xl font-semibold text-foreground">
            Je veux parler avec...
          </h2>
          
          <div className="grid grid-cols-3 gap-3 w-full">
            {preferenceOptions.map((option, index) => {
              const isSelected = selectedPreference === option.id;
              
              return (
                <motion.button
                  key={option.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ 
                    opacity: 1, 
                    y: 0,
                    scale: isSelected ? 1.05 : 1,
                  }}
                  transition={{ 
                    delay: index * 0.1,
                    scale: { type: "spring", stiffness: 400, damping: 17 }
                  }}
                  onClick={() => handlePreferenceSelect(option.id)}
                  whileTap={{ scale: 0.95 }}
                  className={`relative flex flex-col items-center gap-2 p-4 rounded-2xl transition-colors ${
                    isSelected 
                      ? "bg-primary/20 border-2 border-primary shadow-lg shadow-primary/20" 
                      : "glass hover:bg-primary/10 border-2 border-transparent"
                  }`}
                >
                  {/* Checkmark badge */}
                  <AnimatePresence>
                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 500, damping: 25 }}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center shadow-md"
                      >
                        <Check className="w-4 h-4 text-primary-foreground" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                  
                  {/* Pulse ring animation on selection */}
                  <AnimatePresence>
                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0.8 }}
                        animate={{ scale: 1.5, opacity: 0 }}
                        transition={{ duration: 0.5 }}
                        className="absolute inset-0 rounded-2xl border-2 border-primary"
                      />
                    )}
                  </AnimatePresence>
                  
                  <motion.div 
                    className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
                    animate={{ 
                      scale: isSelected ? [1, 1.2, 1.1] : 1,
                      rotate: isSelected ? [0, -10, 10, 0] : 0
                    }}
                    transition={{ 
                      duration: 0.4,
                      type: "spring",
                      stiffness: 300
                    }}
                  >
                    <span>{option.emoji}</span>
                  </motion.div>
                  <span className={`text-sm font-medium transition-colors ${
                    isSelected ? "text-primary" : "text-foreground"
                  }`}>
                    {option.label}
                  </span>
                </motion.button>
              );
            })}
          </div>

          {selectedPreference && (
            <motion.button
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: "spring", damping: 15 }}
              onClick={handleStartCall}
              className="mt-4 px-10 py-4 btn-gold rounded-2xl font-semibold flex items-center gap-3"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <Phone className="w-5 h-5 text-primary-foreground" />
              <span className="text-primary-foreground">Lancer l'appel</span>
            </motion.button>
          )}
        </>
      )}
    </motion.div>
  );
};

export default PreferenceSelector;
