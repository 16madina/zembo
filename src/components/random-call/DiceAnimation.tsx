import { motion } from "framer-motion";

const DiceAnimation = () => {
  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", damping: 15, delay: 0.1 }}
      className="relative w-64 h-64 mb-6 z-10"
    >
      {/* Hand SVG */}
      <svg
        viewBox="0 0 200 200"
        className="absolute inset-0 w-full h-full"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Golden Hand */}
        <motion.g
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <path
            d="M60 180 C60 180 55 140 70 120 C75 112 85 108 90 105 L90 95 C90 90 95 85 100 85 C105 85 110 90 110 95 L110 100 L115 90 C117 85 122 82 128 84 C134 86 137 92 135 98 L130 115 L140 100 C143 95 150 93 155 97 C160 101 162 108 158 114 L145 135 L155 125 C160 120 168 120 173 126 C178 132 177 140 172 145 L130 180 L60 180 Z"
            fill="hsl(var(--primary))"
            stroke="hsl(var(--primary-foreground) / 0.3)"
            strokeWidth="1"
          />
          {/* Palm lines */}
          <path
            d="M75 150 Q90 140 100 150"
            stroke="hsl(var(--primary-foreground) / 0.3)"
            strokeWidth="1.5"
            fill="none"
          />
          <path
            d="M80 160 Q95 150 110 158"
            stroke="hsl(var(--primary-foreground) / 0.3)"
            strokeWidth="1.5"
            fill="none"
          />
        </motion.g>

        {/* Dice 1 */}
        <motion.g
          animate={{ 
            y: [0, -20, 0],
            rotate: [0, 15, -10, 5, 0],
            x: [-5, 0, -5]
          }}
          transition={{ 
            duration: 2.5, 
            repeat: Infinity, 
            ease: "easeInOut",
            delay: 0 
          }}
        >
          {/* Dice body - 3D effect */}
          <rect x="55" y="30" width="40" height="40" rx="6" fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="1.5" />
          {/* Right face */}
          <path d="M95 30 L105 20 L105 60 L95 70 Z" fill="hsl(var(--muted))" stroke="hsl(var(--border))" strokeWidth="1" />
          {/* Top face */}
          <path d="M55 30 L65 20 L105 20 L95 30 Z" fill="hsl(var(--accent))" stroke="hsl(var(--border))" strokeWidth="1" />
          
          {/* Dots on front face - 5 */}
          <circle cx="67" cy="42" r="4" fill="hsl(var(--foreground))" />
          <circle cx="83" cy="42" r="4" fill="hsl(var(--foreground))" />
          <circle cx="75" cy="50" r="4" fill="hsl(var(--foreground))" />
          <circle cx="67" cy="58" r="4" fill="hsl(var(--foreground))" />
          <circle cx="83" cy="58" r="4" fill="hsl(var(--foreground))" />
        </motion.g>

        {/* Dice 2 */}
        <motion.g
          animate={{ 
            y: [0, -25, 0],
            rotate: [0, -20, 15, -5, 0],
            x: [5, 0, 5]
          }}
          transition={{ 
            duration: 2.5, 
            repeat: Infinity, 
            ease: "easeInOut",
            delay: 0.2 
          }}
        >
          {/* Dice body - 3D effect */}
          <rect x="110" y="25" width="40" height="40" rx="6" fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="1.5" />
          {/* Right face */}
          <path d="M150 25 L160 15 L160 55 L150 65 Z" fill="hsl(var(--muted))" stroke="hsl(var(--border))" strokeWidth="1" />
          {/* Top face */}
          <path d="M110 25 L120 15 L160 15 L150 25 Z" fill="hsl(var(--accent))" stroke="hsl(var(--border))" strokeWidth="1" />
          
          {/* Dots on front face - 6 */}
          <circle cx="122" cy="35" r="4" fill="hsl(var(--foreground))" />
          <circle cx="138" cy="35" r="4" fill="hsl(var(--foreground))" />
          <circle cx="122" cy="45" r="4" fill="hsl(var(--foreground))" />
          <circle cx="138" cy="45" r="4" fill="hsl(var(--foreground))" />
          <circle cx="122" cy="55" r="4" fill="hsl(var(--foreground))" />
          <circle cx="138" cy="55" r="4" fill="hsl(var(--foreground))" />
        </motion.g>

        {/* Sparkles around dice */}
        {[
          { x: 45, y: 25, delay: 0 },
          { x: 165, y: 20, delay: 0.5 },
          { x: 105, y: 5, delay: 1 },
        ].map((spark, i) => (
          <motion.g
            key={i}
            animate={{ 
              opacity: [0, 1, 0],
              scale: [0.5, 1, 0.5]
            }}
            transition={{ 
              duration: 1.5, 
              repeat: Infinity,
              delay: spark.delay
            }}
          >
            <path
              d={`M${spark.x} ${spark.y - 5} L${spark.x} ${spark.y + 5} M${spark.x - 5} ${spark.y} L${spark.x + 5} ${spark.y}`}
              stroke="hsl(var(--primary))"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </motion.g>
        ))}
      </svg>
    </motion.div>
  );
};

export default DiceAnimation;
