import { useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { useCoins } from "./useCoins";

export const useCoinPurchaseSuccess = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refetch } = useCoins();
  const hasHandled = useRef(false);

  useEffect(() => {
    const coinPurchase = searchParams.get("coin_purchase");
    
    if (coinPurchase === "success" && !hasHandled.current) {
      hasHandled.current = true;
      
      // Remove the query param
      searchParams.delete("coin_purchase");
      setSearchParams(searchParams, { replace: true });
      
      // Refetch coins to get updated balance
      refetch();
      
      // Show success feedback
      toast.success("🎉 Coins ajoutés à votre compte !", {
        description: "Votre achat a été effectué avec succès.",
        duration: 5000,
      });
      
      // Celebration confetti
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#FFD700", "#FFA500", "#FF6347", "#FFB6C1"],
      });
    } else if (coinPurchase === "cancelled" && !hasHandled.current) {
      hasHandled.current = true;
      
      // Remove the query param
      searchParams.delete("coin_purchase");
      setSearchParams(searchParams, { replace: true });
      
      toast.info("Achat annulé", {
        description: "Vous n'avez pas été débité.",
      });
    }
  }, [searchParams, setSearchParams, refetch]);
};
