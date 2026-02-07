import { motion } from "framer-motion";
import { Phone, UserCircle } from "lucide-react";

const MatchFoundScreen = () => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className="flex flex-col items-center justify-center gap-6"
    >
      {/* Two anonymous avatars connecting */}
      <div className="relative flex items-center gap-4">
        <motion.div
          initial={{ x: -50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="w-24 h-24 rounded-full glass flex items-center justify-center"
        >
          <UserCircle className="w-16 h-16 text-primary/60" />
        </motion.div>
        
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.5, type: "spring" }}
          className="w-12 h-12 rounded-full bg-primary flex items-center justify-center"
        >
          <Phone className="w-6 h-6 text-primary-foreground" />
        </motion.div>
        
        <motion.div
          initial={{ x: 50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="w-24 h-24 rounded-full glass flex items-center justify-center"
        >
          <UserCircle className="w-16 h-16 text-primary/60" />
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="text-center space-y-2"
      >
        <h2 className="text-2xl font-bold text-foreground">
          Quelqu'un trouvé !
        </h2>
        <p className="text-muted-foreground">
          Connexion en cours...
        </p>
      </motion.div>
      
      {/* Loading animation */}
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: "100%" }}
        transition={{ duration: 2, ease: "easeInOut" }}
        className="h-1 bg-primary rounded-full w-48"
      />
    </motion.div>
  );
};

export default MatchFoundScreen;
