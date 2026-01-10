import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Settings, Edit3, BadgeCheck, MapPin, Heart, Star, Image, Camera, Loader2 } from "lucide-react";
import ZemboLogo from "@/components/ZemboLogo";
import BottomNavigation from "@/components/BottomNavigation";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface UserProfile {
  id: string;
  display_name: string | null;
  age: number | null;
  location: string | null;
  bio: string | null;
  avatar_url: string | null;
  is_verified: boolean | null;
  interests: string[] | null;
  gender: string | null;
  looking_for: string[] | null;
}

const Profile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) {
          console.error("Error fetching profile:", error);
        } else {
          setProfile(data);
        }
      } catch (err) {
        console.error("Error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  const statItems = [
    { icon: Heart, value: 0, label: "Likes reçus", color: "text-primary" },
    { icon: Star, value: 0, label: "Super Likes", color: "text-accent" },
    { icon: Image, value: profile?.avatar_url ? 1 : 0, label: "Photos", color: "text-success" },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const displayName = profile?.display_name || user?.email?.split("@")[0] || "Utilisateur";
  const age = profile?.age;
  const location = profile?.location || "Non renseigné";
  const bio = profile?.bio || "Aucune bio pour le moment.";
  const isVerified = profile?.is_verified || false;
  const interests = profile?.interests || [];
  const avatarUrl = profile?.avatar_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&h=400&fit=crop";

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
              src={avatarUrl}
              alt={displayName}
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
                {displayName}{age ? `, ${age}` : ""}
              </h1>
              {isVerified && (
                <BadgeCheck className="w-6 h-6 text-primary" />
              )}
            </div>

            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="w-4 h-4" />
              <span>{location}</span>
            </div>

            <p className="text-foreground/80 leading-relaxed">{bio}</p>

            {/* Interests */}
            {interests.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {interests.map((interest, index) => (
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
            )}

            {interests.length === 0 && (
              <p className="text-sm text-muted-foreground italic">
                Aucun centre d'intérêt ajouté
              </p>
            )}
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
