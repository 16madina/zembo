import { motion } from "framer-motion";
import goldenHand from "@/assets/golden-hand.png";

interface DiceAnimationProps {
  isExiting?: boolean;
}

// Composant de dé doré avec vrais points
const GoldenDice = ({ value, delay = 0 }: { value: number; delay?: number }) => {
  // Positions des points pour chaque valeur (1-6)
  const dotPositions: Record<number, { x: number; y: number }[]> = {
    1: [{ x: 50, y: 50 }],
    2: [{ x: 25, y: 25 }, { x: 75, y: 75 }],
    3: [{ x: 25, y: 25 }, { x: 50, y: 50 }, { x: 75, y: 75 }],
    4: [{ x: 25, y: 25 }, { x: 75, y: 25 }, { x: 25, y: 75 }, { x: 75, y: 75 }],
    5: [{ x: 25, y: 25 }, { x: 75, y: 25 }, { x: 50, y: 50 }, { x: 25, y: 75 }, { x: 75, y: 75 }],
    6: [{ x: 25, y: 25 }, { x: 75, y: 25 }, { x: 25, y: 50 }, { x: 75, y: 50 }, { x: 25, y: 75 }, { x: 75, y: 75 }],
  };

  const dots = dotPositions[value] || dotPositions[5];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0, rotate: -180 }}
      animate={{ opacity: 1, scale: 1, rotate: 0 }}
      transition={{ 
        type: "spring", 
        damping: 12, 
        stiffness: 100,
        delay: delay
      }}
      className="relative w-14 h-14"
    >
      {/* Dé avec dégradé doré */}
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-lg">
        <defs>
          {/* Dégradé doré principal */}
          <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFD700" />
            <stop offset="30%" stopColor="#FFC125" />
            <stop offset="50%" stopColor="#FFDF00" />
            <stop offset="70%" stopColor="#DAA520" />
            <stop offset="100%" stopColor="#B8860B" />
          </linearGradient>
          {/* Dégradé pour les points */}
          <radialGradient id="dotGradient" cx="30%" cy="30%">
            <stop offset="0%" stopColor="#8B4513" />
            <stop offset="100%" stopColor="#4A2500" />
          </radialGradient>
          {/* Ombre interne */}
          <filter id="innerShadow">
            <feDropShadow dx="2" dy="2" stdDeviation="2" floodColor="#000" floodOpacity="0.3"/>
          </filter>
        </defs>
        
        {/* Corps du dé */}
        <rect 
          x="5" y="5" 
          width="90" height="90" 
          rx="15" ry="15"
          fill="url(#goldGradient)"
          stroke="#DAA520"
          strokeWidth="2"
          filter="url(#innerShadow)"
        />
        
        {/* Reflet brillant */}
        <rect 
          x="10" y="10" 
          width="40" height="20" 
          rx="8" ry="8"
          fill="rgba(255,255,255,0.3)"
        />
        
        {/* Points du dé */}
        {dots.map((dot, i) => (
          <circle
            key={i}
            cx={dot.x}
            cy={dot.y}
            r="10"
            fill="url(#dotGradient)"
          />
        ))}
      </svg>
    </motion.div>
  );
};

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
        stiffness: 100,
        delay: 0
      }}
      className="relative w-80 h-96 z-10 flex items-center justify-center"
    >
      {/* Golden Dice - appearing with the hand */}
      <motion.div 
        className="absolute top-[38%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex items-center gap-3"
      >
        {/* First Dice */}
        <motion.div
          animate={isExiting ? {
            rotateZ: [0, 360, 720],
            scale: [1, 1.2, 0],
            x: [-10, -40, -100],
            y: [0, -30, -80],
          } : {
            y: [0, -6, 0],
            rotate: [0, 8, -8, 0],
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
          <GoldenDice value={5} delay={0} />
        </motion.div>

        {/* Second Dice */}
        <motion.div
          animate={isExiting ? {
            rotateZ: [0, -360, -720],
            scale: [1, 1.2, 0],
            x: [10, 40, 100],
            y: [0, -30, -80],
          } : {
            y: [0, -6, 0],
            rotate: [0, -8, 8, 0],
          }}
          transition={isExiting ? {
            duration: 0.8,
            ease: "easeOut"
          } : {
            duration: 2.5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.3
          }}
        >
          <GoldenDice value={6} delay={0.1} />
        </motion.div>
      </motion.div>

      {/* Golden Hand Image */}
      <motion.img
        src={goldenHand}
        alt="Golden Hand"
        className="w-full h-full object-contain"
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ 
          opacity: 1,
          scale: 1,
          y: [0, -8, 0],
          rotate: [0, 2, -2, 0]
        }}
        transition={{ 
          opacity: { duration: 0.3, delay: 0 },
          scale: { type: "spring", damping: 15, stiffness: 100, delay: 0 },
          y: { duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 0.3 },
          rotate: { duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 0.3 }
        }}
      />

      {/* Sparkles around the hand */}
      <svg
        viewBox="0 0 280 280"
        className="absolute inset-0 w-full h-full pointer-events-none"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
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
              stroke="#FFD700"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <path
              d={`M${spark.x - 5} ${spark.y - 5} L${spark.x + 5} ${spark.y + 5} M${spark.x + 5} ${spark.y - 5} L${spark.x - 5} ${spark.y + 5}`}
              stroke="#DAA520"
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
