import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, X, Users, Search, MessageCircle } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import CompatibilityGame from "./CompatibilityGame";

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

const CompatibilityGameModal = ({ isOpen, onClose }: CompatibilityGameModalProps) => {
  const { user } = useAuth();
  const [selectedPartner, setSelectedPartner] = useState<Match | null>(null);
  const [gameStarted, setGameStarted] = useState(false);

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

  const handleSelectPartner = (match: Match) => {
    setSelectedPartner(match);
    setGameStarted(true);
  };

  const handleCloseGame = () => {
    setGameStarted(false);
    setSelectedPartner(null);
    onClose();
  };

  const handleBackToSelection = () => {
    setGameStarted(false);
    setSelectedPartner(null);
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
      <DialogContent className="max-w-md p-0 gap-0 overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-border/50 bg-gradient-to-r from-pink-500/10 to-orange-500/10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 to-orange-500 flex items-center justify-center">
              <Heart className="w-6 h-6 text-white" fill="white" />
            </div>
            <div>
              <h2 className="font-bold text-lg">Quiz Compatibilité</h2>
              <p className="text-sm text-muted-foreground">
                5 questions pour découvrir votre score
              </p>
            </div>
          </div>
        </div>

        {/* Partner selection */}
        <div className="p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Choisis ton partenaire de jeu
          </h3>

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
          <Button variant="outline" onClick={onClose} className="w-full">
            Fermer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CompatibilityGameModal;
