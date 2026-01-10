import { motion } from "framer-motion";
import { UserX, RotateCcw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface SearchTimeoutScreenProps {
  onRetry: () => void;
}

const SearchTimeoutScreen = ({ onRetry }: SearchTimeoutScreenProps) => {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center gap-6"
    >
      {/* Sad icon animation */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
        className="w-24 h-24 rounded-full bg-muted flex items-center justify-center"
      >
        <motion.div
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <UserX className="w-12 h-12 text-muted-foreground" />
        </motion.div>
      </motion.div>

      <div className="text-center space-y-2">
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-xl font-semibold text-foreground"
        >
          Aucun utilisateur disponible
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-muted-foreground text-sm max-w-xs"
        >
          Personne n'est en ligne pour le moment. Réessaye dans quelques instants !
        </motion.p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="flex flex-col sm:flex-row gap-3 mt-4"
      >
        <Button
          onClick={onRetry}
          className="gap-2 btn-gold"
        >
          <RotateCcw className="w-4 h-4" />
          Réessayer
        </Button>
        
        <Button
          variant="outline"
          onClick={() => navigate("/")}
          className="gap-2"
        >
          <Home className="w-4 h-4" />
          Retour à l'accueil
        </Button>
      </motion.div>
    </motion.div>
  );
};

export default SearchTimeoutScreen;
