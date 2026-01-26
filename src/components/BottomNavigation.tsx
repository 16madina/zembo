import { MessageCircle, User } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { haptics, isNative, ImpactStyle } from "@/lib/capacitor";
import { useLanguage } from "@/contexts/LanguageContext";
import zIcon from "@/assets/z-icon.png";
import eIcon from "@/assets/e-icon.png";
import mIcon from "@/assets/m-icon.png";

const BottomNavigation = () => {
  const location = useLocation();
  const { t } = useLanguage();

  const navItems = [
    { path: "/", icon: null, customIcon: zIcon, label: t.random },
    { path: "/live", icon: null, customIcon: eIcon, label: t.live },
    { path: "/discover", icon: null, customIcon: mIcon, label: "Zvibes" },
    { path: "/messages", icon: MessageCircle, label: t.messages },
    { path: "/profile", icon: User, label: t.profile },
  ];

  const handleNavClick = () => {
    if (isNative) {
      haptics.impact(ImpactStyle.Light);
    }
  };

  // Bounce animation variant
  const bounceVariant = {
    tap: {
      scale: [1, 0.85, 1.15, 0.95, 1],
      transition: { duration: 0.4, ease: "easeOut" as const }
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
                    onClick={handleNavClick}
                    className="relative flex flex-col items-center gap-0.5 p-2 rounded-xl tap-highlight"
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute inset-0 bg-primary/15 rounded-xl"
                        transition={{ type: "spring", stiffness: 500, damping: 35 }}
                      />
                    )}
                    {item.customIcon ? (
                      <motion.div 
                        className="relative"
                        animate={isActive ? { scale: [1, 1.1, 1] } : {}}
                        transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
                      >
                        {isActive && (
                          <>
                            <div className="absolute inset-0 bg-primary/40 rounded-full blur-md animate-pulse" />
                            <div className="absolute -inset-1 bg-gradient-to-r from-primary/30 via-yellow-400/30 to-primary/30 rounded-full blur-lg animate-[pulse_1.5s_ease-in-out_infinite]" />
                          </>
                        )}
                        <img 
                          src={item.customIcon} 
                          alt={item.label}
                          className={`w-5 h-5 relative z-10 transition-all duration-200 ${
                            isActive 
                              ? "brightness-125 drop-shadow-[0_0_8px_rgba(212,175,55,0.8)]" 
                              : "brightness-75 grayscale-[30%]"
                          }`}
                        />
                      </motion.div>
                    ) : (
                      <motion.div 
                        className="relative"
                        animate={isActive ? { scale: [1, 1.1, 1] } : {}}
                        transition={{ 
                          duration: item.path === "/discover" ? 8 : 0.5, 
                          repeat: Infinity, 
                          repeatDelay: item.path === "/discover" ? 0 : 2 
                        }}
                      >
                        {isActive && (
                          <>
                            <div className="absolute inset-0 bg-primary/40 rounded-full blur-md animate-pulse" />
                            <div className="absolute -inset-1 bg-gradient-to-r from-primary/30 via-yellow-400/30 to-primary/30 rounded-full blur-lg animate-[pulse_1.5s_ease-in-out_infinite]" />
                          </>
                        )}
                        <Icon 
                          className={`relative z-10 transition-all duration-300 ${
                            item.path === "/discover" 
                              ? `w-6 h-6 ${isActive 
                                  ? "text-primary animate-[spin_8s_linear_infinite] drop-shadow-[0_0_8px_rgba(212,175,55,0.8)]" 
                                  : "text-muted-foreground hover:text-primary/70 hover:scale-110"}`
                              : `w-5 h-5 ${isActive 
                                  ? "text-primary drop-shadow-[0_0_6px_rgba(212,175,55,0.6)]" 
                                  : "text-muted-foreground hover:text-primary/70 hover:scale-110"}`
                          }`}
                          strokeWidth={isActive ? 2.5 : 2}
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
