import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Phone, User, Users, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

interface LobbyUser {
  user_id: string;
  display_name: string;
  avatar_url: string;
  interests: string[];
  gender: string;
}

interface LobbyScreenProps {
  preference: string;
  onCancel: () => void;
  onSelectUser: (userId: string) => void;
  isInitiating: boolean;
}

const LobbyScreen = ({ preference, onCancel, onSelectUser, isInitiating }: LobbyScreenProps) => {
  const { language, t } = useLanguage();
  const [candidates, setCandidates] = useState<LobbyUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCandidates = async () => {
      setIsLoading(true);
      try {
        // Fetch users in the queue who are "waiting"
        // and match the preference
        let query = supabase
          .from("random_call_queue")
          .select(`
            user_id,
            profiles:user_id (
              display_name,
              avatar_url,
              interests,
              gender
            )
          `)
          .eq("status", "waiting")
          .limit(20);

        if (preference !== "tous") {
          query = query.eq("gender", preference);
        }

        const { data, error } = await query;

        if (error) throw error;

        const formatted = (data || [])
          .map((item: any) => ({
            user_id: item.user_id,
            display_name: item.profiles?.display_name || "Utilisateur",
            avatar_url: item.profiles?.avatar_url,
            interests: item.profiles?.interests || [],
            gender: item.profiles?.gender,
          }))
          // Filter out self just in case (though status should handle it if not yet waiting)
          .filter(u => u.user_id !== (supabase.auth.getUser() as any).data?.user?.id);

        setCandidates(formatted);
      } catch (err) {
        console.error("Error fetching lobby candidates:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCandidates();
    
    // Refresh lobby every 10s
    const interval = setInterval(fetchCandidates, 10000);
    return () => clearInterval(interval);
  }, [preference]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex flex-col items-center w-full max-w-md gap-6"
    >
      <div className="text-center space-y-2">
        <h2 className="text-xl font-bold flex items-center justify-center gap-2">
          <Users className="w-6 h-6 text-primary" />
          {language === "fr" ? "Lobby Z Connect" : "Z Connect Lobby"}
        </h2>
        <p className="text-sm text-muted-foreground">
          {language === "fr" ? "Choisissez une personne avec qui discuter" : "Choose someone to talk to"}
        </p>
      </div>

      <div className="w-full bg-muted/30 rounded-3xl p-4 min-h-[300px] flex flex-col gap-3 overflow-y-auto max-h-[50vh]">
        {isLoading && candidates.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm italic">Recherche de profils disponibles...</p>
          </div>
        ) : candidates.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-6">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <Search className="w-8 h-8 text-muted-foreground/50" />
            </div>
            <p className="text-sm text-muted-foreground">
              {language === "fr" ? "Personne n'est disponible pour le moment." : "No one is available right now."}
            </p>
          </div>
        ) : (
          candidates.map((candidate) => (
            <motion.div
              key={candidate.user_id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-card border border-border/50 rounded-2xl p-3 flex items-center gap-4 shadow-sm"
            >
              <Avatar className="w-14 h-14 border-2 border-primary/20">
                <AvatarImage src={candidate.avatar_url} />
                <AvatarFallback><User /></AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0 text-left">
                <h3 className="font-semibold text-sm truncate">{candidate.display_name}</h3>
                <div className="flex flex-wrap gap-1 mt-1">
                  {candidate.interests.slice(0, 2).map((interest) => (
                    <Badge key={interest} variant="secondary" className="text-[10px] px-1.5 py-0">
                      {interest}
                    </Badge>
                  ))}
                  {candidate.interests.length > 2 && (
                    <span className="text-[10px] text-muted-foreground">+{candidate.interests.length - 2}</span>
                  )}
                </div>
              </div>

              <Button
                size="sm"
                className="rounded-xl gap-2 btn-gold h-9 px-4 shrink-0"
                onClick={() => onSelectUser(candidate.user_id)}
                disabled={isInitiating}
              >
                {isInitiating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Phone className="w-3.5 h-3.5" />
                    <span className="text-xs font-bold uppercase tracking-wider">Appeler</span>
                  </>
                )}
              </Button>
            </motion.div>
          ))
        )}
      </div>

      <div className="flex flex-col gap-3 w-full">
        <p className="text-[10px] text-center text-muted-foreground italic px-6">
          {language === "fr" ? "Les profils affichés ici sont des utilisateurs connectés qui souhaitent discuter. Aucun appel n'est lancé sans votre action." : "Profiles shown here are connected users who want to chat. No call is started without your action."}
        </p>
        <Button
          variant="ghost"
          onClick={onCancel}
          className="rounded-xl gap-2"
        >
          <X className="w-4 h-4" />
          {language === "fr" ? "Quitter le lobby" : "Leave Lobby"}
        </Button>
      </div>
    </motion.div>
  );
};

export default LobbyScreen;
