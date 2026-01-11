import { motion } from "framer-motion";
import { Crown, Sparkles, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PremiumRequiredProps {
  onUpgrade?: () => void;
}

const PremiumRequired = ({ onUpgrade }: PremiumRequiredProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-2xl p-6 text-center"
    >
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
        <Crown className="w-8 h-8 text-primary" />
      </div>
      
      <h3 className="text-lg font-bold text-foreground mb-2">
        Fonctionnalité Premium
      </h3>
      
      <p className="text-sm text-muted-foreground mb-4">
        Devenez Premium ou VIP pour lancer vos propres lives et partager des moments uniques avec votre communauté.
      </p>

      <div className="space-y-2 text-left mb-6">
        <div className="flex items-center gap-2 text-sm text-foreground/80">
          <Sparkles className="w-4 h-4 text-primary" />
          <span>Lancez des lives illimités</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-foreground/80">
          <Radio className="w-4 h-4 text-primary" />
          <span>Streaming vidéo HD</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-foreground/80">
          <Crown className="w-4 h-4 text-primary" />
          <span>Recevez des cadeaux virtuels</span>
        </div>
      </div>

      <Button className="w-full btn-gold" onClick={onUpgrade}>
        <Crown className="w-4 h-4 mr-2" />
        Passer Premium
      </Button>
    </motion.div>
  );
};

export default PremiumRequired;
