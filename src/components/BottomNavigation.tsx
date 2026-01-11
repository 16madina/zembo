import { Home, Video, MessageCircle, User } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { haptics, isNative, ImpactStyle } from "@/lib/capacitor";
import { useLanguage } from "@/contexts/LanguageContext";
import zIcon from "@/assets/z-icon.png";

const BottomNavigation = () => {
  const location = useLocation();
  const { t } = useLanguage();

  const navItems = [
    { path: "/", icon: Home, label: t.home },
    { path: "/live", icon: Video, label: t.live },
    { path: "/random", icon: null, customIcon: zIcon, label: t.random },
    { path: "/messages", icon: MessageCircle, label: t.messages },
    { path: "/profile", icon: User, label: t.profile },
  ];

  const handleNavClick = () => {
    if (isNative) {
      haptics.impact(ImpactStyle.Light);
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 pb-[var(--sab)]">
      <div className="mx-4 mb-4">
        <div className="glass-strong rounded-2xl">
          <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;
              
              return (
                <Link
                  key={item.path}
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
                    <img 
                      src={item.customIcon} 
                      alt={item.label}
                      className={`w-5 h-5 relative z-10 transition-all duration-200 ${
                        isActive ? "brightness-110 drop-shadow-[0_0_6px_rgba(212,175,55,0.6)]" : "brightness-75 grayscale-[30%]"
                      }`}
                    />
                  ) : (
                    <Icon 
                      className={`w-5 h-5 relative z-10 transition-colors duration-200 ${
                        isActive ? "text-primary" : "text-muted-foreground"
                      }`}
                      strokeWidth={isActive ? 2.5 : 2}
                    />
                  )}
                  <span className={`text-[10px] font-medium relative z-10 transition-colors duration-200 ${
                    isActive ? "text-primary" : "text-muted-foreground"
                  }`}>
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default BottomNavigation;
