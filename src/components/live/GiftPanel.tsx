import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Coins, Plus } from "lucide-react";
import { useGifts, type VirtualGift } from "@/hooks/useGifts";
import { useCoins } from "@/hooks/useCoins";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import CoinShopModal from "@/components/shop/CoinShopModal";
import { tapHaptics } from "@/hooks/useHaptics";

interface GiftPanelProps {
  isOpen: boolean;
  onClose: () => void;
  streamerId: string;
  liveId: string;
  onGiftSent?: (gift: VirtualGift) => void;
}

const GiftPanel = ({
  isOpen,
  onClose,
  streamerId,
  liveId,
  onGiftSent,
}: GiftPanelProps) => {
  const { gifts, sendGift, loading } = useGifts(liveId);
  const { balance, refetch: refetchCoins } = useCoins();
  const [selectedGift, setSelectedGift] = useState<VirtualGift | null>(null);
  const [sending, setSending] = useState(false);
  const [showCoinShop, setShowCoinShop] = useState(false);
  const [sendingGiftId, setSendingGiftId] = useState<string | null>(null);

   const handleCoinShopClose = () => {
     setShowCoinShop(false);
     // Refetch coins when shop closes in case user made a purchase
     refetchCoins();
   };
 
  // Send gift immediately on tap
  const handleGiftTap = async (gift: VirtualGift) => {
    // Check if can afford
    if (balance < gift.price_coins) {
      tapHaptics.notify("ERROR");
      toast.error("Solde insuffisant");
      return;
    }
    
    // Prevent rapid double-sending of same gift
    if (sendingGiftId === gift.id) {
      return;
    }
    
    // Visual feedback - briefly mark as sending
    setSendingGiftId(gift.id);
    setSelectedGift(gift);
    
    const result = await sendGift(gift, streamerId);
    
    if (result.success) {
      onGiftSent?.(gift);
      // Quick success feedback (no toast to avoid spam on rapid taps)
    } else {
      toast.error(result.error || "Erreur lors de l'envoi");
    }
    
    // Allow sending again after a short delay
    setTimeout(() => {
      setSendingGiftId(null);
    }, 200);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 z-40"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="absolute bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-xl rounded-t-3xl border-t border-border"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-foreground">
                  Envoyer un cadeau
                </h3>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowCoinShop(true)}
                  className="flex items-center gap-1 px-3 py-1 rounded-full bg-primary/20 hover:bg-primary/30 transition-colors"
                >
                  <Coins className="w-4 h-4 text-primary" />
                  <span className="font-semibold text-primary">{balance}</span>
                  <Plus className="w-3 h-3 text-primary" />
                </button>
                <button onClick={() => { tapHaptics.impact("LIGHT"); onClose(); }}>
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>
            </div>

            {/* Gifts Grid */}
            <div className="p-4 max-h-64 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-3">
                  {gifts.map((gift) => {
                    const isSelected = selectedGift?.id === gift.id;
                    const canAffordOne = balance >= gift.price_coins;
                    const isSendingThis = sendingGiftId === gift.id;

                    return (
                      <motion.button
                        key={gift.id}
                        whileTap={{ scale: 0.85 }}
                        animate={isSendingThis ? { scale: [1, 1.2, 1] } : {}}
                        transition={{ duration: 0.2 }}
                        onClick={() => canAffordOne && !isSendingThis && handleGiftTap(gift)}
                        className={`relative flex flex-col items-center gap-1 p-3 rounded-xl transition-all ${
                          isSendingThis
                            ? "bg-primary/30 ring-2 ring-primary scale-105"
                            : isSelected
                            ? "bg-primary/20 ring-1 ring-primary/50"
                            : canAffordOne
                            ? "bg-muted hover:bg-muted/80"
                            : "bg-muted/50 opacity-50"
                        }`}
                        disabled={!canAffordOne || isSendingThis}
                      >
                        {/* Sending indicator */}
                        {isSendingThis && (
                          <motion.div 
                            className="absolute inset-0 rounded-xl bg-primary/20"
                            animate={{ opacity: [0.5, 1, 0.5] }}
                            transition={{ duration: 0.3, repeat: Infinity }}
                          />
                        )}
                        
                        <motion.span
                          className="text-3xl"
                          animate={isSendingThis ? { scale: [1, 1.4, 1], rotate: [0, 10, -10, 0] } : {}}
                          transition={{ duration: 0.3 }}
                        >
                          {gift.emoji}
                        </motion.span>
                        <span className="text-xs font-medium text-foreground">
                          {gift.name}
                        </span>
                        <div className="flex items-center gap-0.5">
                          <Coins className="w-3 h-3 text-primary" />
                          <span className="text-xs font-semibold text-primary">
                            {gift.price_coins}
                          </span>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Send Button */}
            <div className="p-4 border-t border-border">
              {/* Show recharge button when balance is low */}
              {balance < 10 && (
                <Button
                  variant="outline"
                  className="w-full mb-2 border-primary/50 text-primary hover:bg-primary/10"
                  onClick={() => setShowCoinShop(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Recharger mes coins
                </Button>
              )}
              <p className="text-center text-xs text-muted-foreground">
                👆 Tapote un cadeau pour l'envoyer instantanément !
              </p>
            </div>
          </motion.div>
        </>
      )}
      
      {/* Coin Shop Modal - Opens on top of gift panel */}
      <CoinShopModal 
        isOpen={showCoinShop} 
        onClose={handleCoinShopClose} 
      />
    </AnimatePresence>
  );
};

export default GiftPanel;
