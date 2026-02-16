import { useState, useEffect, useMemo, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { SlidersHorizontal, SearchX, Loader2, Heart, List } from "lucide-react";
import ShopButton from "@/components/shop/ShopButton";
import { useNavigate } from "react-router-dom";
import ZemboLogo from "@/components/ZemboLogo";
import BottomNavigation from "@/components/BottomNavigation";
import ProfileModal from "@/components/ProfileModal";
import MatchModal from "@/components/MatchModal";
import FilterSheet, { FilterValues } from "@/components/FilterSheet";
import FeedItem from "@/components/FeedItem";
import ZFlammeExplosion from "@/components/ZFlammeExplosion";
import FlameTrail from "@/components/FlameTrail";
import RosePetalsAnimation from "@/components/RosePetalsAnimation";
import RoseMessageModal from "@/components/RoseMessageModal";
import RoseReceivedModal from "@/components/RoseReceivedModal";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { useProfilesWithDistance } from "@/hooks/useProfilesWithDistance";
import { useGifts } from "@/hooks/useGifts";
import { useCoins } from "@/hooks/useCoins";
import { useRoseReceived } from "@/hooks/useRoseReceived";
import { useToast } from "@/hooks/use-toast";
import { useSubscription } from "@/hooks/useSubscription";
import { useDailyLikes } from "@/hooks/useDailyLikes";
import { useCoinPurchaseSuccess } from "@/hooks/useCoinPurchaseSuccess";
import { useSoundEffects } from "@/hooks/useSoundEffects";
import { GenderType } from "@/data/mockProfiles";

export interface Profile {
  id: string;
  name: string;
  age: number;
  gender: GenderType;
  location: string;
  distance: string;
  bio: string;
  photos: string[];
  isOnline: boolean;
  isVerified: boolean;
  interests: string[];
  lookingFor?: string[];
}

const Home = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const { gifts, sendGift } = useGifts();
  const { balance } = useCoins();
  const { isPremium } = useSubscription();
  const { canLike, incrementLikesUsed, decrementLikesUsed } = useDailyLikes();
  const { roseReceived, isModalOpen: isRoseReceivedModalOpen, closeModal: closeRoseReceivedModal } = useRoseReceived();
  const { playFlameSound } = useSoundEffects();
  useCoinPurchaseSuccess();
  
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pendingLikesCount, setPendingLikesCount] = useState(0);
  const [likedProfiles, setLikedProfiles] = useState<Set<string>>(new Set());
  const [receivedLikes, setReceivedLikes] = useState<Set<string>>(new Set());
  const [isMatchModalOpen, setIsMatchModalOpen] = useState(false);
  const [matchedProfile, setMatchedProfile] = useState<Profile | null>(null);
  const [showSuperLikeExplosion, setShowSuperLikeExplosion] = useState(false);
  const [showFlameTrail, setShowFlameTrail] = useState(false);
  const [showRosePetals, setShowRosePetals] = useState(false);
  const [isRoseModalOpen, setIsRoseModalOpen] = useState(false);
  const [roseTargetProfile, setRoseTargetProfile] = useState<Profile | null>(null);
  const [isSendingRose, setIsSendingRose] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState<FilterValues>({
    ageMin: 18,
    ageMax: 50,
    distance: 50,
    genders: ["all"],
  });

  const { profiles: profilesWithDistance, isLoading: isLoadingProfiles, isLoadingMore, hasMore, loadMore } = useProfilesWithDistance({
    pageSize: 10,
    maxDistance: filters.distance,
    ageMin: filters.ageMin,
    ageMax: filters.ageMax,
    genders: filters.genders,
  });

  const profiles: Profile[] = useMemo(() => 
    profilesWithDistance.map(p => ({
      id: p.id,
      name: p.name,
      age: p.age,
      gender: p.gender,
      location: p.location,
      distance: p.distance,
      bio: p.bio,
      photos: p.photos,
      isOnline: p.isOnline,
      isVerified: p.isVerified,
      interests: p.interests,
      lookingFor: p.lookingFor,
    }))
  , [profilesWithDistance]);

  useEffect(() => {
    const fetchLikes = async () => {
      if (!user) return;
      const { data: likesReceived } = await supabase.from("likes").select("liker_id").eq("liked_id", user.id);
      const { data: likesSent } = await supabase.from("likes").select("liked_id").eq("liker_id", user.id);
      
      const sentSet = new Set(likesSent?.map(l => l.liked_id) || []);
      setLikedProfiles(sentSet);
      
      if (likesReceived) {
        setReceivedLikes(new Set(likesReceived.map(l => l.liker_id)));
        setPendingLikesCount(likesReceived.filter(l => !sentSet.has(l.liker_id)).length);
      }
    };
    fetchLikes();
  }, [user]);

  const handleLike = async (profileId?: string) => {
    const targetId = profileId || selectedProfile?.id;
    if (!targetId || !user) return;
    if (!canLike) {
      toast({ title: t.limitReached, description: "Passez à Gold pour plus de likes !", variant: "destructive" });
      return;
    }
    incrementLikesUsed();
    try {
      const { error } = await supabase.from("likes").upsert({ liker_id: user.id, liked_id: targetId, is_super_like: false }, { onConflict: 'liker_id,liked_id' });
      if (error) throw error;
      setLikedProfiles(prev => new Set([...prev, targetId]));
      if (receivedLikes.has(targetId)) {
        const profile = profiles.find(p => p.id === targetId);
        if (profile) { setMatchedProfile(profile); setIsMatchModalOpen(true); }
      }
    } catch (err) {
      console.error(err);
      decrementLikesUsed();
    }
  };

  const handleSuperLike = async () => {
    if (!selectedProfile || !user) return;
    setShowSuperLikeExplosion(true);
    playFlameSound();
    handleLike(selectedProfile.id);
  };

  const handleOpenRoseModal = () => {
    if (!selectedProfile || !user) return;
    setRoseTargetProfile(selectedProfile);
    setIsModalOpen(false);
    setIsRoseModalOpen(true);
  };

  const handleSendRoseWithMessage = async (message: string) => {
    if (!roseTargetProfile || !user) return;
    setIsSendingRose(true);
    const roseGift = gifts.find(g => g.name === "Rose");
    if (!roseGift) { setIsSendingRose(false); return; }
    const result = await sendGift(roseGift, roseTargetProfile.id, message, { createLike: true, sendNotification: true });
    setIsSendingRose(false);
    setIsRoseModalOpen(false);
    if (result.success) { setShowRosePetals(true); setRoseTargetProfile(null); }
  };

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden pt-[env(safe-area-inset-top)] pb-[calc(88px+env(safe-area-inset-bottom))] bg-background">
      <motion.header className="flex items-center justify-between px-4 py-3 flex-shrink-0 border-b border-border/40" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3">
          <ZemboLogo size="sm" />
          <div className="h-6 w-px bg-border/60 mx-1" />
          <ShopButton variant="compact" className="scale-90" />
        </div>
        <div className="flex items-center gap-2">
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => navigate("/likes")} className="relative p-2 rounded-full hover:bg-muted/50 transition-colors">
            <Heart className="w-6 h-6 text-foreground" />
            {pendingLikesCount > 0 && <span className="absolute top-1 right-1 w-4 h-4 bg-primary text-[10px] font-bold text-primary-foreground rounded-full flex items-center justify-center">{pendingLikesCount}</span>}
          </motion.button>
          <Button variant="ghost" size="icon" onClick={() => setIsFilterOpen(true)} className="rounded-full h-10 w-10"><SlidersHorizontal className="w-6 h-6" /></Button>
        </div>
      </motion.header>

      <div className="flex-1 overflow-hidden relative">
        {isLoadingProfiles && profiles.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4"><Loader2 className="w-10 h-10 text-primary animate-spin" /><p className="text-sm text-muted-foreground">{t.loading}</p></div>
        ) : profiles.length > 0 ? (
          <ScrollArea className="h-full w-full">
            <div className="flex flex-col pt-2 pb-20">
              {profiles.map(p => (
                <FeedItem key={p.id} profile={p} onLike={() => handleLike(p.id)} onChat={() => navigate("/messages")} onProfileClick={p => { setSelectedProfile(p); setIsModalOpen(true); }} isLiked={likedProfiles.has(p.id)} isPremium={isPremium} />
              ))}
              {hasMore && <div className="py-10 flex justify-center"><Button variant="ghost" onClick={loadMore} disabled={isLoadingMore}>{isLoadingMore ? <Loader2 className="w-4 h-4 animate-spin" /> : "Voir plus"}</Button></div>}
            </div>
          </ScrollArea>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center"><SearchX className="w-16 h-16 text-muted-foreground mb-4" /><h2 className="text-xl font-bold mb-2">{t.noProfilesFound}</h2><Button onClick={() => setIsFilterOpen(true)} className="btn-gold px-8 py-6 rounded-2xl font-bold">{t.modify}</Button></div>
        )}
      </div>

      <ProfileModal profile={selectedProfile} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onLike={() => handleLike()} onSuperLike={handleSuperLike} onSendRose={handleOpenRoseModal} />
      <MatchModal profile={matchedProfile} isOpen={isMatchModalOpen} onClose={() => setIsMatchModalOpen(false)} onStartChat={() => navigate("/messages")} />
      <FilterSheet 
        isOpen={isFilterOpen} 
        onClose={() => setIsFilterOpen(false)} 
        onApply={v => { setFilters(v); setIsFilterOpen(false); }} 
        filters={filters} 
      />
      
      <RoseMessageModal 
        isOpen={isRoseModalOpen} 
        onClose={() => setIsRoseModalOpen(false)} 
        onSend={handleSendRoseWithMessage} 
        isLoading={isSendingRose} 
        recipientName={roseTargetProfile?.name || ""} 
      />
      
      <RoseReceivedModal 
        isOpen={isRoseReceivedModalOpen} 
        onClose={closeRoseReceivedModal} 
        onViewProfile={() => {
          if (roseReceived) {
            const profile = profiles.find(p => p.id === roseReceived.id);
            if (profile) {
              setSelectedProfile(profile);
              setIsModalOpen(true);
            }
          }
          closeRoseReceivedModal();
        }}
        senderName={roseReceived?.name || ""}
        senderPhoto={roseReceived?.photo || ""}
        message={roseReceived?.message || ""}
      />
      
      <AnimatePresence>
        {showSuperLikeExplosion && (
          <ZFlammeExplosion isVisible={showSuperLikeExplosion} onComplete={() => setShowSuperLikeExplosion(false)} />
        )}
      </AnimatePresence>
      
      <AnimatePresence>
        {showFlameTrail && (
          <FlameTrail isVisible={showFlameTrail} onComplete={() => setShowFlameTrail(false)} />
        )}
      </AnimatePresence>
      
      <AnimatePresence>
        {showRosePetals && (
          <RosePetalsAnimation isVisible={showRosePetals} onComplete={() => setShowRosePetals(false)} />
        )}
      </AnimatePresence>
      <BottomNavigation />
    </div>
  );
};

export default Home;
