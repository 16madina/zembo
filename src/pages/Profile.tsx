import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
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
  Plus,
  Heart,
  Pencil,
  FileText,
  Loader2,
  Mail,
  Send,
  Clock,
  Shield,
} from "lucide-react";
import BottomNavigation from "@/components/BottomNavigation";
import PhotoGallery from "@/components/profile/PhotoGallery";
import EditProfileModal from "@/components/profile/EditProfileModal";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type EditFieldType = "occupation" | "education" | "height" | "gender" | "age" | "display_name" | "bio" | "interests";

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
  occupation: string | null;
  education: string | null;
  height: string | null;
  email: string | null;
  email_verified: boolean | null;
  verification_email_count: number | null;
  verification_email_count_reset_at: string | null;
}

interface ProfileInfoRowProps {
  icon: React.ReactNode;
  label: string;
  value?: string | null;
  onAdd?: () => void;
  onEdit?: () => void;
}

const interestColors = [
  "bg-pink-500/20 text-pink-400 border-pink-500/30",
  "bg-purple-500/20 text-purple-400 border-purple-500/30",
  "bg-blue-500/20 text-blue-400 border-blue-500/30",
  "bg-green-500/20 text-green-400 border-green-500/30",
  "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  "bg-orange-500/20 text-orange-400 border-orange-500/30",
  "bg-red-500/20 text-red-400 border-red-500/30",
  "bg-teal-500/20 text-teal-400 border-teal-500/30",
  "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
  "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
];

const ProfileInfoRow = ({ icon, label, value, onAdd, onEdit }: ProfileInfoRowProps) => (
  <div className="flex items-center justify-between py-4 border-b border-white/10 last:border-b-0">
    <div className="flex items-center gap-3">
      <span className="text-primary">{icon}</span>
      <span className="text-foreground">{label}</span>
    </div>
    {value ? (
      <button onClick={onEdit} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
        <span>{value}</span>
        {onEdit && <Pencil className="w-3.5 h-3.5" />}
      </button>
    ) : (
      <button onClick={onAdd} className="flex items-center gap-1 text-primary font-medium">
        Ajouter <Plus className="w-4 h-4" />
      </button>
    )}
  </div>
);

const MAX_EMAILS_PER_DAY = 3;

const Profile = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { isAdmin } = useUserRole();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [photos, setPhotos] = useState<string[]>([]);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editField, setEditField] = useState<EditFieldType>("occupation");
  const [isSendingVerification, setIsSendingVerification] = useState(false);
  const [countdown, setCountdown] = useState<string | null>(null);

  // Calculate countdown timer for email limit reset
  const calculateCountdown = useCallback(() => {
    if (!profile?.verification_email_count_reset_at) return null;
    
    const resetAt = new Date(profile.verification_email_count_reset_at);
    const now = new Date();
    const resetTime = new Date(resetAt.getTime() + 24 * 60 * 60 * 1000); // 24 hours after reset_at
    
    const diff = resetTime.getTime() - now.getTime();
    
    if (diff <= 0) return null;
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, [profile?.verification_email_count_reset_at]);

  // Update countdown every second when limit is reached
  useEffect(() => {
    const emailCount = profile?.verification_email_count || 0;
    if (emailCount >= MAX_EMAILS_PER_DAY && !profile?.email_verified) {
      const interval = setInterval(() => {
        const newCountdown = calculateCountdown();
        setCountdown(newCountdown);
        
        // Reset count when countdown reaches zero
        if (!newCountdown) {
          setProfile(prev => prev ? { 
            ...prev, 
            verification_email_count: 0,
            verification_email_count_reset_at: null 
          } : null);
        }
      }, 1000);
      
      return () => clearInterval(interval);
    } else {
      setCountdown(null);
    }
  }, [profile?.verification_email_count, profile?.email_verified, calculateCountdown]);

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
        const { data: photoFiles } = await supabase.storage.from("profile-photos").list(user.id);

        if (photoFiles && photoFiles.length > 0) {
          const photoUrls = photoFiles.map((file) => {
            const {
              data: { publicUrl },
            } = supabase.storage.from("profile-photos").getPublicUrl(`${user.id}/${file.name}`);
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
    setProfile((prev) => (prev ? { ...prev, avatar_url: url } : null));
  };

  const openEditModal = (field: EditFieldType) => {
    setEditField(field);
    setEditModalOpen(true);
  };

  const handleProfileFieldUpdate = async (field: string, value: string | number | string[]) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ [field]: value })
        .eq("user_id", user.id);

      if (error) throw error;
      
      setProfile((prev) => prev ? { ...prev, [field]: value } as UserProfile : null);
    } catch (error) {
      console.error("Error updating profile:", error);
    }
  };

  const handleSendVerificationEmail = async () => {
    if (!user || !user.email) {
      toast.error("Email non disponible");
      return;
    }

    setIsSendingVerification(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-verification-email", {
        body: {
          email: user.email,
          displayName: profile?.display_name || user.email.split("@")[0],
        },
      });

      if (error) throw error;

      if (data.rateLimited) {
        toast.error(data.error, {
          description: "Vous avez atteint la limite journalière.",
          duration: 5000,
        });
        return;
      }

      if (data.success) {
        const remaining = data.remainingEmails;
        toast.success("Email de vérification envoyé ! ✉️", {
          description: remaining > 0 
            ? `Il vous reste ${remaining} envoi${remaining > 1 ? 's' : ''} aujourd'hui.`
            : "C'était votre dernier envoi de la journée.",
          duration: 5000,
        });
        // Update local state to show email was saved
        setProfile((prev) => prev ? { ...prev, email: user.email } : null);
      } else {
        throw new Error(data.error || "Erreur lors de l'envoi");
      }
    } catch (error: any) {
      console.error("Error sending verification email:", error);
      toast.error(error.message || "Erreur lors de l'envoi de l'email");
    } finally {
      setIsSendingVerification(false);
    }
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
  const avatarUrl =
    profile?.avatar_url ||
    (photos.length > 0
      ? photos[0]
      : "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&h=400&fit=crop");
  const gender =
    profile?.gender === "female" ? "Femme" : profile?.gender === "male" ? "Homme" : profile?.gender === "lgbt" ? "LGBT+" : profile?.gender || null;
  const location = profile?.location;
  const age = profile?.age;
  const interests = profile?.interests || [];
  const bio = profile?.bio;

  // Calculate birth year from age
  const birthYear = age ? new Date().getFullYear() - age : null;
  const birthDateDisplay = birthYear ? `${birthYear} (${age} ans)` : null;

  return (
    <div className="min-h-screen pb-28 flex flex-col">
      {/* Header with gradient background */}
      <div className="relative">
        {/* Gradient background */}
        <div
          className="absolute inset-0 h-[320px]"
          style={{
            background:
              "linear-gradient(180deg, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.6) 50%, hsl(var(--background)) 100%)",
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
            {isAdmin && (
              <motion.button
                className="p-3 bg-amber-500/80 backdrop-blur-sm rounded-full"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate("/admin")}
              >
                <Shield className="w-5 h-5 text-white" />
              </motion.button>
            )}
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
              onClick={() =>
                document.getElementById("photo-gallery-section")?.scrollIntoView({ behavior: "smooth" })
              }
            >
              <Camera className="w-5 h-5 text-primary-foreground" />
            </motion.button>
          </div>

          {/* Name - Editable */}
          <button 
            onClick={() => openEditModal("display_name")}
            className="mt-4 flex items-center gap-2 group"
          >
            <h2 className="text-2xl font-bold text-primary-foreground">{displayName}</h2>
            <Pencil className="w-4 h-4 text-primary-foreground/60 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>

          {/* Verification badges and actions */}
          <div className="mt-3 flex flex-col items-center gap-2">
            {/* Profile verification status */}
            {isVerified ? (
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-success/20 text-success">
                <ShieldCheck className="w-4 h-4" />
                <span className="text-sm font-medium">Profil vérifié</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50 text-muted-foreground">
                <ShieldOff className="w-4 h-4" />
                <span className="text-sm font-medium">Profil non vérifié</span>
              </div>
            )}

            {/* Email verification status */}
            {profile?.email_verified ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/20 text-blue-400">
                <Mail className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">Email vérifié : {profile?.email}</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                {profile?.email ? (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-500/20 text-orange-400">
                    <Mail className="w-3.5 h-3.5" />
                    <span className="text-xs font-medium">Email en attente : {profile?.email}</span>
                  </div>
                ) : null}
                
                {/* Countdown timer when limit reached */}
                {countdown ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/20 text-red-400">
                      <Clock className="w-3.5 h-3.5" />
                      <span className="text-xs font-medium">Limite atteinte (3/3)</span>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-muted/30 border border-muted">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-mono text-muted-foreground">
                        Réessayez dans <span className="text-foreground font-semibold">{countdown}</span>
                      </span>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Show remaining emails count */}
                    {(profile?.verification_email_count || 0) > 0 && (
                      <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-muted/30 text-muted-foreground">
                        <span className="text-xs">
                          {MAX_EMAILS_PER_DAY - (profile?.verification_email_count || 0)} envoi{MAX_EMAILS_PER_DAY - (profile?.verification_email_count || 0) > 1 ? 's' : ''} restant{MAX_EMAILS_PER_DAY - (profile?.verification_email_count || 0) > 1 ? 's' : ''}
                        </span>
                      </div>
                    )}
                    <Button
                      onClick={handleSendVerificationEmail}
                      disabled={isSendingVerification}
                      size="sm"
                      className="bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white"
                    >
                      {isSendingVerification ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Envoi...
                        </>
                      ) : profile?.email ? (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          Renvoyer l'email
                        </>
                      ) : (
                        <>
                          <Mail className="w-4 h-4 mr-2" />
                          Vérifier mon email
                        </>
                      )}
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Profile Content */}
      <motion.div
        className="flex-1 mx-4 -mt-2 space-y-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {/* Photo Gallery - Now at the top */}
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

        {/* Bio Card */}
        <div className="glass-strong rounded-3xl p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <span className="text-primary"><FileText className="w-5 h-5" /></span>
              <span className="text-foreground font-medium">À propos de moi</span>
            </div>
            <button 
              onClick={() => openEditModal("bio")}
              className="text-primary hover:text-primary/80 transition-colors"
            >
              <Pencil className="w-4 h-4" />
            </button>
          </div>
          {bio ? (
            <p className="text-muted-foreground text-sm leading-relaxed">{bio}</p>
          ) : (
            <button 
              onClick={() => openEditModal("bio")}
              className="text-primary text-sm flex items-center gap-1"
            >
              Ajouter une bio <Plus className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Profile Info Card */}
        <div className="glass-strong rounded-3xl p-6">
          <ProfileInfoRow 
            icon={<User className="w-5 h-5" />} 
            label="Genre" 
            value={gender} 
            onAdd={() => openEditModal("gender")}
            onEdit={() => openEditModal("gender")}
          />
          <ProfileInfoRow
            icon={<Calendar className="w-5 h-5" />}
            label="Date de naissance"
            value={birthDateDisplay}
            onAdd={() => openEditModal("age")}
            onEdit={() => openEditModal("age")}
          />
          <ProfileInfoRow
            icon={<Briefcase className="w-5 h-5" />}
            label="Profession"
            value={profile?.occupation}
            onAdd={() => openEditModal("occupation")}
            onEdit={() => openEditModal("occupation")}
          />
          <ProfileInfoRow
            icon={<GraduationCap className="w-5 h-5" />}
            label="Études"
            value={profile?.education}
            onAdd={() => openEditModal("education")}
            onEdit={() => openEditModal("education")}
          />
          <ProfileInfoRow icon={<MapPin className="w-5 h-5" />} label="Ville d'origine" value={location} />
          <ProfileInfoRow
            icon={<Ruler className="w-5 h-5" />}
            label="Taille"
            value={profile?.height}
            onAdd={() => openEditModal("height")}
            onEdit={() => openEditModal("height")}
          />
        </div>

        {/* Interests Card */}
        <div className="glass-strong rounded-3xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-primary"><Heart className="w-5 h-5" /></span>
              <span className="text-foreground font-medium">Centres d'intérêt</span>
            </div>
            <button 
              onClick={() => openEditModal("interests")}
              className="text-primary hover:text-primary/80 transition-colors"
            >
              <Pencil className="w-4 h-4" />
            </button>
          </div>
          {interests.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {interests.map((interest, index) => (
                <motion.span
                  key={interest}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border ${interestColors[index % interestColors.length]}`}
                >
                  {interest}
                </motion.span>
              ))}
            </div>
          ) : (
            <button 
              onClick={() => openEditModal("interests")}
              className="text-primary text-sm flex items-center gap-1"
            >
              Ajouter des centres d'intérêt <Plus className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* App version */}
        <p className="text-center text-muted-foreground text-sm mt-6">ZEMBO v1.0.0</p>
      </motion.div>

      {/* Edit Modal */}
      {user && (
        <EditProfileModal
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          userId={user.id}
          field={editField}
          currentValue={
            editField === "age" ? profile?.age : 
            editField === "interests" ? profile?.interests : 
            editField === "display_name" ? profile?.display_name :
            editField === "bio" ? profile?.bio :
            editField === "occupation" ? profile?.occupation :
            editField === "education" ? profile?.education :
            editField === "height" ? profile?.height :
            editField === "gender" ? profile?.gender :
            null
          }
          onUpdate={handleProfileFieldUpdate}
        />
      )}

      <BottomNavigation />
    </div>
  );
};

export default Profile;
