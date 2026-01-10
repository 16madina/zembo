import { motion } from "framer-motion";
import { PhoneOff, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RejectedScreenProps {
  onRetry: () => void;
}

const RejectedScreen = ({ onRetry }: RejectedScreenProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center gap-8"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", damping: 15 }}
        className="w-28 h-28 rounded-full bg-destructive/20 flex items-center justify-center"
      >
        <PhoneOff className="w-14 h-14 text-destructive" />
      </motion.div>

      <div className="text-center space-y-3">
        <h2 className="text-2xl font-semibold text-foreground">
          Appel terminé
        </h2>
        <p className="text-muted-foreground max-w-xs">
          L'autre personne a décidé de ne pas continuer. Ce n'est pas grave, réessayez avec quelqu'un d'autre !
        </p>
      </div>

      <Button
        onClick={onRetry}
        className="btn-gold gap-2"
      >
        <RotateCcw className="w-5 h-5" />
        Nouvelle rencontre
      </Button>
    </motion.div>
  );
};

export default RejectedScreen;
