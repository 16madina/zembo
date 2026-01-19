import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import goldenHand from "@/assets/golden-hand.png";

interface DiceAnimationProps {
  isExiting?: boolean;
}

// Composant de dé doré avec vrais points et rotation 3D
const GoldenDice = ({ value, delay = 0, isRolling = false }: { value: number; delay?: number; isRolling?: boolean }) => {
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
      initial={{ opacity: 0, scale: 0, rotateX: -180, rotateY: -180 }}
      animate={{ 
        opacity: 1, 
        scale: 1, 
        rotateX: 0, 
        rotateY: 0 
      }}
      transition={{ 
        type: "spring", 
        damping: 12, 
        stiffness: 80,
        delay: delay
      }}
      className="relative w-14 h-14"
      style={{ 
        transformStyle: "preserve-3d",
        perspective: "1000px"
      }}
    >
      {/* Animation de rotation 3D continue */}
      <motion.div
        animate={isRolling ? {
          rotateX: [0, 360],
          rotateY: [0, 360],
          scale: [1, 1.1, 1],
        } : {
          rotateX: [0, 5, -5, 0],
          rotateY: [0, 10, -10, 0],
        }}
        transition={isRolling ? {
          duration: 0.5,
          ease: "easeOut"
        } : {
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        style={{ transformStyle: "preserve-3d" }}
      >
        {/* Dé avec dégradé doré */}
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-xl">
          <defs>
            {/* Dégradé doré principal */}
            <linearGradient id={`goldGradient-${value}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFD700" />
              <stop offset="25%" stopColor="#FFEC8B" />
              <stop offset="50%" stopColor="#FFD700" />
              <stop offset="75%" stopColor="#DAA520" />
              <stop offset="100%" stopColor="#B8860B" />
            </linearGradient>
            {/* Dégradé pour les points */}
            <radialGradient id={`dotGradient-${value}`} cx="30%" cy="30%">
              <stop offset="0%" stopColor="#5C3317" />
              <stop offset="100%" stopColor="#3D1F0D" />
            </radialGradient>
            {/* Ombre portée */}
            <filter id={`diceShadow-${value}`} x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="3" dy="3" stdDeviation="3" floodColor="#000" floodOpacity="0.4"/>
            </filter>
          </defs>
          
          {/* Corps du dé */}
          <rect 
            x="5" y="5" 
            width="90" height="90" 
            rx="12" ry="12"
            fill={`url(#goldGradient-${value})`}
            stroke="#B8860B"
            strokeWidth="2"
            filter={`url(#diceShadow-${value})`}
          />
          
          {/* Reflet brillant en haut */}
          <ellipse 
            cx="35" cy="20" 
            rx="25" ry="10"
            fill="rgba(255,255,255,0.4)"
          />
          
          {/* Reflet secondaire */}
          <ellipse 
            cx="70" cy="75" 
            rx="15" ry="8"
            fill="rgba(255,255,255,0.15)"
          />
          
          {/* Points du dé */}
          {dots.map((dot, i) => (
            <motion.circle
              key={i}
              cx={dot.x}
              cy={dot.y}
              r="9"
              fill={`url(#dotGradient-${value})`}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: delay + 0.1 + i * 0.05 }}
            />
          ))}
        </svg>
      </motion.div>
    </motion.div>
  );
};

const DiceAnimation = ({ isExiting = false }: DiceAnimationProps) => {
  const [dice1Value, setDice1Value] = useState(5);
  const [dice2Value, setDice2Value] = useState(6);
  const [isRolling, setIsRolling] = useState(false);

  // Changer les valeurs des dés aléatoirement toutes les 3 secondes
  useEffect(() => {
    const interval = setInterval(() => {
      setIsRolling(true);
      
      // Animation de roulement rapide
      const rollInterval = setInterval(() => {
        setDice1Value(Math.floor(Math.random() * 6) + 1);
        setDice2Value(Math.floor(Math.random() * 6) + 1);
      }, 100);
      
      // Arrêter le roulement après 500ms
      setTimeout(() => {
        clearInterval(rollInterval);
        setIsRolling(false);
        // Valeur finale
        setDice1Value(Math.floor(Math.random() * 6) + 1);
        setDice2Value(Math.floor(Math.random() * 6) + 1);
      }, 500);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

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
      style={{ perspective: "1000px" }}
    >
      {/* Golden Dice - appearing with the hand */}
      <motion.div 
        className="absolute top-[38%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex items-center gap-4"
      >
        {/* First Dice */}
        <motion.div
          animate={isExiting ? {
            rotateZ: [0, 360, 720],
            rotateX: [0, 180, 360],
            scale: [1, 1.2, 0],
            x: [-10, -40, -100],
            y: [0, -30, -80],
          } : {
            y: [0, -8, 0],
            rotateZ: [0, 3, -3, 0],
          }}
          transition={isExiting ? {
            duration: 0.8,
            ease: "easeOut"
          } : {
            duration: 2.5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          style={{ transformStyle: "preserve-3d" }}
        >
          <GoldenDice value={dice1Value} delay={0} isRolling={isRolling} />
        </motion.div>

        {/* Second Dice */}
        <motion.div
          animate={isExiting ? {
            rotateZ: [0, -360, -720],
            rotateX: [0, -180, -360],
            scale: [1, 1.2, 0],
            x: [10, 40, 100],
            y: [0, -30, -80],
          } : {
            y: [0, -8, 0],
            rotateZ: [0, -3, 3, 0],
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
          style={{ transformStyle: "preserve-3d" }}
        >
          <GoldenDice value={dice2Value} delay={0.1} isRolling={isRolling} />
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
