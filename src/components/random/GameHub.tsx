import { motion } from "framer-motion";
import { Phone, Zap, Sparkles, Heart } from "lucide-react";
import goldenHand from "@/assets/golden-hand.png";
import speedDatingPhones from "@/assets/games/speed-dating-phones.png";
import zemboOracle from "@/assets/games/zembo-oracle.png";

interface GameHubProps {
  onSelectGame: (game: "zconnect" | "speedDating" | "oracle" | "compatibility") => void;
}

const games = [
  {
    id: "zconnect" as const,
    name: "Z Connect",
    description: "Appel vocal aléatoire avec un inconnu",
    icon: Phone,
    emoji: "📞",
    gradient: "from-primary/20 to-primary/5",
    borderColor: "border-primary/30",
    iconBg: "bg-primary/20",
    iconColor: "text-primary",
    customImage: goldenHand,
  },
  {
    id: "speedDating" as const,
    name: "Speed Dating",
    description: "Rencontres rapides en vidéo",
    icon: Zap,
    emoji: "⚡",
    gradient: "from-accent/30 to-accent/10",
    borderColor: "border-accent/40",
    iconBg: "bg-accent/30",
    iconColor: "text-accent-foreground",
    customImage: speedDatingPhones,
  },
  {
    id: "oracle" as const,
    name: "Zembo Oracle",
    description: "Trouve ton match parfait par l'IA",
    icon: Sparkles,
    emoji: "🔮",
    gradient: "from-secondary/50 to-secondary/20",
    borderColor: "border-secondary",
    iconBg: "bg-secondary/50",
    iconColor: "text-secondary-foreground",
    customImage: zemboOracle,
  },
  {
    id: "compatibility" as const,
    name: "Compatibilité",
    description: "Test de compatibilité avec tous",
    icon: Heart,
    emoji: "💕",
    gradient: "from-pink-500/20 to-pink-500/5",
    borderColor: "border-pink-500/30",
    iconBg: "bg-pink-500/20",
    iconColor: "text-pink-400",
  },
];

const GameHub = ({ onSelectGame }: GameHubProps) => {
  return (
    <div className="w-full max-w-lg mx-auto px-4">
      <motion.div
        className="text-center mb-6"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-xl font-bold text-foreground">
          Bienvenue sur <span className="text-primary text-2xl font-black">Z</span> Games
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          Choisis ton mode de rencontre
        </p>
      </motion.div>

      <div className="grid grid-cols-2 gap-3">
        {games.map((game, index) => {
          return (
            <motion.button
              key={game.id}
              onClick={() => onSelectGame(game.id)}
              className={`relative flex flex-col items-center justify-end p-4 rounded-2xl border ${game.borderColor} bg-gradient-to-br ${game.gradient} backdrop-blur-sm transition-all duration-200 active:scale-95 min-h-[140px] overflow-hidden`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
            >
              {/* Full card image for Z Connect */}
              {'customImage' in game && game.customImage ? (
                <>
                  {/* Background image covering the entire card */}
                  <motion.div
                    className="absolute inset-0 flex items-center justify-center"
                    animate={{
                      y: [0, -3, 0],
                    }}
                    transition={{
                      duration: 2.5,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  >
                    <motion.img
                      src={game.customImage}
                      alt={game.name}
                      className="w-full h-full object-cover scale-110"
                      animate={{
                        filter: [
                          "drop-shadow(0 0 10px rgba(234, 179, 8, 0.4))",
                          "drop-shadow(0 0 20px rgba(234, 179, 8, 0.7))",
                          "drop-shadow(0 0 10px rgba(234, 179, 8, 0.4))",
                        ],
                      }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                    />
                  </motion.div>
                  
                  {/* Sparkle effects */}
                  {[...Array(4)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute w-1.5 h-1.5 bg-primary rounded-full z-10"
                      style={{
                        top: `${15 + i * 20}%`,
                        left: `${15 + (i % 2) * 60}%`,
                      }}
                      animate={{
                        scale: [0, 1.5, 0],
                        opacity: [0, 1, 0],
                      }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        delay: i * 0.4,
                      }}
                    />
                  ))}
                  
                  {/* Dark gradient overlay for text readability */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none" />
                </>
              ) : (
                <div className={`w-12 h-12 rounded-full ${game.iconBg} flex items-center justify-center mb-2`}>
                  <span className="text-2xl">{game.emoji}</span>
                </div>
              )}

              {/* Title - positioned at bottom for image cards */}
              <h3 className={`font-semibold text-sm text-center relative z-10 ${'customImage' in game && game.customImage ? 'text-white' : 'text-foreground'}`}>
                {game.name}
              </h3>

              {/* Description */}
              <p className={`text-[10px] text-center mt-1 leading-tight relative z-10 ${'customImage' in game && game.customImage ? 'text-white/80' : 'text-muted-foreground'}`}>
                {game.description}
              </p>

              {/* Decorative glow */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

export default GameHub;
