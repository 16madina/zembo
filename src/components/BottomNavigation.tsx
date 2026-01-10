import { Home, Video, Shuffle, MessageCircle, User } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

const navItems = [
  { path: "/", icon: Home, label: "Accueil" },
  { path: "/live", icon: Video, label: "Live" },
  { path: "/random", icon: Shuffle, label: "Random" },
  { path: "/messages", icon: MessageCircle, label: "Messages" },
  { path: "/profile", icon: User, label: "Profil" },
];

const BottomNavigation = () => {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-t border-border">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-4">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all duration-200 ${
                isActive 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon 
                className={`w-6 h-6 transition-transform duration-200 ${
                  isActive ? "scale-110" : ""
                }`} 
              />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNavigation;
