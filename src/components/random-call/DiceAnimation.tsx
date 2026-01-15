import { motion } from "framer-motion";
import goldenHand from "@/assets/golden-hand.png";
import Dice3D from "./Dice3D";

interface DiceAnimationProps {
  isExiting?: boolean;
}

const DiceAnimation = ({ isExiting = false }: DiceAnimationProps) => {
  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={isExiting ? { 
        scale: [1, 1.5, 8],
        opacity: [1, 1, 0],
        y: [0, -50, -200],
        rotate: [0, 15, 45]
      } : { 
        scale: 1, 
        opacity: 1 
      }}
      transition={isExiting ? {
        duration: 0.8,
        ease: [0.4, 0, 0.2, 1],
        times: [0, 0.3, 1]
      } : { 
        type: "spring", 
        damping: 15, 
        delay: 0.2 
      }}
      className="relative w-72 h-80 z-10 flex items-center justify-center"
    >
      {/* Two 3D Dice positioned at the palm of the hand */}
      <div className="absolute top-[42%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex items-center justify-center -space-x-6">
        {/* First Dice */}
        <motion.div 
          animate={isExiting ? {
            rotateZ: [0, 360, 720],
            scale: [1, 1.2, 0.3],
            x: [-10, -30, -80],
            y: [0, -20, -50],
          } : {
            y: [0, -2, 0],
            rotate: [0, 3, -3, 0],
          }}
          transition={isExiting ? {
            duration: 0.8,
            ease: "easeOut"
          } : {
            duration: 2.5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <Dice3D isAnimating={isExiting} />
        </motion.div>

        {/* Second Dice */}
        <motion.div 
          animate={isExiting ? {
            rotateZ: [0, -360, -720],
            scale: [1, 1.2, 0.3],
            x: [10, 30, 80],
            y: [0, -20, -50],
          } : {
            y: [0, -2, 0],
            rotate: [0, -3, 3, 0],
          }}
          transition={isExiting ? {
            duration: 0.8,
            ease: "easeOut"
          } : {
            duration: 2.5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.4
          }}
        >
          <Dice3D isAnimating={isExiting} />
        </motion.div>
      </div>

      {/* Golden Hand Image */}
      <motion.img
        src={goldenHand}
        alt="Golden Hand"
        className="w-full h-full object-contain mt-16"
        animate={{ 
          y: [0, -8, 0],
          rotate: [0, 2, -2, 0]
        }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Sparkles around the hand */}
      <svg
        viewBox="0 0 280 280"
        className="absolute inset-0 w-full h-full pointer-events-none"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Sparkles */}
        {[
          { x: 35, y: 45, delay: 0 },
          { x: 250, y: 35, delay: 0.6 },
          { x: 140, y: 15, delay: 0.3 },
          { x: 25, y: 140, delay: 0.9 },
          { x: 260, y: 140, delay: 1.2 },
          { x: 50, y: 250, delay: 0.5 },
          { x: 230, y: 250, delay: 0.8 },
        ].map((spark, i) => (
          <motion.g
            key={i}
            animate={{ 
              opacity: [0, 1, 0],
              scale: [0.3, 1.2, 0.3]
            }}
            transition={{ 
              duration: 1.8, 
              repeat: Infinity,
              delay: spark.delay,
              ease: "easeInOut"
            }}
          >
            <path
              d={`M${spark.x} ${spark.y - 8} L${spark.x} ${spark.y + 8} M${spark.x - 8} ${spark.y} L${spark.x + 8} ${spark.y}`}
              stroke="hsl(var(--primary))"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <path
              d={`M${spark.x - 5} ${spark.y - 5} L${spark.x + 5} ${spark.y + 5} M${spark.x + 5} ${spark.y - 5} L${spark.x - 5} ${spark.y + 5}`}
              stroke="hsl(var(--primary) / 0.6)"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </motion.g>
        ))}
      </svg>
    </motion.div>
  );
};

export default DiceAnimation;
