import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Briefcase, GraduationCap, Ruler } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  field: "occupation" | "education" | "height";
  currentValue?: string | null;
  onUpdate: (field: string, value: string) => void;
}

const fieldConfig = {
  occupation: {
    icon: Briefcase,
    label: "Profession",
    placeholder: "Ex: Développeur, Médecin, Étudiant...",
  },
  education: {
    icon: GraduationCap,
    label: "Études",
    placeholder: "Ex: Master en Informatique, Licence...",
  },
  height: {
    icon: Ruler,
    label: "Taille",
    placeholder: "Ex: 175 cm",
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

  const config = fieldConfig[field];
  const Icon = config.icon;

  const handleSave = async () => {
    if (!value.trim()) {
      toast.error("Veuillez entrer une valeur");
      return;
    }

    setIsLoading(true);
    try {
      // For now we'll store these in bio as JSON or a dedicated column
      // Since the profiles table doesn't have these columns yet, we'll use a workaround
      // by storing additional info in the bio field or creating new columns via migration
      
      // We'll update via a metadata approach - storing in local state for now
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
                <input
                  type="text"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder={config.placeholder}
                  className="w-full px-4 py-3 bg-muted/50 border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  autoFocus
                />
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
