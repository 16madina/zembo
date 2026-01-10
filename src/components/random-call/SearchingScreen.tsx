import { motion } from "framer-motion";
import { Phone, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SearchingScreenProps {
  preference: string;
  onCancel: () => void;
}

const preferenceLabels: Record<string, string> = {
  homme: "un homme",
  femme: "une femme",
  tous: "quelqu'un",
};

const SearchingScreen = ({ preference, onCancel }: SearchingScreenProps) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center gap-8"
    >
      {/* Animated searching indicator */}
      <div className="relative w-40 h-40">
        {/* Outer pulsing rings */}
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="absolute inset-0 rounded-full border-2 border-primary/30"
            initial={{ scale: 1, opacity: 0.5 }}
            animate={{ scale: 2, opacity: 0 }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: i * 0.6,
              ease: "easeOut",
            }}
          />
        ))}
        
        {/* Center circle */}
        <motion.div
          className="absolute inset-0 rounded-full glass flex items-center justify-center"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          >
            <Phone className="w-12 h-12 text-primary" />
          </motion.div>
        </motion.div>
      </div>

      <div className="text-center space-y-2">
        <motion.h2
          className="text-xl font-semibold text-foreground"
          animate={{ opacity: [1, 0.7, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          Recherche en cours...
        </motion.h2>
        <p className="text-muted-foreground">
          Recherche de {preferenceLabels[preference] || "quelqu'un"} en ligne
        </p>
      </div>

      {/* Animated dots */}
      <div className="flex gap-2">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-3 h-3 rounded-full bg-primary"
            animate={{ y: [0, -10, 0] }}
            transition={{
              duration: 0.6,
              repeat: Infinity,
              delay: i * 0.2,
            }}
          />
        ))}
      </div>

      <Button
        variant="outline"
        onClick={onCancel}
        className="mt-4 gap-2"
      >
        <X className="w-4 h-4" />
        Annuler
      </Button>
    </motion.div>
  );
};

export default SearchingScreen;
