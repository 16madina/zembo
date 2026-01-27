import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSoundEffects } from "@/hooks/useSoundEffects";
import zIcon from "@/assets/z-icon.png";
import eIcon from "@/assets/e-icon.png";
import mIcon from "@/assets/m-icon.png";
import bIcon from "@/assets/b-icon.png";
import oIcon from "@/assets/o-icon.png";

const BottomNavigation = () => {
  const location = useLocation();
  const { t } = useLanguage();
  const { playNavSound } = useSoundEffects();

  const navItems = [
    { path: "/", icon: null, customIcon: zIcon, label: t.random, needsBlend: false, size: "w-5 h-5" },
    { path: "/live", icon: null, customIcon: eIcon, label: t.live, needsBlend: true, size: "w-5 h-5" },
    { path: "/discover", icon: null, customIcon: mIcon, label: "Zvibes", needsBlend: true, size: "w-5 h-5" },
    { path: "/messages", icon: null, customIcon: bIcon, label: t.messages, needsBlend: true, size: "w-5 h-5" },
    { path: "/profile", icon: null, customIcon: oIcon, label: t.profile, needsBlend: true, size: "w-6 h-6" },
  ];

  const handleNavClick = (path: string) => {
    // Only play sound when navigating to a different tab
    if (location.pathname !== path) {
      playNavSound();
    }
  };

  // Bounce animation variant for tap
  const bounceVariant = {
    tap: {
      scale: [1, 0.85, 1.15, 0.95, 1],
      transition: { duration: 0.4, ease: "easeOut" as const }
    }
  };

  // Floating animation for inactive icons
  const floatVariant = {
    float: {
      y: [0, -2, 0],
      transition: { 
        duration: 2, 
        repeat: Infinity, 
        ease: "easeInOut" as const 
      }
    }
  };

  // Active icon animation with golden shimmer
  const activeIconVariant = {
    active: {
      scale: [1, 1.08, 1],
      rotate: [0, 2, -2, 0],
      transition: { 
        duration: 1.5, 
        repeat: Infinity,
        ease: "easeInOut" as const
      }
    }
  };

  // Hover wiggle animation
  const hoverVariant = {
    hover: {
      rotate: [-5, 5, -5, 5, 0],
      transition: { duration: 0.5 }
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 pb-[env(safe-area-inset-bottom)]">
      <div className="mx-4 mb-2">
        <div className="glass-strong rounded-2xl">
          <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;
              
              return (
                <motion.div
                  key={item.path}
                  variants={bounceVariant}
                  whileTap="tap"
                >
                  <Link
                    to={item.path}
                    onClick={() => handleNavClick(item.path)}
                    className="relative flex flex-col items-center gap-0.5 p-2 rounded-xl tap-highlight"
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute inset-0 bg-primary/15 rounded-xl"
                        transition={{ type: "spring", stiffness: 500, damping: 35 }}
                      />
                    )}
                    {item.customIcon && (
                      <motion.div 
                        className="relative"
                        variants={{
                          ...floatVariant,
                          ...activeIconVariant,
                          ...hoverVariant
                        }}
                        animate={isActive ? "active" : "float"}
                        whileHover={!isActive ? "hover" : undefined}
                      >
                        {isActive && (
                          <>
                            {/* Golden glow base */}
                            <motion.div 
                              className="absolute inset-0 bg-primary/40 rounded-full blur-md"
                              animate={{ 
                                opacity: [0.4, 0.7, 0.4],
                                scale: [1, 1.2, 1]
                              }}
                              transition={{ duration: 1.5, repeat: Infinity }}
                            />
                            {/* Shimmer ring */}
                            <motion.div 
                              className="absolute -inset-1 rounded-full blur-lg"
                              style={{
                                background: "linear-gradient(90deg, hsl(var(--primary) / 0.3), hsl(45 100% 60% / 0.4), hsl(var(--primary) / 0.3))"
                              }}
                              animate={{ 
                                opacity: [0.5, 0.8, 0.5]
                              }}
                              transition={{ duration: 2, repeat: Infinity }}
                            />
                            {/* Sparkle particles */}
                            <motion.div
                              className="absolute -inset-2"
                              animate={{ rotate: 360 }}
                              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                            >
                              {[0, 90, 180, 270].map((deg) => (
                                <motion.div
                                  key={deg}
                                  className="absolute w-1 h-1 bg-primary rounded-full"
                                  style={{
                                    top: "50%",
                                    left: "50%",
                                    transform: `rotate(${deg}deg) translateY(-12px)`
                                  }}
                                  animate={{ 
                                    opacity: [0, 1, 0],
                                    scale: [0.5, 1, 0.5]
                                  }}
                                  transition={{ 
                                    duration: 1.5, 
                                    repeat: Infinity,
                                    delay: deg / 360
                                  }}
                                />
                              ))}
                            </motion.div>
                          </>
                        )}
                        <motion.img 
                          src={item.customIcon} 
                          alt={item.label}
                          className={`${item.size || "w-5 h-5"} relative z-10 transition-all duration-200 ${
                            item.needsBlend ? "mix-blend-screen" : ""
                          } ${
                            isActive 
                              ? "brightness-125 drop-shadow-[0_0_8px_rgba(212,175,55,0.8)]" 
                              : "brightness-75 grayscale-[30%]"
                          }`}
                        />
                      </motion.div>
                    )}
                    <span className={`text-[10px] font-medium relative z-10 transition-colors duration-200 ${
                      isActive ? "text-primary" : "text-muted-foreground"
                    }`}>
                      {item.label}
                    </span>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default BottomNavigation;
