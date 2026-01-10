import { motion } from "framer-motion";
import { User, Users } from "lucide-react";

interface PreferenceSelectorProps {
  onSelect: (preference: string) => void;
}

const preferences = [
  { id: "homme", label: "Homme", emoji: "👨" },
  { id: "femme", label: "Femme", emoji: "👩" },
  { id: "tous", label: "Peu importe", icon: Users },
];

const PreferenceSelector = ({ onSelect }: PreferenceSelectorProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex flex-col items-center gap-6 w-full max-w-sm"
    >
      <h2 className="text-xl font-semibold text-foreground">
        Je veux parler avec...
      </h2>
      
      <div className="grid grid-cols-1 gap-4 w-full">
        {preferences.map((pref, index) => (
          <motion.button
            key={pref.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => onSelect(pref.id)}
            className="flex items-center gap-4 p-5 rounded-2xl glass hover:bg-primary/10 transition-all group"
          >
            <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
              {pref.emoji ? (
                <span>{pref.emoji}</span>
              ) : pref.icon ? (
                <pref.icon className="w-7 h-7 text-primary" />
              ) : null}
            </div>
            <span className="text-lg font-medium text-foreground">
              {pref.label}
            </span>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
};

export default PreferenceSelector;
