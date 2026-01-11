import { motion } from "framer-motion";

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
      className="relative w-72 h-56 z-10"
    >
      <svg
        viewBox="0 0 280 220"
        className="absolute inset-0 w-full h-full"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Glow effect behind hand */}
        <defs>
          <radialGradient id="handGlow" cx="50%" cy="70%" r="50%">
            <stop offset="0%" stopColor="hsl(var(--primary) / 0.3)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
          <filter id="diceShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="2" dy="4" stdDeviation="3" floodOpacity="0.3" />
          </filter>
          <linearGradient id="diceShine" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#F5F0E8" stopOpacity="1" />
            <stop offset="100%" stopColor="#E8E0D4" stopOpacity="1" />
          </linearGradient>
        </defs>
        
        {/* Background glow */}
        <ellipse cx="140" cy="170" rx="80" ry="40" fill="url(#handGlow)" />

        {/* Elegant Golden Hand with 5 defined fingers */}
        <motion.g
          animate={{ 
            y: [0, -8, 0],
            rotate: [0, 2, -2, 0]
          }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          style={{ originX: "140px", originY: "200px" }}
        >
          {/* Gradient for hand */}
          <defs>
            <linearGradient id="handGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="hsl(var(--primary))" />
              <stop offset="50%" stopColor="hsl(45 93% 55%)" />
              <stop offset="100%" stopColor="hsl(var(--primary))" />
            </linearGradient>
            <linearGradient id="handHighlight" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="hsl(45 93% 75%)" stopOpacity="0.6" />
              <stop offset="100%" stopColor="transparent" />
            </linearGradient>
          </defs>

          {/* Palm - elegant curved shape */}
          <path
            d="M100 220 
               C92 205 90 190 92 178
               Q94 168 100 160
               L100 158
               Q100 155 102 153
               L180 153
               Q185 155 185 160
               L185 165
               Q190 175 192 190
               C195 210 190 220 180 220
               Z"
            fill="url(#handGradient)"
            stroke="hsl(35 70% 35%)"
            strokeWidth="1"
          />
          
          {/* Palm highlight */}
          <path
            d="M105 170 Q140 165 175 170 Q175 180 140 180 Q105 180 105 170 Z"
            fill="url(#handHighlight)"
          />

          {/* Pinky finger (5th) */}
          <path
            d="M100 158 
               Q95 155 93 148
               L93 120
               Q93 112 98 112
               Q103 112 103 120
               L103 148
               Q103 152 100 155"
            fill="url(#handGradient)"
            stroke="hsl(35 70% 35%)"
            strokeWidth="1"
          />
          <path d="M95 130 Q98 128 101 130" stroke="hsl(35 70% 35% / 0.5)" strokeWidth="0.8" fill="none" />
          <path d="M95 138 Q98 136 101 138" stroke="hsl(35 70% 35% / 0.5)" strokeWidth="0.8" fill="none" />
          
          {/* Ring finger (4th) */}
          <path
            d="M115 155 
               Q110 152 108 145
               L108 105
               Q108 95 115 95
               Q122 95 122 105
               L122 145
               Q122 150 118 153"
            fill="url(#handGradient)"
            stroke="hsl(35 70% 35%)"
            strokeWidth="1"
          />
          <path d="M111 115 Q115 113 119 115" stroke="hsl(35 70% 35% / 0.5)" strokeWidth="0.8" fill="none" />
          <path d="M111 125 Q115 123 119 125" stroke="hsl(35 70% 35% / 0.5)" strokeWidth="0.8" fill="none" />
          
          {/* Middle finger (3rd) - tallest */}
          <path
            d="M138 155 
               Q133 152 131 145
               L131 90
               Q131 80 140 80
               Q149 80 149 90
               L149 145
               Q149 150 145 153"
            fill="url(#handGradient)"
            stroke="hsl(35 70% 35%)"
            strokeWidth="1"
          />
          <path d="M134 100 Q140 98 146 100" stroke="hsl(35 70% 35% / 0.5)" strokeWidth="0.8" fill="none" />
          <path d="M134 112 Q140 110 146 112" stroke="hsl(35 70% 35% / 0.5)" strokeWidth="0.8" fill="none" />
          
          {/* Index finger (2nd) */}
          <path
            d="M163 155 
               Q158 152 156 145
               L156 100
               Q156 90 164 90
               Q172 90 172 100
               L172 145
               Q172 150 168 153"
            fill="url(#handGradient)"
            stroke="hsl(35 70% 35%)"
            strokeWidth="1"
          />
          <path d="M159 110 Q164 108 170 110" stroke="hsl(35 70% 35% / 0.5)" strokeWidth="0.8" fill="none" />
          <path d="M159 122 Q164 120 170 122" stroke="hsl(35 70% 35% / 0.5)" strokeWidth="0.8" fill="none" />
          
          {/* Thumb - curved and elegant */}
          <path
            d="M100 175 
               Q90 172 82 178
               L70 195
               Q62 205 68 215
               Q75 225 88 218
               L100 208
               Q105 200 100 185"
            fill="url(#handGradient)"
            stroke="hsl(35 70% 35%)"
            strokeWidth="1"
          />
          <path d="M78 198 Q82 195 86 198" stroke="hsl(35 70% 35% / 0.5)" strokeWidth="0.8" fill="none" />
          
          {/* Fingernails - subtle shine */}
          <ellipse cx="98" cy="114" rx="3" ry="4" fill="hsl(45 50% 85%)" opacity="0.8" />
          <ellipse cx="115" cy="98" rx="4" ry="5" fill="hsl(45 50% 85%)" opacity="0.8" />
          <ellipse cx="140" cy="83" rx="5" ry="5" fill="hsl(45 50% 85%)" opacity="0.8" />
          <ellipse cx="164" cy="93" rx="4" ry="5" fill="hsl(45 50% 85%)" opacity="0.8" />
          <ellipse cx="75" cy="202" rx="4" ry="3" fill="hsl(45 50% 85%)" opacity="0.8" transform="rotate(-30 75 202)" />
          
          {/* Palm lines - elegant curves */}
          <path
            d="M108 180 Q135 172 165 180"
            stroke="hsl(35 70% 35% / 0.3)"
            strokeWidth="1.2"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M105 190 Q135 182 170 190"
            stroke="hsl(35 70% 35% / 0.3)"
            strokeWidth="1.2"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M108 200 Q135 195 168 200"
            stroke="hsl(35 70% 35% / 0.3)"
            strokeWidth="1"
            fill="none"
            strokeLinecap="round"
          />
          
          {/* Life line */}
          <path
            d="M100 175 Q115 195 110 215"
            stroke="hsl(35 70% 35% / 0.25)"
            strokeWidth="1"
            fill="none"
            strokeLinecap="round"
          />
        </motion.g>

        {/* Dice 1 - Left */}
        <motion.g
          filter="url(#diceShadow)"
          animate={{ 
            y: [0, -30, 0],
            rotate: [0, 25, -15, 10, 0],
            x: [0, -8, 0]
          }}
          transition={{ 
            duration: 2, 
            repeat: Infinity, 
            ease: "easeInOut",
            times: [0, 0.4, 0.6, 0.8, 1]
          }}
          style={{ originX: "80px", originY: "80px" }}
        >
          {/* Front face */}
          <rect x="50" y="50" width="55" height="55" rx="8" fill="url(#diceShine)" stroke="#D4C9B8" strokeWidth="2" />
          {/* Right face */}
          <path d="M105 50 L120 35 L120 90 L105 105 Z" fill="#E8E0D4" stroke="#D4C9B8" strokeWidth="1.5" />
          {/* Top face */}
          <path d="M50 50 L65 35 L120 35 L105 50 Z" fill="#FAF7F2" stroke="#D4C9B8" strokeWidth="1.5" />
          
          {/* Dots - showing 5 */}
          <circle cx="65" cy="65" r="5" fill="#1A1A2E" />
          <circle cx="90" cy="65" r="5" fill="#1A1A2E" />
          <circle cx="77.5" cy="77.5" r="5" fill="#1A1A2E" />
          <circle cx="65" cy="90" r="5" fill="#1A1A2E" />
          <circle cx="90" cy="90" r="5" fill="#1A1A2E" />
          
          {/* Top face dot */}
          <circle cx="92" cy="42" r="3" fill="#1A1A2E" />
        </motion.g>

        {/* Dice 2 - Right */}
        <motion.g
          filter="url(#diceShadow)"
          animate={{ 
            y: [0, -35, 0],
            rotate: [0, -30, 20, -8, 0],
            x: [0, 10, 0]
          }}
          transition={{ 
            duration: 2, 
            repeat: Infinity, 
            ease: "easeInOut",
            delay: 0.15,
            times: [0, 0.4, 0.6, 0.8, 1]
          }}
          style={{ originX: "175px", originY: "75px" }}
        >
          {/* Front face */}
          <rect x="145" y="45" width="55" height="55" rx="8" fill="url(#diceShine)" stroke="#D4C9B8" strokeWidth="2" />
          {/* Right face */}
          <path d="M200 45 L215 30 L215 85 L200 100 Z" fill="#E8E0D4" stroke="#D4C9B8" strokeWidth="1.5" />
          {/* Top face */}
          <path d="M145 45 L160 30 L215 30 L200 45 Z" fill="#FAF7F2" stroke="#D4C9B8" strokeWidth="1.5" />
          
          {/* Dots - showing 6 */}
          <circle cx="160" cy="57" r="5" fill="#1A1A2E" />
          <circle cx="185" cy="57" r="5" fill="#1A1A2E" />
          <circle cx="160" cy="72.5" r="5" fill="#1A1A2E" />
          <circle cx="185" cy="72.5" r="5" fill="#1A1A2E" />
          <circle cx="160" cy="88" r="5" fill="#1A1A2E" />
          <circle cx="185" cy="88" r="5" fill="#1A1A2E" />
          
          {/* Top face dots */}
          <circle cx="175" cy="37" r="3" fill="#1A1A2E" />
          <circle cx="195" cy="37" r="3" fill="#1A1A2E" />
        </motion.g>

        {/* Sparkles */}
        {[
          { x: 35, y: 45, delay: 0 },
          { x: 230, y: 35, delay: 0.6 },
          { x: 130, y: 15, delay: 0.3 },
          { x: 45, y: 90, delay: 0.9 },
          { x: 225, y: 85, delay: 1.2 },
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
