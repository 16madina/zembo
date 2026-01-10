import { Crown } from "lucide-react";
import { motion } from "framer-motion";

const ZemboLogo = () => {
  return (
    <motion.div 
      className="flex flex-col items-center gap-0.5"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <motion.div
        animate={{ 
          rotate: [0, -5, 5, 0],
        }}
        transition={{ 
          duration: 2,
          repeat: Infinity,
          repeatDelay: 3,
          ease: "easeInOut"
        }}
      >
        <Crown className="w-7 h-7 text-primary drop-shadow-lg" />
      </motion.div>
      <h1 className="text-xl font-bold tracking-[0.2em] text-gradient-gold">
        ZEMBO
      </h1>
    </motion.div>
  );
};

export default ZemboLogo;
