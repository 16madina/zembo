import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Coins, Loader2, Crown, Ticket, Star, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCoins } from "@/hooks/useCoins";
import { useGifts } from "@/hooks/useGifts";
import { useLiveAccess, type JoinGift } from "@/hooks/useLiveAccess";
import { toast } from "sonner";

interface JoinLiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  liveId: string;
  streamerId: string;
  streamerName: string | null;
  streamerAvatar: string | null;
  onAccessGranted: () => void;
}

const JoinLiveModal = ({
  isOpen,
  onClose,
  liveId,
  streamerId,
  streamerName,
  streamerAvatar,
  onAccessGranted,
}: JoinLiveModalProps) => {
  const { balance } = useCoins();
  const { sendGift } = useGifts(liveId);
  const { joinGifts, grantAccessWithGift } = useLiveAccess(liveId);
  const [selectedGift, setSelectedGift] = useState<JoinGift | null>(null);
  const [isSending, setIsSending] = useState(false);

  const getGiftIcon = (name: string) => {
    switch (name.toLowerCase()) {
      case "ticket":
        return <Ticket className="w-8 h-8" />;
      case "passe vip":
        return <Crown className="w-8 h-8" />;
      case "accès backstage":
        return <Star className="w-8 h-8" />;
      default:
        return <Sparkles className="w-8 h-8" />;
    }
  };

  const getGiftDescription = (name: string) => {
    switch (name.toLowerCase()) {
      case "ticket":
        return "Accès simple au live";
      case "passe vip":
        return "Accès + badge visible";
      case "accès backstage":
        return "Accès prioritaire + badge doré";
      default:
        return "Débloquer l'accès";
    }
  };

  const getGiftColor = (name: string) => {
    switch (name.toLowerCase()) {
      case "ticket":
        return "from-blue-500 to-blue-600";
      case "passe vip":
        return "from-purple-500 to-purple-600";
      case "accès backstage":
        return "from-primary to-yellow-500";
      default:
        return "from-gray-500 to-gray-600";
    }
  };

  const handleSendGift = async () => {
    if (!selectedGift) return;

    if (balance < selectedGift.price_coins) {
      toast.error("Solde insuffisant");
      return;
    }

    setIsSending(true);

    // Send the gift
    const result = await sendGift(selectedGift, streamerId);
    
    if (result.success) {
      // Grant access
      const accessResult = await grantAccessWithGift(selectedGift.id);
      
      if (accessResult.success) {
        toast.success(`${selectedGift.emoji} Accès débloqué !`);
        onAccessGranted();
      } else {
        toast.error(accessResult.error || "Erreur lors de l'accès");
      }
    } else {
      toast.error(result.error || "Erreur lors de l'envoi");
    }

    setIsSending(false);
  };

  const defaultAvatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${streamerId}`;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/90 backdrop-blur-md"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="relative w-full max-w-md bg-card rounded-3xl overflow-hidden border border-border shadow-2xl"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-muted flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Header with streamer info */}
          <div className="relative pt-8 pb-6 px-6 bg-gradient-to-b from-primary/20 to-transparent">
            <div className="flex flex-col items-center text-center">
              {/* Streamer avatar */}
              <div className="relative mb-4">
                <div className="absolute -inset-2 bg-gradient-to-r from-primary to-primary/50 rounded-full blur-md opacity-50 animate-pulse" />
                <img
                  src={streamerAvatar || defaultAvatar}
                  alt={streamerName || "Streamer"}
                  className="relative w-20 h-20 rounded-full border-4 border-primary object-cover"
                />
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-destructive rounded-full text-[10px] text-white font-bold">
                  LIVE
                </span>
              </div>

              <h2 className="text-xl font-bold text-foreground mb-1">
                {streamerName || "Streamer"}
              </h2>
              <p className="text-sm text-muted-foreground">
                Envoyez un cadeau pour rejoindre le live
              </p>
            </div>
          </div>

          {/* Coin balance */}
          <div className="px-6 py-3 bg-muted/30 flex items-center justify-center gap-2">
            <Coins className="w-5 h-5 text-primary" />
            <span className="font-bold text-foreground">{balance}</span>
            <span className="text-sm text-muted-foreground">coins</span>
          </div>

          {/* Join gifts grid */}
          <div className="p-6 space-y-3">
            {joinGifts.map((gift) => {
              const canAfford = balance >= gift.price_coins;
              const isSelected = selectedGift?.id === gift.id;

              return (
                <motion.button
                  key={gift.id}
                  whileHover={{ scale: canAfford ? 1.02 : 1 }}
                  whileTap={{ scale: canAfford ? 0.98 : 1 }}
                  onClick={() => canAfford && setSelectedGift(gift)}
                  className={`
                    w-full p-4 rounded-2xl border-2 transition-all duration-200 flex items-center gap-4
                    ${isSelected 
                      ? "border-primary bg-primary/10" 
                      : canAfford 
                        ? "border-border bg-card hover:border-primary/50" 
                        : "border-border/50 bg-muted/30 opacity-50 cursor-not-allowed"
                    }
                  `}
                  disabled={!canAfford}
                >
                  {/* Gift icon with gradient */}
                  <div className={`
                    w-16 h-16 rounded-xl flex items-center justify-center text-white
                    bg-gradient-to-br ${getGiftColor(gift.name)}
                  `}>
                    {getGiftIcon(gift.name)}
                  </div>

                  {/* Gift info */}
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{gift.emoji}</span>
                      <span className="font-bold text-foreground">{gift.name}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {getGiftDescription(gift.name)}
                    </p>
                  </div>

                  {/* Price */}
                  <div className={`
                    flex items-center gap-1 px-3 py-1.5 rounded-full font-bold
                    ${isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}
                  `}>
                    <Coins className="w-4 h-4" />
                    <span>{gift.price_coins}</span>
                  </div>
                </motion.button>
              );
            })}
          </div>

          {/* Send button */}
          <div className="p-6 pt-0">
            <Button
              className="w-full h-14 text-lg font-bold rounded-2xl btn-gold"
              onClick={handleSendGift}
              disabled={!selectedGift || isSending}
            >
              {isSending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : selectedGift ? (
                <>
                  {selectedGift.emoji} Envoyer et Rejoindre
                </>
              ) : (
                "Choisissez un cadeau"
              )}
            </Button>
          </div>

          {/* Premium hint */}
          <div className="px-6 pb-6 text-center">
            <p className="text-xs text-muted-foreground">
              <Crown className="w-3 h-3 inline mr-1 text-primary" />
              Les abonnés Premium ont un accès illimité aux lives
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default JoinLiveModal;
