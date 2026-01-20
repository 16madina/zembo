import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, X, MessageCircle, Sparkles, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import RosePetalsAnimation from "@/components/RosePetalsAnimation";
import { supabase } from "@/integrations/supabase/client";
import { sanitizeRoseMessage } from "@/hooks/useRoseReceived";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { useSoundEffects } from "@/hooks/useSoundEffects";

interface RoseProfile {
  id: string;
  displayName: string;
  avatarUrl: string;
  age: number | null;
  location: string | null;
  bio: string | null;
  interests: string[];
  isVerified: boolean;
}

interface RoseRevealModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: RoseProfile;
  currentUserId: string;
  onMatch: () => void;
}

type RevealStep = "secret" | "message" | "profile" | "decision";

const RoseRevealModal = ({
  isOpen,
  onClose,
  profile,
  currentUserId,
  onMatch,
}: RoseRevealModalProps) => {
  const [step, setStep] = useState<RevealStep>("secret");
  const [message, setMessage] = useState("");
  const [showPetals, setShowPetals] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const { playRoseSound, playRevealSound, playMatchSound } = useSoundEffects();

  // Fetch the rose message
  useEffect(() => {
    const fetchMessage = async () => {
      if (!isOpen || !profile.id || !currentUserId) return;

      const { data } = await supabase
        .from("gift_transactions")
        .select("message")
        .eq("sender_id", profile.id)
        .eq("receiver_id", currentUserId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data?.message) {
        setMessage(sanitizeRoseMessage(data.message));
      }
    };

    if (isOpen) {
      fetchMessage();
      setStep("secret");
      setShowPetals(false);
    }
  }, [isOpen, profile.id, currentUserId]);

  const handleRevealMessage = useCallback(() => {
    setShowPetals(true);
    Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => {});
    // Play romantic harp/chimes sound for message reveal
    playRoseSound();
    
    setTimeout(() => {
      setStep("message");
    }, 800);
  }, [playRoseSound]);

  const handleRevealProfile = useCallback(() => {
    Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {});
    // Play magical reveal sound for profile unveiling
    playRevealSound();
    setStep("profile");
  }, [playRevealSound]);

  const handleShowDecision = useCallback(() => {
    // Play subtle chime for decision step
    playRoseSound();
    setStep("decision");
  }, [playRoseSound]);

  const handleMatch = useCallback(async () => {
    setIsLoading(true);
    // Play celebratory match sound
    playMatchSound();
    await onMatch();
    setIsLoading(false);
  }, [onMatch, playMatchSound]);

  const handlePetalsComplete = useCallback(() => {
    setShowPetals(false);
  }, []);

  if (!isOpen) return null;

  return (
    <>
      <RosePetalsAnimation isVisible={showPetals} onComplete={handlePetalsComplete} />

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9997] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
            onClick={onClose}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", damping: 20, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-sm"
            >
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute -top-12 right-0 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-20"
              >
                <X className="w-5 h-5 text-white" />
              </button>

              {/* Step 1: Secret Card */}
              {step === "secret" && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gradient-to-br from-rose-950/95 via-background/95 to-rose-900/90 backdrop-blur-xl rounded-3xl p-8 border border-rose-500/40 text-center"
                >
                  {/* Mystery avatar */}
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring" }}
                    className="relative mx-auto w-32 h-32 mb-6"
                  >
                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-rose-400/30 to-rose-600/30 animate-pulse" />
                    <div className="relative w-full h-full rounded-full bg-rose-900/50 flex items-center justify-center border-4 border-rose-500/50">
                      <span className="text-6xl">🌹</span>
                    </div>
                    <motion.div
                      animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.5, 1, 0.5],
                      }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="absolute inset-0 rounded-full border-2 border-rose-400/50"
                    />
                  </motion.div>

                  {/* Secret title */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                  >
                    <h2 className="text-2xl font-bold text-white mb-2">
                      Admirateur Secret 💕
                    </h2>
                    <p className="text-rose-200/80 text-lg font-medium mb-1">
                      {profile.displayName}
                    </p>
                    <p className="text-rose-300/60 text-sm mb-6">
                      t'a envoyé une rose avec un message...
                    </p>
                  </motion.div>

                  {/* Reveal button */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                  >
                    <Button
                      onClick={handleRevealMessage}
                      className="w-full bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white py-6 text-lg gap-3"
                    >
                      <Sparkles className="w-5 h-5" />
                      Découvrir le message
                    </Button>
                  </motion.div>
                </motion.div>
              )}

              {/* Step 2: Message Reveal */}
              {step === "message" && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-gradient-to-br from-rose-950/95 via-background/95 to-rose-900/90 backdrop-blur-xl rounded-3xl p-8 border border-rose-500/40 text-center"
                >
                  {/* Rose icon */}
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", damping: 15 }}
                    className="text-6xl mb-6"
                  >
                    🌹
                  </motion.div>

                  {/* Sender name */}
                  <h2 className="text-xl font-semibold text-white mb-2">
                    Message de {profile.displayName}
                  </h2>

                  {/* The message */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-white/10 rounded-2xl p-5 mb-6 border border-rose-400/20"
                  >
                    <MessageCircle className="w-5 h-5 text-rose-400 mx-auto mb-3" />
                    <p className="text-white/90 text-lg italic leading-relaxed">
                      "{message || "Une rose pour toi... 🌹"}"
                    </p>
                  </motion.div>

                  {/* Continue button */}
                  <Button
                    onClick={handleRevealProfile}
                    className="w-full bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white py-6 text-lg gap-3"
                  >
                    <Eye className="w-5 h-5" />
                    Découvrir son profil
                  </Button>
                </motion.div>
              )}

              {/* Step 3: Profile Reveal */}
              {step === "profile" && (
                <motion.div
                  initial={{ opacity: 0, rotateY: 90 }}
                  animate={{ opacity: 1, rotateY: 0 }}
                  transition={{ type: "spring", damping: 20 }}
                  className="bg-gradient-to-br from-background/95 to-muted/90 backdrop-blur-xl rounded-3xl overflow-hidden border border-rose-500/30"
                >
                  {/* Profile photo */}
                  <div className="relative aspect-[4/5] w-full">
                    <img
                      src={profile.avatarUrl}
                      alt={profile.displayName}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

                    {/* Rose badge */}
                    <div className="absolute top-4 right-4">
                      <span className="text-3xl drop-shadow-lg">🌹</span>
                    </div>

                    {/* Profile info overlay */}
                    <div className="absolute bottom-0 left-0 right-0 p-5">
                      <h2 className="text-2xl font-bold text-white">
                        {profile.displayName}
                        {profile.age && <span className="font-normal">, {profile.age}</span>}
                      </h2>
                      {profile.location && (
                        <p className="text-white/70 text-sm mt-1">{profile.location}</p>
                      )}
                      {profile.bio && (
                        <p className="text-white/80 text-sm mt-2 line-clamp-2">{profile.bio}</p>
                      )}
                    </div>
                  </div>

                  {/* Action */}
                  <div className="p-5">
                    <Button
                      onClick={handleShowDecision}
                      className="w-full bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white py-5 text-lg"
                    >
                      Continuer
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* Step 4: Decision */}
              {step === "decision" && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gradient-to-br from-rose-950/95 via-background/95 to-rose-900/90 backdrop-blur-xl rounded-3xl p-6 border border-rose-500/40 text-center"
                >
                  {/* Mini profile */}
                  <div className="flex items-center gap-4 mb-6">
                    <img
                      src={profile.avatarUrl}
                      alt={profile.displayName}
                      className="w-16 h-16 rounded-full object-cover border-2 border-rose-500/50"
                    />
                    <div className="text-left">
                      <h3 className="text-lg font-semibold text-white">{profile.displayName}</h3>
                      <p className="text-rose-200/70 text-sm flex items-center gap-1">
                        <span>🌹</span> T'a envoyé une rose
                      </p>
                    </div>
                  </div>

                  {/* Question */}
                  <h2 className="text-xl font-bold text-white mb-6">
                    Voulez-vous matcher avec {profile.displayName.split(" ")[0]} ? 💕
                  </h2>

                  {/* Action buttons */}
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={onClose}
                      className="flex-1 border-rose-400/30 text-rose-200 hover:bg-rose-500/20 py-5"
                      disabled={isLoading}
                    >
                      Pas maintenant
                    </Button>
                    <Button
                      onClick={handleMatch}
                      disabled={isLoading}
                      className="flex-1 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white py-5 gap-2"
                    >
                      <Heart className="w-5 h-5 fill-current" />
                      {isLoading ? "..." : "Oui, matcher !"}
                    </Button>
                  </div>
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default RoseRevealModal;
