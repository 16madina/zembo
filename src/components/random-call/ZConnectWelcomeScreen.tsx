import { motion } from "framer-motion";
import zconnectWelcome from "@/assets/zconnect-welcome.png";

interface ZConnectWelcomeScreenProps {
  onEnter: () => void;
}

const ZConnectWelcomeScreen = ({ onEnter }: ZConnectWelcomeScreenProps) => {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Background image */}
      <img
        src={zconnectWelcome}
        alt="Bienvenue sur ZConnect"
        className="absolute inset-0 w-full h-full object-cover"
      />
      
      {/* Clickable button overlay - positioned at exact button location */}
      <motion.button
        onClick={onEnter}
        className="absolute bottom-[22%] left-1/2 -translate-x-1/2 w-48 h-14 bg-transparent cursor-pointer z-10"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label="Entrer dans ZConnect"
      />
    </motion.div>
  );
};

export default ZConnectWelcomeScreen;
