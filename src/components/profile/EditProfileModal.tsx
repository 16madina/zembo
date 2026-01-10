import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Briefcase, GraduationCap, Ruler, ChevronDown } from "lucide-react";
import { toast } from "sonner";

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  field: "occupation" | "education" | "height";
  currentValue?: string | null;
  onUpdate: (field: string, value: string) => void;
}

const educationOptions = [
  "Baccalauréat",
  "BTS / DUT",
  "Licence",
  "Master",
  "Doctorat",
  "École d'ingénieur",
  "École de commerce",
  "Formation professionnelle",
  "Autodidacte",
  "Autre",
];

const heightOptions = Array.from({ length: 61 }, (_, i) => `${140 + i} cm`);

const fieldConfig = {
  occupation: {
    icon: Briefcase,
    label: "Profession",
    placeholder: "Ex: Développeur, Médecin, Étudiant...",
    type: "text" as const,
  },
  education: {
    icon: GraduationCap,
    label: "Études",
    placeholder: "Sélectionnez votre niveau d'études",
    type: "select" as const,
    options: educationOptions,
  },
  height: {
    icon: Ruler,
    label: "Taille",
    placeholder: "Sélectionnez votre taille",
    type: "select" as const,
    options: heightOptions,
  },
};

const EditProfileModal = ({
  isOpen,
  onClose,
  userId,
  field,
  currentValue,
  onUpdate,
}: EditProfileModalProps) => {
  const [value, setValue] = useState(currentValue || "");
  const [isLoading, setIsLoading] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const config = fieldConfig[field];
  const Icon = config.icon;

  const handleSave = async () => {
    if (!value.trim()) {
      toast.error("Veuillez sélectionner une valeur");
      return;
    }

    setIsLoading(true);
    try {
      onUpdate(field, value.trim());
      toast.success(`${config.label} mis à jour`);
      onClose();
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Erreur lors de la mise à jour");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = (option: string) => {
    setValue(option);
    setIsDropdownOpen(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 max-w-md mx-auto"
          >
            <div className="glass-strong rounded-3xl p-6 space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/20 rounded-full">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">
                    {config.label}
                  </h3>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-muted rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>

              {/* Input */}
              <div className="space-y-2">
                {config.type === "text" ? (
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder={config.placeholder}
                    className="w-full px-4 py-3 bg-muted/50 border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    autoFocus
                  />
                ) : (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      className="w-full px-4 py-3 bg-muted/50 border border-border rounded-xl text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                      <span className={value ? "text-foreground" : "text-muted-foreground"}>
                        {value || config.placeholder}
                      </span>
                      <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${isDropdownOpen ? "rotate-180" : ""}`} />
                    </button>

                    <AnimatePresence>
                      {isDropdownOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-lg z-60 max-h-60 overflow-y-auto"
                        >
                          {config.options?.map((option) => (
                            <button
                              key={option}
                              type="button"
                              onClick={() => handleSelect(option)}
                              className={`w-full px-4 py-3 text-left hover:bg-muted transition-colors first:rounded-t-xl last:rounded-b-xl ${
                                value === option ? "bg-primary/10 text-primary" : "text-foreground"
                              }`}
                            >
                              {option}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <motion.button
                  onClick={onClose}
                  className="flex-1 py-3 bg-muted text-foreground rounded-xl font-medium"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Annuler
                </motion.button>
                <motion.button
                  onClick={handleSave}
                  disabled={isLoading}
                  className="flex-1 py-3 bg-primary text-primary-foreground rounded-xl font-medium disabled:opacity-50"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {isLoading ? "Enregistrement..." : "Enregistrer"}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default EditProfileModal;
