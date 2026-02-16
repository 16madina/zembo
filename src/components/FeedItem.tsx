import { motion, AnimatePresence } from "framer-motion";
import { Heart, MessageCircle, Share2, MoreHorizontal, MapPin, User, Sparkles, ChevronLeft, ChevronRight, Target } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Profile } from "@/pages/Home";
import { useState, useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface FeedItemProps {
  profile: Profile;
  onLike: (id: string) => void;
  onChat: (id: string) => void;
  onProfileClick: (profile: Profile) => void;
  isLiked: boolean;
  isPremium: boolean;
}

const lookingForLabels: Record<string, { label: string; emoji: string; color: string }> = {
  "relation_serieuse": { label: "Relation sérieuse", emoji: "💍", color: "bg-pink-500/90" },
  "amitie": { label: "Amitié", emoji: "🤝", color: "bg-blue-500/90" },
  "soiree": { label: "Soirée", emoji: "🎉", color: "bg-purple-500/90" },
  "discussion": { label: "Discussion", emoji: "💬", color: "bg-emerald-500/90" },
  "casual": { label: "Pas prise de tête", emoji: "😎", color: "bg-amber-500/90" },
  "relation": { label: "Relation", emoji: "❤️", color: "bg-pink-500/90" },
  "networking": { label: "Networking", emoji: "🔗", color: "bg-cyan-500/90" },
};

const getLookingForInfo = (value: string) => {
  const lower = value.toLowerCase().replace(/\s+/g, '_');
  return lookingForLabels[lower] || { label: value, emoji: "✨", color: "bg-muted" };
};

const FeedItem = ({ profile, onLike, onChat, onProfileClick, isLiked, isPremium }: FeedItemProps) => {
  const [liked, setLiked] = useState(isLiked);
  const [likeCount, setLikeCount] = useState(Math.floor(Math.random() * 50) + 5);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const { user } = useAuth();
  const [myInterests, setMyInterests] = useState<string[]>([]);

  // Fetch current user interests once
  useMemo(() => {
    if (!user) return;
    supabase.from("profiles").select("interests").eq("user_id", user.id).single().then(({ data }) => {
      if (data?.interests) setMyInterests(data.interests);
    });
  }, [user]);

  const compatibilityScore = useMemo(() => {
    if (!myInterests.length || !profile.interests?.length) return 0;
    const common = profile.interests.filter(i => myInterests.includes(i));
    return Math.round((common.length / Math.max(myInterests.length, profile.interests.length)) * 100);
  }, [myInterests, profile.interests]);

  const commonInterests = useMemo(() => {
    if (!myInterests.length) return [];
    return profile.interests?.filter(i => myInterests.includes(i)) || [];
  }, [myInterests, profile.interests]);

  const handleLike = () => {
    setLiked(!liked);
    setLikeCount(prev => liked ? prev - 1 : prev + 1);
    onLike(profile.id);
  };

  const hasMultiplePhotos = profile.photos.length > 1;

  const goToPhoto = useCallback((idx: number) => {
    setDirection(idx > currentPhotoIndex ? 1 : -1);
    setCurrentPhotoIndex(idx);
  }, [currentPhotoIndex]);

  const handlePhotoTap = useCallback((e: React.MouseEvent) => {
    if (!hasMultiplePhotos) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x < rect.width * 0.3) {
      goToPhoto(Math.max(0, currentPhotoIndex - 1));
    } else if (x > rect.width * 0.7) {
      goToPhoto(Math.min(profile.photos.length - 1, currentPhotoIndex + 1));
    } else {
      onProfileClick(profile);
    }
  }, [hasMultiplePhotos, currentPhotoIndex, profile, goToPhoto, onProfileClick]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      className="w-full max-w-lg mx-auto mb-6 bg-background border-b border-border/50 pb-4 last:border-0"
    >
      {/* Post Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div 
          className="flex items-center gap-3 cursor-pointer" 
          onClick={() => onProfileClick(profile)}
        >
          <div className="relative">
            <Avatar className="w-10 h-10 border border-primary/20 p-0.5">
              <AvatarImage src={profile.photos[0]} className="rounded-full object-cover" />
              <AvatarFallback className="bg-muted text-muted-foreground"><User /></AvatarFallback>
            </Avatar>
            {profile.isOnline && (
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
            )}
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm text-foreground">{profile.name}, {profile.age}</span>
              {profile.isVerified && (
                <Badge variant="secondary" className="h-4 px-1 bg-primary/10 text-primary text-[8px] border-0">
                  VÉRIFIÉ
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <MapPin className="w-2.5 h-2.5" />
              <span>{profile.location} • {profile.distance}</span>
            </div>
          </div>
        </div>

        {/* Compatibility Score */}
        {compatibilityScore > 0 && (
          <div className={cn(
            "flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold",
            compatibilityScore >= 60 ? "bg-green-500/15 text-green-500" :
            compatibilityScore >= 30 ? "bg-amber-500/15 text-amber-500" :
            "bg-muted text-muted-foreground"
          )}>
            <Target className="w-3 h-3" />
            {compatibilityScore}%
          </div>
        )}
      </div>

      {/* Photo Carousel */}
      <div 
        className="relative aspect-[4/5] w-full overflow-hidden bg-muted cursor-pointer"
        onClick={handlePhotoTap}
      >
        {/* Photo Indicators */}
        {hasMultiplePhotos && (
          <div className="absolute top-2 left-0 right-0 z-10 flex justify-center gap-1 px-4">
            {profile.photos.map((_, idx) => (
              <div
                key={idx}
                className={cn(
                  "h-[3px] rounded-full flex-1 max-w-16 transition-all duration-300",
                  idx === currentPhotoIndex ? "bg-white" : "bg-white/40"
                )}
              />
            ))}
          </div>
        )}

        <AnimatePresence mode="popLayout" initial={false} custom={direction}>
          <motion.img
            key={currentPhotoIndex}
            src={profile.photos[currentPhotoIndex]}
            alt={profile.name}
            className="w-full h-full object-cover absolute inset-0"
            loading="lazy"
            custom={direction}
            initial={{ x: direction > 0 ? "100%" : "-100%", opacity: 0.5 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: direction > 0 ? "-100%" : "100%", opacity: 0.5 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
          />
        </AnimatePresence>

        {/* Looking For Badges */}
        {profile.lookingFor && profile.lookingFor.length > 0 && (
          <div className="absolute bottom-3 left-3 z-10 flex flex-wrap gap-1.5">
            {profile.lookingFor.slice(0, 2).map((item) => {
              const info = getLookingForInfo(item);
              return (
                <span
                  key={item}
                  className={cn(
                    "px-2.5 py-1 rounded-full text-white text-[10px] font-semibold backdrop-blur-md shadow-lg",
                    info.color
                  )}
                >
                  {info.emoji} {info.label}
                </span>
              );
            })}
          </div>
        )}

        {/* Photo counter */}
        {hasMultiplePhotos && (
          <div className="absolute top-3 right-3 z-10 bg-black/50 backdrop-blur-sm text-white text-[10px] px-2 py-0.5 rounded-full font-medium">
            {currentPhotoIndex + 1}/{profile.photos.length}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between px-2 pt-2">
        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleLike}
            className={cn("h-10 w-10 hover:bg-transparent", liked && "text-red-500")}
          >
            <Heart className={cn("w-6 h-6", liked && "fill-current")} />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => onChat(profile.id)}
            className="h-10 w-10 hover:bg-transparent"
          >
            <MessageCircle className="w-6 h-6 text-foreground" />
          </Button>
          <Button variant="ghost" size="icon" className="h-10 w-10 hover:bg-transparent text-foreground">
            <Share2 className="w-6 h-6" />
          </Button>
        </div>
        
        {isPremium && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-primary gap-1.5 hover:bg-primary/5 h-9"
          >
            <Sparkles className="w-4 h-4 fill-current" />
            <span className="text-xs font-bold uppercase tracking-tighter">Z Flamme</span>
          </Button>
        )}
      </div>

      {/* Like Count & Bio */}
      <div className="px-4 py-1 space-y-1">
        <p className="text-xs font-bold text-foreground">{likeCount} likes</p>
        <div className="text-xs leading-relaxed">
          <span className="font-bold mr-2 text-foreground">{profile.name}</span>
          <span className="text-muted-foreground">{profile.bio || "Hello ! Je viens de rejoindre Zembo."}</span>
        </div>
        
        {/* Interests — highlight common ones */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {profile.interests?.slice(0, 5).map(interest => {
            const isCommon = commonInterests.includes(interest);
            return (
              <span
                key={interest}
                className={cn(
                  "text-[10px] font-medium",
                  isCommon ? "text-primary font-bold" : "text-muted-foreground"
                )}
              >
                #{interest.replace(/\s+/g, '')}
                {isCommon && " ✨"}
              </span>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
};

export default FeedItem;
