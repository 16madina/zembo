import { motion } from "framer-motion";
import zemboLogo from "@/assets/zembo-logo.png";

interface ZemboLogoProps {
  size?: "sm" | "md" | "lg";
}

const ZemboLogo = ({ size = "md" }: ZemboLogoProps) => {
  const sizeClasses = {
    sm: "h-6",
    md: "h-10",
    lg: "h-16"
  };

  return (
    <motion.div 
      className="flex items-center"
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
    >
      <img 
        src={zemboLogo} 
        alt="ZEMBO" 
        className={`${sizeClasses[size]} w-auto object-contain`}
      />
    </motion.div>
  );
};

export default ZemboLogo;
