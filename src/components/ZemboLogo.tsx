import { Crown } from "lucide-react";
import { motion } from "framer-motion";

const ZemboLogo = () => {
  return (
    <motion.div 
      className="flex items-center gap-1.5"
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Crown className="w-5 h-5 text-primary" />
      <h1 className="text-base font-bold tracking-[0.15em] text-gradient-gold">
        ZEMBO
      </h1>
    </motion.div>
  );
};

export default ZemboLogo;
