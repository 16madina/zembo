import React from "react";
import { motion } from "framer-motion";
import { CreditCard } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export type PaymentMethod = "card" | "wave" | "orange";

// Wave logo - Official cyan wave design
const WaveLogo = () => (
  <svg viewBox="0 0 40 40" className="w-7 h-7">
    <defs>
      <linearGradient id="waveGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#1DC1ED" />
        <stop offset="100%" stopColor="#0EA5E9" />
      </linearGradient>
    </defs>
    <circle cx="20" cy="20" r="18" fill="url(#waveGradient)" />
    <path
      d="M10 20 Q15 14, 20 20 T30 20"
      stroke="white"
      strokeWidth="3"
      fill="none"
      strokeLinecap="round"
    />
    <path
      d="M10 26 Q15 20, 20 26 T30 26"
      stroke="white"
      strokeWidth="2.5"
      fill="none"
      strokeLinecap="round"
      opacity="0.8"
    />
  </svg>
);

// Orange Money logo - Official orange square with Orange text styling
const OrangeMoneyLogo = () => (
  <svg viewBox="0 0 40 40" className="w-7 h-7">
    <defs>
      <linearGradient id="orangeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FF7900" />
        <stop offset="100%" stopColor="#F97316" />
      </linearGradient>
    </defs>
    <rect x="2" y="2" width="36" height="36" rx="8" fill="url(#orangeGradient)" />
    <text
      x="20"
      y="26"
      textAnchor="middle"
      fill="white"
      fontWeight="bold"
      fontSize="16"
      fontFamily="Arial, sans-serif"
    >
      O
    </text>
    <text
      x="20"
      y="35"
      textAnchor="middle"
      fill="white"
      fontWeight="bold"
      fontSize="7"
      fontFamily="Arial, sans-serif"
    >
      money
    </text>
  </svg>
);

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
    icon: <WaveLogo />,
    color: "from-cyan-400 to-sky-500",
    available: false, // À implémenter
  },
  {
    id: "orange",
    name: "Orange Money",
    description: "Paiement mobile Orange",
    icon: <OrangeMoneyLogo />,
    color: "from-orange-500 to-orange-600",
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
