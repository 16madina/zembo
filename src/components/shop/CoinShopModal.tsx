import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, Coins, Sparkles, Crown, Gift, Zap, Star, Check, TrendingUp,
  Heart, Eye, Rocket, Undo2, Shield, MapPin, Filter, MessageCircle,
  Lock, Headphones, CreditCard, Apple
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useCoins } from "@/hooks/useCoins";
import { useSubscription } from "@/hooks/useSubscription";
import { usePayment } from "@/hooks/usePayment";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { getCurrencyByCountry, formatPrice, CurrencyInfo } from "@/data/currencies";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import confetti from "canvas-confetti";
import { isNative, isIOS } from "@/lib/capacitor";
import { 
  purchaseConsumable, 
  getCoinProductPrices, 
  COIN_PACK_TO_PRODUCT 
} from "@/lib/revenuecat";
import { useRevenueCat } from "@/hooks/useRevenueCat";

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
    id: "basic",
    coins: 150,
    priceUSD: 1.99,
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
];

// Subscription features
interface PlanFeature {
  name: string;
  icon: React.ReactNode;
  free: string | boolean;
  gold: string | boolean;
  platinum: string | boolean;
}

const subscriptionFeatures: PlanFeature[] = [
  {
    name: "Likes par jour",
    icon: <Heart className="w-4 h-4" />,
    free: "10",
    gold: "Illimités",
    platinum: "Illimités",
  },
  {
    name: "Super Likes",
    icon: <Star className="w-4 h-4" />,
    free: "1/semaine",
    gold: "5/jour",
    platinum: "Illimités",
  },
  {
    name: "Voir qui vous a liké",
    icon: <Eye className="w-4 h-4" />,
    free: "Flouté",
    gold: true,
    platinum: true,
  },
  {
    name: "Boosts gratuits",
    icon: <Rocket className="w-4 h-4" />,
    free: false,
    gold: "1/mois",
    platinum: "5/mois",
  },
  {
    name: "Retour en arrière",
    icon: <Undo2 className="w-4 h-4" />,
    free: false,
    gold: true,
    platinum: true,
  },
  {
    name: "Sans publicités",
    icon: <Shield className="w-4 h-4" />,
    free: false,
    gold: true,
    platinum: true,
  },
  {
    name: "Passeport",
    icon: <MapPin className="w-4 h-4" />,
    free: false,
    gold: true,
    platinum: true,
  },
  {
    name: "Filtres avancés",
    icon: <Filter className="w-4 h-4" />,
    free: false,
    gold: true,
    platinum: true,
  },
  {
    name: "Messages prioritaires",
    icon: <MessageCircle className="w-4 h-4" />,
    free: false,
    gold: false,
    platinum: true,
  },
  {
    name: "Badge Platinum",
    icon: <Sparkles className="w-4 h-4" />,
    free: false,
    gold: false,
    platinum: true,
  },
  {
    name: "Accusés de lecture",
    icon: <Check className="w-4 h-4" />,
    free: false,
    gold: false,
    platinum: true,
  },
  {
    name: "Mode Incognito",
    icon: <Lock className="w-4 h-4" />,
    free: false,
    gold: false,
    platinum: true,
  },
  {
    name: "Matchs prioritaires",
    icon: <Zap className="w-4 h-4" />,
    free: false,
    gold: false,
    platinum: true,
  },
  {
    name: "Support prioritaire",
    icon: <Headphones className="w-4 h-4" />,
    free: false,
    gold: false,
    platinum: true,
  },
];

interface CoinShopModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CoinShopModal = ({ isOpen, onClose }: CoinShopModalProps) => {
  const { user } = useAuth();
  const { balance, addCoins } = useCoins();
  const { subscription, fetchSubscription } = useSubscription();
  const { subscribe, isProcessing, processingPlan, isStripe, isRevenueCat } = usePayment();
  const { isInitialized: isRevenueCatInitialized, isLoading: isRevenueCatLoading } = useRevenueCat();
  const [userCountry, setUserCountry] = useState<string>("US");
  const [currency, setCurrency] = useState<CurrencyInfo | null>(null);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState<{ coins: number; bonus: number } | null>(null);
  const [revenueCatPrices, setRevenueCatPrices] = useState<Record<string, { priceString: string; price: number }> | null>(null);

  const currentTier = subscription?.tier || "free";
  // On iOS native, always use RevenueCat for in-app purchases (App Store requirement)
  const useRevenueCatForCoins = isIOS;

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

  // Fetch RevenueCat coin prices on iOS when initialized
  useEffect(() => {
    const fetchRevenueCatPrices = async () => {
      if (isIOS && isOpen && isRevenueCatInitialized) {
        const prices = await getCoinProductPrices();
        if (prices) {
          setRevenueCatPrices(prices);
        }
      }
    };
    
    fetchRevenueCatPrices();
  }, [isOpen, isRevenueCatInitialized]);

  // Get display price for a coin pack
  const getPackPrice = (pack: CoinPack): string => {
    if (useRevenueCatForCoins && revenueCatPrices) {
      const productMapping = COIN_PACK_TO_PRODUCT[pack.id];
      if (productMapping) {
        const price = revenueCatPrices[productMapping.productId];
        if (price) return price.priceString;
      }
    }
    // Fallback to local currency conversion
    return formatPrice(pack.priceUSD, userCountry);
  };

  const handlePurchase = async (pack: CoinPack) => {
    if (!user) {
      toast.error("Vous devez être connecté pour acheter");
      return;
    }

    // Check if RevenueCat is ready on iOS
    if (useRevenueCatForCoins && !isRevenueCatInitialized) {
      if (isRevenueCatLoading) {
        toast.error("Chargement en cours, veuillez patienter...");
      } else {
        toast.error("Le système d'achat n'est pas disponible. Veuillez redémarrer l'application.");
      }
      return;
    }

    setPurchasing(pack.id);
    
    try {
      const totalCoins = pack.coins + pack.bonus;

      if (useRevenueCatForCoins) {
        // iOS native: Use RevenueCat for in-app purchase
        const productMapping = COIN_PACK_TO_PRODUCT[pack.id];
        if (!productMapping) {
          throw new Error("Product not found");
        }

        const result = await purchaseConsumable(productMapping.productId);
        
        if (result.success) {
          // Add coins to user's balance after successful purchase
          const success = await addCoins(totalCoins);
          
          if (success) {
            setShowSuccess({ coins: pack.coins, bonus: pack.bonus });
            toast.success(`🎉 ${totalCoins} coins ajoutés à votre compte !`);
            
            setTimeout(() => {
              setShowSuccess(null);
            }, 3000);
          }
        } else if (result.error && result.error !== "Achat annulé") {
          toast.error(result.error);
        }
      } else {
        // Web + Android: Use Stripe Checkout
        const { data, error } = await supabase.functions.invoke("create-coin-checkout", {
          body: { 
            packId: pack.id,
            coins: pack.coins,
            bonus: pack.bonus,
            priceUSD: pack.priceUSD,
            successUrl: window.location.origin + "/?coin_purchase=success",
            cancelUrl: window.location.origin + "/?coin_purchase=cancelled",
          },
        });

        if (error || !data?.url) {
          throw new Error(error?.message || "Failed to create checkout session");
        }

        // Redirect to Stripe checkout
        window.location.href = data.url;
      }
    } catch (error: any) {
      console.error("Purchase error:", error);
      if (error.message !== "Achat annulé") {
        toast.error("Erreur lors de l'achat. Veuillez réessayer.");
      }
    } finally {
      setPurchasing(null);
    }
  };

  const handleSubscribe = async (plan: "gold" | "platinum") => {
    if (!user) {
      toast.error("Vous devez être connecté pour souscrire");
      return;
    }

    const tier = plan === "gold" ? "premium" : "vip";

    if (currentTier === tier) {
      toast.info("Vous êtes déjà abonné à ce plan");
      return;
    }

    // Use the payment hook which handles platform-specific payments
    const result = await subscribe(plan);
    
    if (result.success) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: plan === "platinum" 
          ? ["#8B5CF6", "#C4B5FD", "#7C3AED", "#DDD6FE"] 
          : ["#F59E0B", "#FCD34D", "#D97706", "#FDE68A"],
      });
      
      await fetchSubscription();
      onClose();
    }
  };

  const renderFeatureValue = (value: string | boolean, plan: "free" | "gold" | "platinum") => {
    if (typeof value === "boolean") {
      return value ? (
        <Check className={cn(
          "w-4 h-4",
          plan === "platinum" ? "text-purple-400" : 
          plan === "gold" ? "text-amber-400" : "text-muted-foreground"
        )} />
      ) : (
        <X className="w-4 h-4 text-muted-foreground/40" />
      );
    }
    return (
      <span className={cn(
        "text-xs font-medium",
        plan === "platinum" ? "text-purple-300" : 
        plan === "gold" ? "text-amber-300" : "text-muted-foreground"
      )}>
        {value}
      </span>
    );
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
                  {getPackPrice(pack)}
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
          
          {/* Payment method indicator */}
          <div className="flex items-center justify-center gap-1 mt-3 pt-3 border-t border-border/50 text-xs text-muted-foreground">
            {useRevenueCatForCoins ? (
              <>
                <Apple className="w-3 h-3" />
                <span>Paiement sécurisé via App Store</span>
              </>
            ) : (
              <>
                <CreditCard className="w-3 h-3" />
                <span>Paiement sécurisé par carte</span>
              </>
            )}
          </div>
        </div>

        {/* Separator */}
        <div className="my-6">
          <Separator className="bg-border/50" />
        </div>

        {/* Premium Subscriptions Section */}
        <div className="space-y-4">
          <div className="text-center">
            <h3 className="text-xl font-bold flex items-center justify-center gap-2">
              <Crown className="w-6 h-6 text-amber-400" />
              Abonnements Premium
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Débloquez toutes les fonctionnalités
            </p>
            {/* Payment method indicator */}
            <div className="flex items-center justify-center gap-1 mt-2 text-xs text-muted-foreground">
              {isRevenueCat ? (
                <>
                  <Apple className="w-3 h-3" />
                  <span>Paiement via App Store</span>
                </>
              ) : (
                <>
                  <CreditCard className="w-3 h-3" />
                  <span>Paiement sécurisé par Stripe</span>
                </>
              )}
            </div>
          </div>

          {/* Plan Cards */}
          <div className="grid grid-cols-2 gap-3">
            {/* Gold Plan */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className={cn(
                "relative p-3 rounded-xl border-2 transition-all",
                currentTier === "premium" 
                  ? "border-amber-400 bg-amber-400/10" 
                  : "border-border/50 bg-card hover:border-amber-400/50"
              )}
            >
              {currentTier === "premium" && (
                <Badge className="absolute -top-2 right-2 bg-amber-500 text-xs">
                  Actuel
                </Badge>
              )}
              <div className="text-center">
                <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                  <Crown className="w-5 h-5 text-white" />
                </div>
                <h4 className="font-bold text-amber-400">Gold</h4>
                <div className="text-lg font-bold text-amber-400 mt-1">
                  {formatPrice(8.99, userCountry)}
                </div>
                <div className="text-xs text-muted-foreground">/mois</div>
                <Button
                  size="sm"
                  className="w-full mt-3 bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-white"
                  onClick={() => handleSubscribe("gold")}
                  disabled={isProcessing || currentTier === "premium"}
                >
                  {processingPlan === "gold" ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : currentTier === "premium" ? (
                    "Actif"
                  ) : (
                    "Souscrire"
                  )}
                </Button>
              </div>
            </motion.div>

            {/* Platinum Plan */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className={cn(
                "relative p-3 rounded-xl border-2 transition-all",
                currentTier === "vip" 
                  ? "border-purple-400 bg-purple-400/10" 
                  : "border-border/50 bg-card hover:border-purple-400/50"
              )}
            >
              <Badge className="absolute -top-2 right-2 bg-gradient-to-r from-purple-500 to-pink-500 text-xs">
                {currentTier === "vip" ? "Actuel" : "Populaire"}
              </Badge>
              <div className="text-center">
                <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <h4 className="font-bold text-purple-400">Platinum</h4>
                <div className="text-lg font-bold text-purple-400 mt-1">
                  {formatPrice(17.99, userCountry)}
                </div>
                <div className="text-xs text-muted-foreground">/mois</div>
                <Button
                  size="sm"
                  className="w-full mt-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                  onClick={() => handleSubscribe("platinum")}
                  disabled={isProcessing || currentTier === "vip"}
                >
                  {processingPlan === "platinum" ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : currentTier === "vip" ? (
                    "Actif"
                  ) : (
                    "Souscrire"
                  )}
                </Button>
              </div>
            </motion.div>
          </div>

          {/* Features Comparison Table */}
          <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
            <div className="p-3 border-b border-border/50 bg-muted/30">
              <h4 className="font-semibold text-sm text-center">Comparaison des plans</h4>
            </div>

            {/* Table Header */}
            <div className="grid grid-cols-4 gap-1 p-2 bg-muted/20 text-center text-xs font-medium">
              <div className="text-left pl-2">Fonction</div>
              <div className="text-muted-foreground">Gratuit</div>
              <div className="text-amber-400">Gold</div>
              <div className="text-purple-400">Platinum</div>
            </div>

            {/* Table Body */}
            <div className="divide-y divide-border/20 max-h-60 overflow-y-auto">
              {subscriptionFeatures.map((feature, index) => (
                <motion.div
                  key={feature.name}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.02 }}
                  className="grid grid-cols-4 gap-1 p-2 text-center items-center hover:bg-muted/10 transition-colors"
                >
                  <div className="flex items-center gap-1.5 text-left">
                    <span className="text-muted-foreground shrink-0">{feature.icon}</span>
                    <span className="text-xs truncate">{feature.name}</span>
                  </div>
                  <div className="flex justify-center">
                    {renderFeatureValue(feature.free, "free")}
                  </div>
                  <div className="flex justify-center">
                    {renderFeatureValue(feature.gold, "gold")}
                  </div>
                  <div className="flex justify-center">
                    {renderFeatureValue(feature.platinum, "platinum")}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
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
