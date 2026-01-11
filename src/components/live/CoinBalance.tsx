import { motion } from "framer-motion";
import { Coins, Plus } from "lucide-react";
import { useCoins } from "@/hooks/useCoins";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface CoinBalanceProps {
  showBuyButton?: boolean;
  compact?: boolean;
}

const CoinBalance = ({ showBuyButton = true, compact = false }: CoinBalanceProps) => {
  const { balance, loading, addCoins } = useCoins();

  // Temporary function to add demo coins
  const handleBuyCoins = async () => {
    const success = await addCoins(100);
    if (success) {
      toast.success("🎉 100 coins ajoutés !");
    } else {
      toast.error("Erreur lors de l'achat");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted animate-pulse">
        <Coins className="w-4 h-4 text-muted-foreground" />
        <span className="text-muted-foreground">...</span>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/20">
        <Coins className="w-4 h-4 text-primary" />
        <motion.span
          key={balance}
          initial={{ scale: 1.2 }}
          animate={{ scale: 1 }}
          className="font-semibold text-primary"
        >
          {balance}
        </motion.span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-primary/20 to-accent/20 border border-primary/30">
        <Coins className="w-5 h-5 text-primary" />
        <motion.span
          key={balance}
          initial={{ scale: 1.3, color: "hsl(var(--primary))" }}
          animate={{ scale: 1 }}
          className="font-bold text-lg text-foreground"
        >
          {balance}
        </motion.span>
        <span className="text-sm text-muted-foreground">coins</span>
      </div>

      {showBuyButton && (
        <Button
          size="sm"
          variant="outline"
          className="gap-1"
          onClick={handleBuyCoins}
        >
          <Plus className="w-4 h-4" />
          Acheter
        </Button>
      )}
    </div>
  );
};

export default CoinBalance;
