import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, X, Users, MessageCircle, Sparkles, HelpCircle } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import CompatibilityGame from "./CompatibilityGame";
import compatibilityBg from "@/assets/compatibility-game-bg.jpg";

interface CompatibilityGameModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Match {
  id: string;
  partnerId: string;
  partnerName: string;
  partnerAvatar: string | null;
}

// Golden Sparkle Particles Component
const GoldenSparkles = () => {
  const sparkles = Array.from({ length: 15 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    size: 2 + Math.random() * 4,
    delay: Math.random() * 3,
    duration: 2 + Math.random() * 2,
  }));

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
      {sparkles.map((s) => (
        <motion.div
          key={s.id}
          className="absolute rounded-full bg-primary"
          style={{
            left: s.left,
            top: s.top,
            width: s.size,
            height: s.size,
            boxShadow: `0 0 ${s.size * 2}px rgba(214, 178, 107, 0.8)`,
          }}
          animate={{
            opacity: [0, 1, 0],
            scale: [0.5, 1.2, 0.5],
          }}
          transition={{
            duration: s.duration,
            repeat: Infinity,
            delay: s.delay,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
};

const CompatibilityGameModal = ({ isOpen, onClose }: CompatibilityGameModalProps) => {
  const { user } = useAuth();
  const [selectedPartner, setSelectedPartner] = useState<Match | null>(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [showPartnerSelection, setShowPartnerSelection] = useState(false);

  // Fetch user's matches
  const { data: matches, isLoading } = useQuery({
    queryKey: ["compatibility-matches", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data: matchesData, error } = await supabase
        .from("matches")
        .select("*")
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);

      if (error) {
        console.error("Error fetching matches:", error);
        return [];
      }

      // Get partner IDs
      const partnerIds = (matchesData || []).map(m => 
        m.user1_id === user.id ? m.user2_id : m.user1_id
      );

      if (partnerIds.length === 0) return [];

      // Fetch partner profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", partnerIds);

      const profileMap = new Map(
        (profiles || []).map(p => [p.user_id, p])
      );

      return (matchesData || []).map(m => {
        const partnerId = m.user1_id === user.id ? m.user2_id : m.user1_id;
        const profile = profileMap.get(partnerId);
        return {
          id: m.id,
          partnerId,
          partnerName: profile?.display_name || "Utilisateur",
          partnerAvatar: profile?.avatar_url,
        };
      }) as Match[];
    },
    enabled: isOpen && !!user,
  });

  const handleStartGame = () => {
    setShowPartnerSelection(true);
  };

  const handleSelectPartner = (match: Match) => {
    setSelectedPartner(match);
    setGameStarted(true);
  };

  const handleCloseGame = () => {
    setGameStarted(false);
    setSelectedPartner(null);
    setShowPartnerSelection(false);
    onClose();
  };

  const handleBackToIntro = () => {
    setShowPartnerSelection(false);
  };

  // If game started, show full-screen game
  if (gameStarted && selectedPartner) {
    return (
      <CompatibilityGame
        partnerId={selectedPartner.partnerId}
        partnerName={selectedPartner.partnerName}
        partnerAvatar={selectedPartner.partnerAvatar || undefined}
        onClose={handleCloseGame}
      />
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md p-0 gap-0 overflow-hidden max-h-[90vh]">
        <AnimatePresence mode="wait">
          {!showPartnerSelection ? (
            // Intro Screen with image and description
            <motion.div
              key="intro"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="relative flex flex-col h-[500px]"
            >
              {/* Background Image */}
              <div 
                className="absolute inset-0 bg-cover bg-center bg-no-repeat z-0"
                style={{ backgroundImage: `url(${compatibilityBg})` }}
              />
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-transparent to-background/90 z-[1]" />
              
              {/* Golden Sparkles */}
              <div className="absolute inset-0 z-[2] pointer-events-none">
                <GoldenSparkles />
              </div>

              {/* Close button */}
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={onClose}
                className="absolute top-3 right-3 z-20 bg-background/50 backdrop-blur-sm hover:bg-background/70"
              >
                <X className="w-5 h-5" />
              </Button>

              {/* Info badges */}
              <motion.div 
                className="relative z-10 pt-12 px-4 flex flex-col items-center gap-2"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-background/80 backdrop-blur-md border border-primary/30">
                  <HelpCircle className="w-4 h-4 text-primary" />
                  <span className="text-foreground font-semibold text-sm">5 questions</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-background/80 backdrop-blur-md border border-primary/30">
                  <Users className="w-4 h-4 text-primary" />
                  <span className="text-foreground font-semibold text-sm">Joue avec ton match</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-background/80 backdrop-blur-md border border-primary/30">
                  <Heart className="w-4 h-4 text-primary" />
                  <span className="text-foreground font-semibold text-sm">Découvre votre score</span>
                </div>
              </motion.div>

              {/* Spacer */}
              <div className="flex-1" />

              {/* Title and Start Button */}
              <motion.div 
                className="relative z-10 px-6 pb-6 flex flex-col items-center gap-4"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-foreground mb-1">Quiz Compatibilité</h2>
                  <p className="text-sm text-muted-foreground">
                    Réponds aux mêmes questions que ton match et découvre votre taux de compatibilité !
                  </p>
                </div>

                <motion.div
                  animate={{
                    boxShadow: [
                      "0 0 20px rgba(214,178,107,0.4)",
                      "0 0 40px rgba(214,178,107,0.7)",
                      "0 0 20px rgba(214,178,107,0.4)",
                    ],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="rounded-lg w-full"
                >
                  <Button 
                    onClick={handleStartGame} 
                    size="lg" 
                    className="w-full px-12 bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600 text-white text-base py-6"
                  >
                    <motion.div
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                    >
                      <Sparkles className="w-5 h-5 mr-2" />
                    </motion.div>
                    Commencer
                  </Button>
                </motion.div>
              </motion.div>
            </motion.div>
          ) : (
            // Partner Selection Screen
            <motion.div
              key="partner-selection"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex flex-col"
            >
              {/* Header */}
              <div className="p-4 border-b border-border/50 bg-gradient-to-r from-pink-500/10 to-orange-500/10">
                <div className="flex items-center gap-3">
                  <Button variant="ghost" size="icon" onClick={handleBackToIntro}>
                    <X className="w-5 h-5" />
                  </Button>
                  <div className="flex-1">
                    <h2 className="font-bold text-lg">Choisis ton partenaire</h2>
                    <p className="text-sm text-muted-foreground">
                      Sélectionne un match pour jouer
                    </p>
                  </div>
                </div>
              </div>

              {/* Partner list */}
              <div className="p-4">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                      className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full"
                    />
                  </div>
                ) : matches && matches.length > 0 ? (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    <AnimatePresence>
                      {matches.map((match, index) => (
                        <motion.button
                          key={match.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          onClick={() => handleSelectPartner(match)}
                          className="w-full flex items-center gap-3 p-3 rounded-xl border border-border/50 hover:border-pink-500/50 hover:bg-pink-500/5 transition-all text-left"
                        >
                          <Avatar className="w-12 h-12">
                            <AvatarImage src={match.partnerAvatar || undefined} />
                            <AvatarFallback className="bg-gradient-to-br from-pink-500 to-orange-500 text-white">
                              {match.partnerName?.charAt(0) || "?"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="font-medium">{match.partnerName}</p>
                            <p className="text-sm text-muted-foreground">Tap pour jouer</p>
                          </div>
                          <Heart className="w-5 h-5 text-pink-500/50" />
                        </motion.button>
                      ))}
                    </AnimatePresence>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/50 flex items-center justify-center">
                      <MessageCircle className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground mb-2">
                      Aucun match pour l'instant
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Fais des matchs pour jouer au quiz !
                    </p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-border/50 bg-muted/30">
                <Button variant="outline" onClick={handleBackToIntro} className="w-full">
                  Retour
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};

export default CompatibilityGameModal;
