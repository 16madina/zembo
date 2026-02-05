import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Coins, Plus, Minus } from "lucide-react";
import { useGifts, type VirtualGift } from "@/hooks/useGifts";
import { useCoins } from "@/hooks/useCoins";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import CoinShopModal from "@/components/shop/CoinShopModal";

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
  const [giftCount, setGiftCount] = useState(1);

   const handleCoinShopClose = () => {
     setShowCoinShop(false);
     // Refetch coins when shop closes in case user made a purchase
     refetchCoins();
   };
 
  const handleGiftTap = (gift: VirtualGift) => {
    if (selectedGift?.id === gift.id) {
      // Same gift tapped - increment count if affordable
      const newCount = giftCount + 1;
      if (balance >= gift.price_coins * newCount) {
        setGiftCount(newCount);
      }
    } else {
      // Different gift selected - reset count
      setSelectedGift(gift);
      setGiftCount(1);
    }
  };

  const handleDecrementCount = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (giftCount > 1) {
      setGiftCount(giftCount - 1);
    }
  };

  const handleSendGift = async () => {
    if (!selectedGift) return;

    const totalCost = selectedGift.price_coins * giftCount;
    if (balance < totalCost) {
      toast.error("Solde insuffisant");
      return;
    }

    setSending(true);
    
    // Send gifts one by one for animation purposes
    let successCount = 0;
    for (let i = 0; i < giftCount; i++) {
      const result = await sendGift(selectedGift, streamerId);
      if (result.success) {
        successCount++;
        onGiftSent?.(selectedGift);
        // Small delay between sends for animation effect
        if (i < giftCount - 1) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      } else {
        toast.error(result.error || "Erreur lors de l'envoi");
        break;
      }
    }

    setSending(false);
    
    if (successCount > 0) {
      toast.success(`${selectedGift.emoji} x${successCount} envoyé${successCount > 1 ? 's' : ''} !`);
      setSelectedGift(null);
      setGiftCount(1);
    }
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
                <button onClick={onClose}>
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
                    const currentCount = isSelected ? giftCount : 1;
                    const canAfford = balance >= gift.price_coins * currentCount;
                    const canAffordOne = balance >= gift.price_coins;
                    const canAffordMore = balance >= gift.price_coins * (currentCount + 1);

                    return (
                      <motion.button
                        key={gift.id}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => canAffordOne && handleGiftTap(gift)}
                        className={`relative flex flex-col items-center gap-1 p-3 rounded-xl transition-all ${
                          isSelected
                            ? "bg-primary/20 ring-2 ring-primary"
                            : canAffordOne
                            ? "bg-muted hover:bg-muted/80"
                            : "bg-muted/50 opacity-50"
                        }`}
                        disabled={!canAffordOne}
                      >
                        {/* Count badge */}
                        {isSelected && giftCount > 1 && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute -top-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center"
                          >
                            <span className="text-xs font-bold text-primary-foreground">
                              x{giftCount}
                            </span>
                          </motion.div>
                        )}
                        
                        {/* Decrement button when count > 1 */}
                        {isSelected && giftCount > 1 && (
                          <motion.button
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            onClick={handleDecrementCount}
                            className="absolute -top-1 -left-1 w-5 h-5 bg-destructive rounded-full flex items-center justify-center"
                          >
                            <Minus className="w-3 h-3 text-destructive-foreground" />
                          </motion.button>
                        )}
                        
                        <motion.span
                          className="text-3xl"
                          animate={isSelected ? { scale: [1, 1.3, 1] } : {}}
                          transition={{ duration: 0.2 }}
                          key={isSelected ? giftCount : 0}
                        >
                          {gift.emoji}
                        </motion.span>
                        <span className="text-xs font-medium text-foreground">
                          {gift.name}
                        </span>
                        <div className="flex items-center gap-0.5">
                          <Coins className="w-3 h-3 text-primary" />
                          <span className={`text-xs font-semibold ${isSelected && giftCount > 1 ? 'text-primary' : 'text-primary'}`}>
                            {isSelected ? gift.price_coins * giftCount : gift.price_coins}
                          </span>
                        </div>
                        
                        {/* Hint to tap more */}
                        {isSelected && canAffordMore && (
                          <motion.span 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-[10px] text-muted-foreground mt-0.5"
                          >
                            Tapotez +
                          </motion.span>
                        )}
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
              <Button
                className="w-full"
                size="lg"
                disabled={!selectedGift || sending || (selectedGift && balance < selectedGift.price_coins * giftCount)}
                onClick={handleSendGift}
              >
                {sending ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : selectedGift ? (
                  <>
                    Envoyer {selectedGift.emoji} x{giftCount} ({selectedGift.price_coins * giftCount} coins)
                  </>
                ) : (
                  "Sélectionnez un cadeau"
                )}
              </Button>
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
