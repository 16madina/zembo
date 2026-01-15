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
      className="relative z-10 flex flex-col items-center"
    >
      {/* 3D Dice above the hand */}
      <motion.div
        className="relative -mb-8"
        animate={{ 
          y: [0, -10, 0],
        }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        <Dice3D isAnimating={false} />
      </motion.div>

      {/* Golden Hand Image */}
      <motion.div className="relative w-64 h-64">
        <motion.img
          src={goldenHand}
          alt="Golden Hand"
          className="w-full h-full object-contain"
          animate={{ 
            y: [0, -5, 0],
            rotate: [0, 1, -1, 0]
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
          {[
            { x: 20, y: 30, delay: 0 },
            { x: 260, y: 40, delay: 0.6 },
            { x: 10, y: 140, delay: 0.9 },
            { x: 270, y: 150, delay: 1.2 },
            { x: 30, y: 260, delay: 0.5 },
            { x: 250, y: 250, delay: 0.8 },
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
    </motion.div>
  );
};

export default DiceAnimation;
