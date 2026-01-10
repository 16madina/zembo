import { motion } from "framer-motion";
import { Shuffle, Zap } from "lucide-react";
import ZemboLogo from "@/components/ZemboLogo";
import BottomNavigation from "@/components/BottomNavigation";

const Random = () => {
  return (
    <div className="min-h-screen pb-28 flex flex-col">
      <motion.header 
        className="flex items-center justify-center px-6 py-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <ZemboLogo />
      </motion.header>

      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", damping: 15 }}
          className="relative w-28 h-28 mb-8"
        >
          <div className="absolute inset-0 rounded-full glass" />
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 rounded-full border-2 border-dashed border-primary/30"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <Shuffle className="w-12 h-12 text-primary" />
          </div>
        </motion.div>

        <motion.h1 
          className="text-2xl font-bold text-foreground mb-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          Rencontre Aléatoire
        </motion.h1>
        
        <motion.p 
          className="text-muted-foreground mb-10 max-w-xs leading-relaxed"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          Lancez une rencontre vidéo aléatoire avec quelqu'un qui partage vos centres d'intérêt
        </motion.p>

        <motion.button 
          className="px-10 py-4 btn-gold rounded-2xl font-semibold flex items-center gap-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
        >
          <Zap className="w-5 h-5 text-primary-foreground" fill="currentColor" />
          <span className="text-primary-foreground">Lancer une rencontre</span>
        </motion.button>
      </div>

      <BottomNavigation />
    </div>
  );
};

export default Random;
