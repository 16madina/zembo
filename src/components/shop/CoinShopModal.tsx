import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Coins, Sparkles, Crown, Gift, Zap, Star, Check, TrendingUp } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useCoins } from "@/hooks/useCoins";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { getCurrencyByCountry, formatPrice, CurrencyInfo } from "@/data/currencies";
import { toast } from "sonner";

interface CoinPack {
  id: string;
  coins: number;
  priceUSD: number;
  bonus: number;
  popular?: boolean;
  bestValue?: boolean;
  icon: React.ReactNode;
  color: string;
  gradient: string;
}

const coinPacks: CoinPack[] = [
  {
    id: "starter",
    coins: 50,
    priceUSD: 0.99,
    bonus: 0,
    icon: <Coins className="w-6 h-6" />,
    color: "text-amber-400",
    gradient: "from-amber-500/20 to-yellow-500/20",
  },
  {
    id: "basic",
    coins: 150,
    priceUSD: 2.49,
    bonus: 10,
    icon: <Zap className="w-6 h-6" />,
    color: "text-blue-400",
    gradient: "from-blue-500/20 to-cyan-500/20",
  },
  {
    id: "popular",
    coins: 500,
    priceUSD: 6.99,
    bonus: 50,
    popular: true,
    icon: <Star className="w-6 h-6" />,
    color: "text-purple-400",
    gradient: "from-purple-500/20 to-pink-500/20",
  },
  {
    id: "premium",
    coins: 1200,
    priceUSD: 14.99,
    bonus: 200,
    icon: <Crown className="w-6 h-6" />,
    color: "text-orange-400",
    gradient: "from-orange-500/20 to-red-500/20",
  },
  {
    id: "vip",
    coins: 3000,
    priceUSD: 29.99,
    bonus: 600,
    bestValue: true,
    icon: <Sparkles className="w-6 h-6" />,
    color: "text-pink-400",
    gradient: "from-pink-500/20 to-rose-500/20",
  },
  {
    id: "whale",
    coins: 10000,
    priceUSD: 79.99,
    bonus: 2500,
    icon: <Gift className="w-6 h-6" />,
    color: "text-emerald-400",
    gradient: "from-emerald-500/20 to-teal-500/20",
  },
];

interface CoinShopModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CoinShopModal = ({ isOpen, onClose }: CoinShopModalProps) => {
  const { user } = useAuth();
  const { balance, addCoins } = useCoins();
  const [userCountry, setUserCountry] = useState<string>("US");
  const [currency, setCurrency] = useState<CurrencyInfo | null>(null);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState<{ coins: number; bonus: number } | null>(null);

  useEffect(() => {
    const fetchUserCountry = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from("profiles")
        .select("location")
        .eq("user_id", user.id)
        .single();
      
      if (data?.location) {
        setUserCountry(data.location);
        setCurrency(getCurrencyByCountry(data.location));
      } else {
        setCurrency(getCurrencyByCountry("US"));
      }
    };
    
    fetchUserCountry();
  }, [user]);

  const handlePurchase = async (pack: CoinPack) => {
    setPurchasing(pack.id);
    
    // Simulate payment processing
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const totalCoins = pack.coins + pack.bonus;
    const success = await addCoins(totalCoins);
    
    if (success) {
      setShowSuccess({ coins: pack.coins, bonus: pack.bonus });
      toast.success(`🎉 ${totalCoins} coins ajoutés à votre compte !`);
      
      setTimeout(() => {
        setShowSuccess(null);
      }, 3000);
    } else {
      toast.error("Erreur lors de l'achat. Veuillez réessayer.");
    }
    
    setPurchasing(null);
  };

  if (!currency) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-gradient-to-b from-background to-background/95 border-primary/20">
        <DialogHeader className="relative pb-4">
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-20 h-1 bg-gradient-to-r from-primary/50 via-primary to-primary/50 rounded-full" />
          <DialogTitle className="text-2xl font-bold text-center flex items-center justify-center gap-2">
            <Coins className="w-7 h-7 text-primary" />
            Boutique
          </DialogTitle>
          <div className="flex items-center justify-center gap-2 mt-2">
            <span className="text-muted-foreground">Solde actuel:</span>
            <motion.span 
              key={balance}
              initial={{ scale: 1.2 }}
              animate={{ scale: 1 }}
              className="font-bold text-primary text-lg"
            >
              {balance} coins
            </motion.span>
          </div>
          <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
            <span>Prix en</span>
            <span className="font-semibold text-foreground">{currency.name} ({currency.symbol})</span>
          </div>
        </DialogHeader>

        {/* Success Animation */}
        <AnimatePresence>
          {showSuccess && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-sm rounded-lg"
            >
              <div className="text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
                  className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center"
                >
                  <Check className="w-10 h-10 text-white" />
                </motion.div>
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-2xl font-bold"
                >
                  +{showSuccess.coins + showSuccess.bonus} coins
                </motion.p>
                {showSuccess.bonus > 0 && (
                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="text-sm text-muted-foreground"
                  >
                    dont {showSuccess.bonus} en bonus ! 🎁
                  </motion.p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Coin Packs Grid */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          {coinPacks.map((pack, index) => (
            <motion.div
              key={pack.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="relative"
            >
              {/* Badges */}
              {pack.popular && (
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-10 px-3 py-0.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold rounded-full shadow-lg">
                  POPULAIRE
                </div>
              )}
              {pack.bestValue && (
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-10 px-3 py-0.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-bold rounded-full shadow-lg flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  MEILLEUR
                </div>
              )}

              <Button
                variant="outline"
                disabled={purchasing !== null}
                onClick={() => handlePurchase(pack)}
                className={`
                  relative w-full h-auto flex flex-col items-center py-4 px-3 
                  bg-gradient-to-br ${pack.gradient} 
                  border-2 hover:border-primary/50 transition-all duration-300
                  ${pack.popular ? 'border-purple-500/50 ring-2 ring-purple-500/20' : ''}
                  ${pack.bestValue ? 'border-emerald-500/50 ring-2 ring-emerald-500/20' : ''}
                  ${purchasing === pack.id ? 'animate-pulse' : ''}
                `}
              >
                {/* Icon */}
                <div className={`mb-2 ${pack.color}`}>
                  {pack.icon}
                </div>

                {/* Coins Amount */}
                <div className="flex items-center gap-1 mb-1">
                  <Coins className="w-4 h-4 text-primary" />
                  <span className="font-bold text-lg">{pack.coins.toLocaleString()}</span>
                </div>

                {/* Bonus */}
                {pack.bonus > 0 && (
                  <motion.div
                    initial={{ scale: 0.9 }}
                    animate={{ scale: [0.9, 1.05, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="text-xs text-emerald-500 font-semibold mb-2"
                  >
                    +{pack.bonus} BONUS 🎁
                  </motion.div>
                )}

                {/* Price */}
                <div className="text-sm font-semibold text-foreground mt-auto">
                  {formatPrice(pack.priceUSD, userCountry)}
                </div>

                {/* Loading state */}
                {purchasing === pack.id && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-lg">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </Button>
            </motion.div>
          ))}
        </div>

        {/* Info Section */}
        <div className="mt-6 p-4 rounded-xl bg-muted/50 border border-border">
          <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
            <Gift className="w-4 h-4 text-primary" />
            À quoi servent les coins ?
          </h4>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>🌹 Envoyer des cadeaux virtuels en live</li>
            <li>⭐ Accéder aux lives premium</li>
            <li>🎥 Rejoindre un streamer sur scène</li>
            <li>💎 Booster votre profil</li>
          </ul>
        </div>

        {/* Close Button */}
        <Button
          variant="ghost"
          className="absolute top-2 right-2 w-8 h-8 p-0 rounded-full"
          onClick={onClose}
        >
          <X className="w-4 h-4" />
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default CoinShopModal;
