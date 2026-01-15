import React, { useState } from "react";
import { motion } from "framer-motion";
import { Coins, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCoins } from "@/hooks/useCoins";
import CoinShopModal from "./CoinShopModal";

interface ShopButtonProps {
  variant?: "icon" | "full" | "compact";
  className?: string;
}

const ShopButton = ({ variant = "full", className = "" }: ShopButtonProps) => {
  const [isShopOpen, setIsShopOpen] = useState(false);
  const { balance, loading } = useCoins();

  if (variant === "icon") {
    return (
      <>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsShopOpen(true)}
          className={`relative ${className}`}
        >
          <ShoppingBag className="w-5 h-5" />
        </Button>
        <CoinShopModal isOpen={isShopOpen} onClose={() => setIsShopOpen(false)} />
      </>
    );
  }

  if (variant === "compact") {
    return (
      <>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsShopOpen(true)}
          className={`gap-2 ${className}`}
        >
          <Coins className="w-4 h-4 text-primary" />
          <motion.span
            key={balance}
            initial={{ scale: 1.2 }}
            animate={{ scale: 1 }}
            className="font-semibold"
          >
            {loading ? "..." : balance}
          </motion.span>
        </Button>
        <CoinShopModal isOpen={isShopOpen} onClose={() => setIsShopOpen(false)} />
      </>
    );
  }

  return (
    <>
      <Button
        onClick={() => setIsShopOpen(true)}
        className={`gap-2 bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity ${className}`}
      >
        <Coins className="w-5 h-5" />
        <span className="font-semibold">{loading ? "..." : balance} coins</span>
        <ShoppingBag className="w-4 h-4 ml-1" />
      </Button>
      <CoinShopModal isOpen={isShopOpen} onClose={() => setIsShopOpen(false)} />
    </>
  );
};

export default ShopButton;
