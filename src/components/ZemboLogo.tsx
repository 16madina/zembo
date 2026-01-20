import { motion } from "framer-motion";
import zemboLogo from "@/assets/zembo-logo.png";

interface ZemboLogoProps {
  size?: "sm" | "md" | "lg";
  animate?: boolean;
}

const ZemboLogo = ({ size = "md", animate = true }: ZemboLogoProps) => {
  const sizeClasses = {
    sm: "h-6",
    md: "h-10",
    lg: "h-16"
  };

  return (
    <motion.div 
      className="flex items-center relative"
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Golden glow pulse effect */}
      {animate && (
        <motion.div
          className="absolute inset-0 rounded-full blur-lg"
          style={{
            background: "radial-gradient(circle, rgba(212,175,55,0.4) 0%, transparent 70%)",
          }}
          animate={{
            opacity: [0.3, 0.6, 0.3],
            scale: [0.9, 1.1, 0.9],
          }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      )}
      <motion.img 
        src={zemboLogo} 
        alt="ZEMBO" 
        className={`${sizeClasses[size]} w-auto object-contain relative z-10`}
        animate={animate ? {
          filter: [
            "drop-shadow(0 0 2px rgba(212,175,55,0.3))",
            "drop-shadow(0 0 8px rgba(212,175,55,0.6))",
            "drop-shadow(0 0 2px rgba(212,175,55,0.3))",
          ],
        } : {}}
        transition={animate ? {
          duration: 2.5,
          repeat: Infinity,
          ease: "easeInOut",
        } : {}}
      />
    </motion.div>
  );
};

export default ZemboLogo;
