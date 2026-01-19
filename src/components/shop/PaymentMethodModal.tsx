import React from "react";
import { motion } from "framer-motion";
import { CreditCard, Smartphone, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export type PaymentMethod = "card" | "wave" | "orange";

interface PaymentMethodOption {
  id: PaymentMethod;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  available: boolean;
}

const paymentMethods: PaymentMethodOption[] = [
  {
    id: "card",
    name: "Carte bancaire",
    description: "Visa, Mastercard, etc.",
    icon: <CreditCard className="w-6 h-6" />,
    color: "from-blue-500 to-indigo-600",
    available: true,
  },
  {
    id: "wave",
    name: "Wave",
    description: "Paiement mobile Wave",
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h-2v-6h2v6zm4 0h-2v-6h2v6zm-2-8c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z"/>
      </svg>
    ),
    color: "from-cyan-400 to-blue-500",
    available: false, // À implémenter
  },
  {
    id: "orange",
    name: "Orange Money",
    description: "Paiement mobile Orange",
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
        <circle cx="12" cy="12" r="10"/>
      </svg>
    ),
    color: "from-orange-400 to-orange-600",
    available: false, // À implémenter
  },
];

interface PaymentMethodModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (method: PaymentMethod) => void;
  packName: string;
  price: string;
}

const PaymentMethodModal = ({ 
  isOpen, 
  onClose, 
  onSelect, 
  packName,
  price 
}: PaymentMethodModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm bg-gradient-to-b from-background to-background/95 border-primary/20">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-xl font-bold text-center">
            Choisir le paiement
          </DialogTitle>
          <p className="text-center text-muted-foreground text-sm">
            {packName} • <span className="text-primary font-semibold">{price}</span>
          </p>
        </DialogHeader>

        <div className="space-y-3 mt-4">
          {paymentMethods.map((method, index) => (
            <motion.div
              key={method.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Button
                variant="outline"
                disabled={!method.available}
                onClick={() => method.available && onSelect(method.id)}
                className={`
                  w-full h-auto py-4 px-4 flex items-center gap-4
                  border-2 transition-all duration-200
                  ${method.available 
                    ? 'hover:border-primary/50 hover:bg-primary/5' 
                    : 'opacity-50 cursor-not-allowed'
                  }
                `}
              >
                {/* Icon with gradient background */}
                <div className={`
                  w-12 h-12 rounded-xl flex items-center justify-center
                  bg-gradient-to-br ${method.color} text-white
                  shadow-lg
                `}>
                  {method.icon}
                </div>

                {/* Text */}
                <div className="flex-1 text-left">
                  <p className="font-semibold text-foreground">
                    {method.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {method.available ? method.description : "Bientôt disponible"}
                  </p>
                </div>

                {/* Coming soon badge */}
                {!method.available && (
                  <span className="text-xs bg-muted px-2 py-1 rounded-full text-muted-foreground">
                    Bientôt
                  </span>
                )}
              </Button>
            </motion.div>
          ))}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          🔒 Paiement sécurisé
        </p>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentMethodModal;
