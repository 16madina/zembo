import React, { useState } from "react";
import { motion } from "framer-motion";
import { Coins, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCoins } from "@/hooks/useCoins";
import CoinShopModal from "./CoinShopModal";

interface ShopButtonProps {
  variant?: "icon" | "full" | "compact";
  className?: string;
  lowBalanceThreshold?: number;
}

const ShopButton = ({ variant = "full", className = "", lowBalanceThreshold = 50 }: ShopButtonProps) => {
  const [isShopOpen, setIsShopOpen] = useState(false);
  const { balance, loading } = useCoins();

  const isLowBalance = !loading && balance < lowBalanceThreshold;

  if (variant === "icon") {
    return (
      <>
        <motion.div
          animate={isLowBalance ? { scale: [1, 1.1, 1] } : {}}
          transition={isLowBalance ? { duration: 1.5, repeat: Infinity, ease: "easeInOut" } : {}}
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsShopOpen(true)}
            className={`relative ${isLowBalance ? 'text-primary' : ''} ${className}`}
          >
            <ShoppingBag className="w-5 h-5" />
            {isLowBalance && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-primary rounded-full animate-pulse" />
            )}
          </Button>
        </motion.div>
        <CoinShopModal isOpen={isShopOpen} onClose={() => setIsShopOpen(false)} />
      </>
    );
  }

  if (variant === "compact") {
    return (
      <>
        <motion.div
          animate={isLowBalance ? { scale: [1, 1.08, 1] } : {}}
          transition={isLowBalance ? { duration: 1.5, repeat: Infinity, ease: "easeInOut" } : {}}
        >
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsShopOpen(true)}
            className={`gap-2 ${isLowBalance ? 'border-primary/50 bg-primary/10' : ''} ${className}`}
          >
            <Coins className="w-4 h-4 text-primary" />
            <span className="font-semibold text-sm">Boutique</span>
            {isLowBalance && (
              <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            )}
          </Button>
        </motion.div>
        <CoinShopModal isOpen={isShopOpen} onClose={() => setIsShopOpen(false)} />
      </>
    );
  }

  return (
    <>
      <motion.div
        animate={isLowBalance ? { scale: [1, 1.05, 1] } : {}}
        transition={isLowBalance ? { duration: 1.5, repeat: Infinity, ease: "easeInOut" } : {}}
      >
        <Button
          onClick={() => setIsShopOpen(true)}
          className={`gap-2 bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity ${className}`}
        >
          <Coins className="w-5 h-5" />
          <span className="font-semibold">Boutique</span>
          <ShoppingBag className="w-4 h-4 ml-1" />
        </Button>
      </motion.div>
      <CoinShopModal isOpen={isShopOpen} onClose={() => setIsShopOpen(false)} />
    </>
  );
};

export default ShopButton;
