import { useState } from "react";
import { motion } from "framer-motion";
import { Phone } from "lucide-react";

interface PreferenceSelectorProps {
  onSelect: (preference: string) => void;
  onStartCall: () => void;
  isShaking?: boolean;
}

const genderOptions = [
  { id: "homme", label: "Je suis un Homme", emoji: "👨" },
  { id: "femme", label: "Je suis une Femme", emoji: "👩" },
];

const PreferenceSelector = ({ onSelect, onStartCall, isShaking = false }: PreferenceSelectorProps) => {
  const [selectedGender, setSelectedGender] = useState<string | null>(null);
  const [isLaunching, setIsLaunching] = useState(false);

  const handleGenderSelect = (gender: string) => {
    setSelectedGender(gender);
  };

  const handleStartCall = () => {
    if (selectedGender) {
      setIsLaunching(true);
      onStartCall();
      // Delay the actual search start to let the drumroll + ZEMBO play
      setTimeout(() => {
        onSelect(selectedGender);
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
          <motion.div
            animate={{ 
              scale: [1, 1.2, 1],
              rotate: [0, -5, 5, -5, 0]
            }}
            transition={{ 
              duration: 0.5, 
              repeat: Infinity,
              repeatType: "reverse"
            }}
            className="text-8xl"
          >
            🎲
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
            Qui es-tu ?
          </h2>
          
          <div className="grid grid-cols-2 gap-4 w-full">
            {genderOptions.map((option, index) => (
              <motion.button
                key={option.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => handleGenderSelect(option.id)}
                className={`flex flex-col items-center gap-3 p-6 rounded-2xl transition-all ${
                  selectedGender === option.id 
                    ? "bg-primary/20 border-2 border-primary" 
                    : "glass hover:bg-primary/10 border-2 border-transparent"
                }`}
              >
                <div className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl transition-transform ${
                  selectedGender === option.id ? "scale-110" : ""
                }`}>
                  <span>{option.emoji}</span>
                </div>
                <span className="text-sm font-medium text-foreground">
                  {option.label}
                </span>
              </motion.button>
            ))}
          </div>

          {selectedGender && (
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
