import { motion } from "framer-motion";

const DiceAnimation = () => {
  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", damping: 15, delay: 0.2 }}
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
        </defs>
        
        {/* Background glow */}
        <ellipse cx="140" cy="170" rx="80" ry="40" fill="url(#handGlow)" />

        {/* Golden Hand - more realistic open palm */}
        <motion.g
          animate={{ 
            y: [0, -8, 0],
            rotate: [0, 2, -2, 0]
          }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          style={{ originX: "140px", originY: "200px" }}
        >
          {/* Palm base */}
          <path
            d="M90 220 
               C85 195 88 175 95 160
               L95 155
               C95 150 100 145 107 145
               L107 130
               C107 122 113 116 121 116
               C129 116 135 122 135 130
               L135 140
               L138 125
               C140 117 147 112 155 114
               C163 116 168 123 166 131
               L162 150
               L168 135
               C171 127 179 123 187 126
               C195 129 199 137 196 145
               L185 175
               L193 165
               C198 158 208 157 215 163
               C222 169 223 179 217 186
               L175 220
               Z"
            fill="hsl(var(--primary))"
            stroke="hsl(var(--primary-foreground) / 0.2)"
            strokeWidth="1.5"
          />
          
          {/* Thumb */}
          <path
            d="M95 160 
               C80 155 70 165 68 180
               C66 195 75 205 90 210"
            fill="hsl(var(--primary))"
            stroke="hsl(var(--primary-foreground) / 0.2)"
            strokeWidth="1.5"
          />
          
          {/* Palm lines */}
          <path
            d="M105 185 Q125 175 145 183"
            stroke="hsl(var(--primary-foreground) / 0.25)"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M100 195 Q125 185 155 193"
            stroke="hsl(var(--primary-foreground) / 0.25)"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M110 205 Q130 198 150 203"
            stroke="hsl(var(--primary-foreground) / 0.25)"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
          />
          
          {/* Finger creases */}
          <path d="M107 142 Q110 140 113 142" stroke="hsl(var(--primary-foreground) / 0.2)" strokeWidth="1" fill="none" />
          <path d="M135 137 Q138 135 141 137" stroke="hsl(var(--primary-foreground) / 0.2)" strokeWidth="1" fill="none" />
          <path d="M162 147 Q165 145 168 147" stroke="hsl(var(--primary-foreground) / 0.2)" strokeWidth="1" fill="none" />
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
          <rect x="50" y="50" width="55" height="55" rx="8" fill="#F5F0E8" stroke="#D4C9B8" strokeWidth="2" />
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
          <rect x="145" y="45" width="55" height="55" rx="8" fill="#F5F0E8" stroke="#D4C9B8" strokeWidth="2" />
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
