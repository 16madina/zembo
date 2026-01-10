import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { 
  Edit3, 
  LogOut, 
  Camera, 
  ShieldCheck, 
  ShieldOff,
  User,
  Calendar,
  Briefcase,
  GraduationCap,
  MapPin,
  Ruler,
  Plus
} from "lucide-react";
import BottomNavigation from "@/components/BottomNavigation";
import PhotoGallery from "@/components/profile/PhotoGallery";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

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

interface ProfileInfoRowProps {
  icon: React.ReactNode;
  label: string;
  value?: string | null;
  onAdd?: () => void;
}

const ProfileInfoRow = ({ icon, label, value, onAdd }: ProfileInfoRowProps) => (
  <div className="flex items-center justify-between py-4 border-b border-white/10 last:border-b-0">
    <div className="flex items-center gap-3">
      <span className="text-primary">{icon}</span>
      <span className="text-foreground">{label}</span>
    </div>
    {value ? (
      <span className="text-muted-foreground">{value}</span>
    ) : (
      <button 
        onClick={onAdd}
        className="flex items-center gap-1 text-primary font-medium"
      >
        Ajouter <Plus className="w-4 h-4" />
      </button>
    )}
  </div>
);

const Profile = () => {
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [photos, setPhotos] = useState<string[]>([]);

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

        // Fetch user's photos from storage
        const { data: photoFiles } = await supabase.storage
          .from('profile-photos')
          .list(user.id);

        if (photoFiles && photoFiles.length > 0) {
          const photoUrls = photoFiles.map(file => {
            const { data: { publicUrl } } = supabase.storage
              .from('profile-photos')
              .getPublicUrl(`${user.id}/${file.name}`);
            return publicUrl;
          });
          setPhotos(photoUrls);
        }
      } catch (err) {
        console.error("Error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
  };

  const handlePhotosChange = (newPhotos: string[]) => {
    setPhotos(newPhotos);
  };

  const handleAvatarChange = (url: string) => {
    setProfile(prev => prev ? { ...prev, avatar_url: url } : null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const displayName = profile?.display_name || user?.email?.split("@")[0] || "Utilisateur";
  const isVerified = profile?.is_verified || false;
  const avatarUrl = profile?.avatar_url || (photos.length > 0 ? photos[0] : "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&h=400&fit=crop");
  const gender = profile?.gender === "female" ? "Femme" : profile?.gender === "male" ? "Homme" : profile?.gender || null;
  const location = profile?.location;
  const age = profile?.age;
  
  // Calculate birth year from age
  const birthYear = age ? new Date().getFullYear() - age : null;
  const birthDateDisplay = birthYear ? `${birthYear}` : null;

  return (
    <div className="min-h-screen pb-28 flex flex-col">
      {/* Header with gradient background */}
      <div className="relative">
        {/* Gradient background */}
        <div 
          className="absolute inset-0 h-[320px]"
          style={{
            background: "linear-gradient(180deg, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.6) 50%, hsl(var(--background)) 100%)"
          }}
        />
        
        {/* Header buttons */}
        <motion.header 
          className="relative flex items-center justify-between px-6 py-4 z-10"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-xl font-bold text-primary-foreground">Mon Profil</h1>
          <div className="flex gap-3">
            <motion.button 
              className="p-3 bg-primary/20 backdrop-blur-sm rounded-full"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Edit3 className="w-5 h-5 text-primary-foreground" />
            </motion.button>
            <motion.button 
              className="p-3 bg-destructive/80 backdrop-blur-sm rounded-full"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleSignOut}
            >
              <LogOut className="w-5 h-5 text-destructive-foreground" />
            </motion.button>
          </div>
        </motion.header>

        {/* Avatar section */}
        <motion.div 
          className="relative flex flex-col items-center pt-4 pb-8 z-10"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          {/* Avatar with ring */}
          <div className="relative">
            <div className="w-40 h-40 rounded-full p-1 bg-gradient-to-b from-primary to-primary/50">
              <img
                src={avatarUrl}
                alt={displayName}
                className="w-full h-full rounded-full object-cover border-4 border-background"
              />
            </div>
            {/* Camera button */}
            <motion.button 
              className="absolute bottom-2 right-2 p-3 bg-primary rounded-full shadow-lg"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => document.getElementById('photo-gallery-section')?.scrollIntoView({ behavior: 'smooth' })}
            >
              <Camera className="w-5 h-5 text-primary-foreground" />
            </motion.button>
          </div>

          {/* Name */}
          <h2 className="mt-4 text-2xl font-bold text-primary-foreground">{displayName}</h2>

          {/* Verification badge */}
          <div className={`mt-2 flex items-center gap-2 px-4 py-2 rounded-full ${
            isVerified 
              ? "bg-success/20 text-success" 
              : "bg-muted/50 text-muted-foreground"
          }`}>
            {isVerified ? (
              <ShieldCheck className="w-4 h-4" />
            ) : (
              <ShieldOff className="w-4 h-4" />
            )}
            <span className="text-sm font-medium">
              {isVerified ? "Vérifié" : "Non vérifié"}
            </span>
          </div>
        </motion.div>
      </div>

      {/* Profile Info Card */}
      <motion.div 
        className="flex-1 mx-4 -mt-2 space-y-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="glass-strong rounded-3xl p-6">
          <ProfileInfoRow 
            icon={<User className="w-5 h-5" />}
            label="Genre"
            value={gender}
          />
          <ProfileInfoRow 
            icon={<Calendar className="w-5 h-5" />}
            label="Date de naissance"
            value={birthDateDisplay}
          />
          <ProfileInfoRow 
            icon={<Briefcase className="w-5 h-5" />}
            label="Profession"
          />
          <ProfileInfoRow 
            icon={<GraduationCap className="w-5 h-5" />}
            label="Études"
          />
          <ProfileInfoRow 
            icon={<MapPin className="w-5 h-5" />}
            label="Ville d'origine"
            value={location}
          />
          <ProfileInfoRow 
            icon={<Ruler className="w-5 h-5" />}
            label="Taille"
          />
        </div>

        {/* Photo Gallery */}
        <div id="photo-gallery-section" className="glass-strong rounded-3xl p-6">
          {user && (
            <PhotoGallery
              userId={user.id}
              photos={photos}
              onPhotosChange={handlePhotosChange}
              onAvatarChange={handleAvatarChange}
            />
          )}
        </div>

        {/* App version */}
        <p className="text-center text-muted-foreground text-sm mt-6">
          ZEMBO v1.0.0
        </p>
      </motion.div>

      <BottomNavigation />
    </div>
  );
};

export default Profile;
