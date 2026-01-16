import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { 
  Crown, 
  Star, 
  Check, 
  X, 
  Zap, 
  Heart, 
  Eye, 
  MapPin, 
  Shield, 
  MessageCircle,
  Sparkles,
  ArrowLeft,
  Rocket,
  Undo2,
  Filter,
  Lock,
  Headphones,
  RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/contexts/AuthContext";
import { usePayment } from "@/hooks/usePayment";
import { useRevenueCat } from "@/hooks/useRevenueCat";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import confetti from "canvas-confetti";
import { isNative } from "@/lib/capacitor";

type PlanType = "free" | "gold" | "platinum";

interface PlanFeature {
  name: string;
  icon: React.ReactNode;
  free: string | boolean;
  gold: string | boolean;
  platinum: string | boolean;
}

const features: PlanFeature[] = [
  {
    name: "Likes par jour",
    icon: <Heart className="w-4 h-4" />,
    free: "5",
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
    name: "Retour en arrière (Rewind)",
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
    name: "Passeport (changer localisation)",
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
    name: "Voir qui a lu vos messages",
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

const Subscriptions = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { subscription, fetchSubscription } = useSubscription();
  const { subscribe: stripeSubscribe, isProcessing: isStripeProcessing } = usePayment();
  const { 
    subscribe: revenueCatSubscribe, 
    restore, 
    isLoading: isRevenueCatLoading, 
    packages 
  } = useRevenueCat();
  
  const [selectedPlan, setSelectedPlan] = useState<PlanType>("gold");
  const [isRestoring, setIsRestoring] = useState(false);

  const currentTier = subscription?.tier || "free";
  const isSubscribing = isStripeProcessing || isRevenueCatLoading;

  // Get prices from RevenueCat packages if available (iOS native)
  const getPrice = (plan: "gold" | "platinum") => {
    if (packages && isNative) {
      const pkg = packages.find(p => p.identifier === plan);
      if (pkg) return pkg.priceString;
    }
    return plan === "gold" ? "8.99$" : "17.99$";
  };

  const handleSubscribe = async (plan: PlanType) => {
    if (!user) {
      toast.error("Vous devez être connecté pour souscrire");
      return;
    }

    if (plan === "free") return;

    const tier = plan === "gold" ? "premium" : "vip";

    // Check if already on this plan
    if (currentTier === tier) {
      toast.info("Vous êtes déjà abonné à ce plan");
      return;
    }

    try {
      let result;
      
      if (isNative) {
        // iOS/Android native: use RevenueCat
        result = await revenueCatSubscribe(plan);
      } else {
        // Web: use Stripe
        result = await stripeSubscribe(plan);
      }

      if (result.success) {
        // Fire confetti
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: plan === "platinum" 
            ? ["#8B5CF6", "#C4B5FD", "#7C3AED", "#DDD6FE"] 
            : ["#F59E0B", "#FCD34D", "#D97706", "#FDE68A"],
        });

        await fetchSubscription();
      }
    } catch (error) {
      console.error("Subscription error:", error);
      toast.error("Erreur lors de la souscription");
    }
  };

  const handleRestorePurchases = async () => {
    setIsRestoring(true);
    try {
      const result = await restore();
      if (result.success) {
        await fetchSubscription();
      }
    } finally {
      setIsRestoring(false);
    }
  };
  };

  const renderFeatureValue = (value: string | boolean, plan: PlanType) => {
    if (typeof value === "boolean") {
      return value ? (
        <Check className={cn(
          "w-5 h-5",
          plan === "platinum" ? "text-purple-400" : 
          plan === "gold" ? "text-amber-400" : "text-muted-foreground"
        )} />
      ) : (
        <X className="w-5 h-5 text-muted-foreground/50" />
      );
    }
    return (
      <span className={cn(
        "text-sm font-medium",
        plan === "platinum" ? "text-purple-300" : 
        plan === "gold" ? "text-amber-300" : "text-muted-foreground"
      )}>
        {value}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-background/95 pb-20">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center justify-between px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold">Abonnements</h1>
          <div className="w-10" />
        </div>
      </div>

      <div className="px-4 py-6 max-w-lg mx-auto">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="relative inline-block mb-4">
            <Crown className="w-16 h-16 text-amber-400" />
            <motion.div
              className="absolute -top-1 -right-1"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              <Sparkles className="w-6 h-6 text-purple-400" />
            </motion.div>
          </div>
          <h2 className="text-2xl font-bold mb-2">Passez à la vitesse supérieure</h2>
          <p className="text-muted-foreground">
            Débloquez toutes les fonctionnalités et trouvez l'amour plus vite
          </p>
        </motion.div>

        {/* Plan Cards */}
        <div className="grid gap-4 mb-8">
          {/* Gold Plan */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className={cn(
              "relative p-4 rounded-2xl border-2 transition-all cursor-pointer",
              selectedPlan === "gold" 
                ? "border-amber-400 bg-amber-400/10" 
                : "border-border/50 bg-card hover:border-amber-400/50"
            )}
            onClick={() => setSelectedPlan("gold")}
          >
            {currentTier === "premium" && (
              <Badge className="absolute -top-2 right-4 bg-amber-500">
                Actuel
              </Badge>
            )}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                  <Crown className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-amber-400">Gold</h3>
                  <p className="text-sm text-muted-foreground">L'essentiel premium</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-amber-400">{getPrice("gold")}</div>
                <div className="text-xs text-muted-foreground">/mois</div>
              </div>
            </div>
          </motion.div>

          {/* Platinum Plan */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className={cn(
              "relative p-4 rounded-2xl border-2 transition-all cursor-pointer overflow-hidden",
              selectedPlan === "platinum" 
                ? "border-purple-400 bg-purple-400/10" 
                : "border-border/50 bg-card hover:border-purple-400/50"
            )}
            onClick={() => setSelectedPlan("platinum")}
          >
            <Badge className="absolute -top-2 right-4 bg-gradient-to-r from-purple-500 to-pink-500">
              {currentTier === "vip" ? "Actuel" : "Populaire"}
            </Badge>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-purple-400">Platinum</h3>
                  <p className="text-sm text-muted-foreground">L'expérience ultime</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-purple-400">{getPrice("platinum")}</div>
                <div className="text-xs text-muted-foreground">/mois</div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Subscribe Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-8"
        >
          <Button
            className={cn(
              "w-full h-14 text-lg font-semibold rounded-xl",
              selectedPlan === "platinum"
                ? "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                : "bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600"
            )}
            onClick={() => handleSubscribe(selectedPlan)}
            disabled={isSubscribing || (selectedPlan === "gold" && currentTier === "premium") || (selectedPlan === "platinum" && currentTier === "vip")}
          >
            {isSubscribing ? (
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Traitement...
              </div>
            ) : currentTier === (selectedPlan === "gold" ? "premium" : "vip") ? (
              "Déjà abonné"
            ) : (
              <>
                <Crown className="w-5 h-5 mr-2" />
                Souscrire à {selectedPlan === "gold" ? "Gold" : "Platinum"}
              </>
            )}
          </Button>
          <p className="text-center text-xs text-muted-foreground mt-2">
            Annulez à tout moment • Paiement sécurisé
          </p>
          
          {/* Restore Purchases Button (iOS only) */}
          {isNative && (
            <Button
              variant="ghost"
              className="w-full mt-3 text-muted-foreground"
              onClick={handleRestorePurchases}
              disabled={isRestoring}
            >
              {isRestoring ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Restaurer mes achats
            </Button>
          )}
        </motion.div>

        {/* Feature Comparison Table */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="bg-card rounded-2xl border border-border/50 overflow-hidden"
        >
          <div className="p-4 border-b border-border/50">
            <h3 className="font-semibold text-center">Comparaison des plans</h3>
          </div>

          {/* Table Header */}
          <div className="grid grid-cols-4 gap-2 p-3 bg-muted/30 text-center text-sm font-medium">
            <div className="text-left pl-2">Fonctionnalité</div>
            <div className="text-muted-foreground">Gratuit</div>
            <div className="text-amber-400">Gold</div>
            <div className="text-purple-400">Platinum</div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-border/30">
            {features.map((feature, index) => (
              <motion.div
                key={feature.name}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + index * 0.03 }}
                className="grid grid-cols-4 gap-2 p-3 text-center items-center hover:bg-muted/20 transition-colors"
              >
                <div className="flex items-center gap-2 text-left">
                  <span className="text-muted-foreground">{feature.icon}</span>
                  <span className="text-xs sm:text-sm">{feature.name}</span>
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
        </motion.div>

        {/* FAQ Section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-8 text-center"
        >
          <p className="text-sm text-muted-foreground mb-4">
            Des questions ? Consultez notre{" "}
            <Button variant="link" className="p-0 h-auto text-primary" onClick={() => navigate("/support")}>
              Centre d'aide
            </Button>
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Subscriptions;
