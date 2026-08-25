import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSoundEffects } from "@/hooks/useSoundEffects";
import { useHaptics } from "@/hooks/useHaptics";
import zIcon from "@/assets/z-icon.png";
import eIcon from "@/assets/e-icon.png";
import mIcon from "@/assets/m-icon.png";
import bIcon from "@/assets/b-icon.png";
import oIcon from "@/assets/o-icon.png";

const BottomNavigation = () => {
  const location = useLocation();
  const { t } = useLanguage();
  const { playNavSound } = useSoundEffects();
  const haptics = useHaptics();

  const navItems = [
    { path: "/", icon: null, customIcon: zIcon, label: t.live, needsBlend: false, size: "w-5 h-5" },
    { path: "/discover", icon: null, customIcon: eIcon, label: "Découvrir", needsBlend: true, size: "w-5 h-5" },
    { path: "/rooms", icon: null, customIcon: mIcon, label: "Salons", needsBlend: true, size: "w-5 h-5" },
    { path: "/messages", icon: null, customIcon: bIcon, label: t.messages, needsBlend: true, size: "w-5 h-5" },
    { path: "/profile", icon: null, customIcon: oIcon, label: t.profile, needsBlend: true, size: "w-6 h-6" },
  ];

  const handleNavClick = (path: string) => {
    // Only give feedback when navigating to a different tab
    if (location.pathname !== path) {
      haptics.selection();
      playNavSound();
    }
  };

  // Short native-feeling bounce on tap
  const bounceVariant = {
    tap: {
      scale: [1, 0.92, 1],
      transition: { duration: 0.15, ease: "easeOut" as const }
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 pb-[env(safe-area-inset-bottom)]">
      {/* Opaque backdrop to hide scrolling content */}
      <div className="absolute inset-x-0 bottom-0 h-full bg-background/95 backdrop-blur-xl" />
      <div className="relative mx-4 mb-1">
        <div className="glass-strong rounded-2xl border border-white/10">
          <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              
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
                      <div className="relative transform-gpu">
                        {isActive && (
                          /* Static golden halo (no looping animation) */
                          <div className="absolute inset-0 bg-primary/40 rounded-full blur-md transform-gpu" />
                        )}
                        <img 
                          src={item.customIcon} 
                          alt={item.label}
                          className={`${item.size || "w-5 h-5"} relative z-10 transition-all duration-200 transform-gpu ${
                            item.needsBlend ? "mix-blend-screen" : ""
                          } ${
                            isActive 
                              ? "brightness-125 drop-shadow-[0_0_6px_rgba(212,175,55,0.7)]" 
                              : "brightness-75 grayscale-[30%]"
                          }`}
                        />
                      </div>
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
