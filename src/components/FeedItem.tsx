import { motion } from "framer-motion";
import { Heart, MessageCircle, Share2, MoreHorizontal, MapPin, User, Sparkles } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Profile } from "@/pages/Home";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface FeedItemProps {
  profile: Profile;
  onLike: (id: string) => void;
  onChat: (id: string) => void;
  onProfileClick: (profile: Profile) => void;
  isLiked: boolean;
  isPremium: boolean;
}

const FeedItem = ({ profile, onLike, onChat, onProfileClick, isLiked, isPremium }: FeedItemProps) => {
  const [liked, setLiked] = useState(isLiked);
  const [likeCount, setLikeCount] = useState(Math.floor(Math.random() * 50) + 5);

  const handleLike = () => {
    setLiked(!liked);
    setLikeCount(prev => liked ? prev - 1 : prev + 1);
    onLike(profile.id);
  };

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
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
          <MoreHorizontal className="w-5 h-5" />
        </Button>
      </div>

      {/* Post Image */}
      <div 
        className="relative aspect-[4/5] w-full overflow-hidden bg-muted cursor-pointer"
        onClick={() => onProfileClick(profile)}
      >
        <img 
          src={profile.photos[0]} 
          alt={profile.name}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        
        {/* Subtle overlay for name/age if scrolling over image */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent text-white opacity-0 hover:opacity-100 transition-opacity">
          <p className="text-xs italic line-clamp-2">{profile.bio || "Pas de bio pour le moment."}</p>
        </div>
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
        
        {/* Interests as Hashtags */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {profile.interests?.slice(0, 3).map(interest => (
            <span key={interest} className="text-[10px] text-primary font-medium">#{interest.replace(/\s+/g, '')}</span>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default FeedItem;
