import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Coins } from "lucide-react";
import { useGifts, type VirtualGift } from "@/hooks/useGifts";
import { useCoins } from "@/hooks/useCoins";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

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
  const { balance } = useCoins();
  const [selectedGift, setSelectedGift] = useState<VirtualGift | null>(null);
  const [sending, setSending] = useState(false);

  const handleSendGift = async () => {
    if (!selectedGift) return;

    setSending(true);
    const result = await sendGift(selectedGift, streamerId);
    setSending(false);

    if (result.success) {
      toast.success(`${selectedGift.emoji} Cadeau envoyé !`);
      onGiftSent?.(selectedGift);
      setSelectedGift(null);
    } else {
      toast.error(result.error || "Erreur lors de l'envoi");
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
                <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-primary/20">
                  <Coins className="w-4 h-4 text-primary" />
                  <span className="font-semibold text-primary">{balance}</span>
                </div>
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
                    const canAfford = balance >= gift.price_coins;
                    const isSelected = selectedGift?.id === gift.id;

                    return (
                      <motion.button
                        key={gift.id}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setSelectedGift(gift)}
                        className={`relative flex flex-col items-center gap-1 p-3 rounded-xl transition-all ${
                          isSelected
                            ? "bg-primary/20 ring-2 ring-primary"
                            : canAfford
                            ? "bg-muted hover:bg-muted/80"
                            : "bg-muted/50 opacity-50"
                        }`}
                        disabled={!canAfford}
                      >
                        <motion.span
                          className="text-3xl"
                          animate={isSelected ? { scale: [1, 1.2, 1] } : {}}
                          transition={{ repeat: isSelected ? Infinity : 0, duration: 1 }}
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
              <Button
                className="w-full"
                size="lg"
                disabled={!selectedGift || sending}
                onClick={handleSendGift}
              >
                {sending ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : selectedGift ? (
                  <>
                    Envoyer {selectedGift.emoji} ({selectedGift.price_coins} coins)
                  </>
                ) : (
                  "Sélectionnez un cadeau"
                )}
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default GiftPanel;
