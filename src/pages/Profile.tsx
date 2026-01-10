import { motion } from "framer-motion";
import { Settings, Edit3, BadgeCheck, MapPin, Heart, Star, Image, Camera } from "lucide-react";
import ZemboLogo from "@/components/ZemboLogo";
import BottomNavigation from "@/components/BottomNavigation";

const Profile = () => {
  const user = {
    name: "Alex",
    age: 25,
    location: "Paris, France",
    bio: "Passionné de voyages et de nouvelles rencontres. Fan de musique live et de bons restaurants.",
    photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop",
    isVerified: true,
    stats: {
      likes: 156,
      superLikes: 23,
      photos: 6
    },
    interests: ["Voyage", "Musique", "Cuisine", "Sport", "Photo"]
  };

  const statItems = [
    { icon: Heart, value: user.stats.likes, label: "Likes reçus", color: "text-primary" },
    { icon: Star, value: user.stats.superLikes, label: "Super Likes", color: "text-accent" },
    { icon: Image, value: user.stats.photos, label: "Photos", color: "text-success" },
  ];

  return (
    <div className="min-h-screen pb-28">
      <motion.header 
        className="flex items-center justify-between px-6 py-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="w-10" />
        <ZemboLogo />
        <motion.button 
          className="p-2.5 glass rounded-xl tap-highlight"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Settings className="w-5 h-5 text-muted-foreground" />
        </motion.button>
      </motion.header>

      {/* Profile Card */}
      <motion.div 
        className="px-6 mb-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="relative glass-strong rounded-3xl overflow-hidden">
          {/* Photo */}
          <div className="relative aspect-square max-h-[280px]">
            <img
              src={user.photo}
              alt={user.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-0 left-0 right-0 h-28 overlay-gradient" />
            
            {/* Camera Button */}
            <motion.button 
              className="absolute top-4 right-4 p-3 glass rounded-full tap-highlight"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <Camera className="w-5 h-5 text-foreground" />
            </motion.button>
            
            {/* Edit Button */}
            <motion.button 
              className="absolute bottom-4 right-4 p-3 btn-gold rounded-full"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <Edit3 className="w-5 h-5 text-primary-foreground" />
            </motion.button>
          </div>

          {/* Info */}
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground">
                {user.name}, {user.age}
              </h1>
              {user.isVerified && (
                <BadgeCheck className="w-6 h-6 text-primary" />
              )}
            </div>

            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="w-4 h-4" />
              <span>{user.location}</span>
            </div>

            <p className="text-foreground/80 leading-relaxed">{user.bio}</p>

            {/* Interests */}
            <div className="flex flex-wrap gap-2">
              {user.interests.map((interest, index) => (
                <motion.span
                  key={interest}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 + index * 0.05 }}
                  className="px-4 py-2 glass rounded-full text-sm font-medium text-secondary-foreground"
                >
                  {interest}
                </motion.span>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div 
        className="px-6 grid grid-cols-3 gap-3"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {statItems.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + index * 0.1 }}
            className="glass rounded-2xl p-4 text-center"
          >
            <div className="flex items-center justify-center mb-2">
              <stat.icon className={`w-5 h-5 ${stat.color}`} fill="currentColor" />
            </div>
            <p className="text-2xl font-bold text-foreground">{stat.value}</p>
            <p className="text-[11px] text-muted-foreground">{stat.label}</p>
          </motion.div>
        ))}
      </motion.div>

      <BottomNavigation />
    </div>
  );
};

export default Profile;
