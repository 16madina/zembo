import { motion, AnimatePresence } from "framer-motion";
import { PictureInPicture2, LayoutGrid, X, Settings2 } from "lucide-react";

export type GuestViewMode = "pip" | "split";

interface GuestViewModeSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  currentMode: GuestViewMode;
  onModeChange: (mode: GuestViewMode) => void;
}

const GuestViewModeSelector = ({
  isOpen,
  onClose,
  currentMode,
  onModeChange,
}: GuestViewModeSelectorProps) => {
  const modes = [
    {
      id: "pip" as GuestViewMode,
      label: "Picture-in-Picture",
      description: "L'invité apparaît dans une petite fenêtre déplaçable",
      icon: PictureInPicture2,
    },
    {
      id: "split" as GuestViewMode,
      label: "Écran partagé",
      description: "L'écran est divisé en deux pour vous et l'invité",
      icon: LayoutGrid,
    },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-sm mx-auto bg-card rounded-2xl overflow-hidden z-50 shadow-2xl border border-border"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-foreground">
                  Affichage invité
                </h3>
              </div>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-muted flex items-center justify-center"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </motion.button>
            </div>

            {/* Options */}
            <div className="p-4 space-y-3">
              {modes.map((mode) => {
                const Icon = mode.icon;
                const isSelected = currentMode === mode.id;
                
                return (
                  <motion.button
                    key={mode.id}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      onModeChange(mode.id);
                      onClose();
                    }}
                    className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                      isSelected
                        ? "border-primary bg-primary/10"
                        : "border-border bg-background hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      }`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <p className={`font-medium ${isSelected ? "text-primary" : "text-foreground"}`}>
                          {mode.label}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {mode.description}
                        </p>
                      </div>
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="w-2 h-2 bg-primary-foreground rounded-full"
                          />
                        </div>
                      )}
                    </div>
                  </motion.button>
                );
              })}
            </div>

            {/* Footer hint */}
            <div className="px-4 pb-4">
              <p className="text-xs text-muted-foreground text-center">
                Ce réglage s'applique quand un invité monte sur scène
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default GuestViewModeSelector;
