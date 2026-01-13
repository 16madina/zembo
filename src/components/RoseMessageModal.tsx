import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface RoseMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (message: string) => void;
  recipientName: string;
  isLoading?: boolean;
}

/**
 * Detects if a message contains phone numbers, emails, or other contact info
 */
function detectContactInfo(text: string): { hasContact: boolean; type: string | null } {
  if (!text) return { hasContact: false, type: null };
  
  // Phone number patterns
  const phonePatterns = [
    /\+?\d{1,4}[\s.-]?\(?\d{1,4}\)?[\s.-]?\d{1,4}[\s.-]?\d{1,9}/,
    /(?:0|\+33|0033)[\s.-]?[1-9](?:[\s.-]?\d{2}){4}/,
    /\d[\d\s.-]{5,}\d/,
  ];
  
  for (const pattern of phonePatterns) {
    if (pattern.test(text)) {
      return { hasContact: true, type: "numéro de téléphone" };
    }
  }
  
  // Email pattern
  if (/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(text)) {
    return { hasContact: true, type: "adresse email" };
  }
  
  // URL patterns
  if (/https?:\/\/[^\s]+/.test(text) || /www\.[^\s]+/.test(text)) {
    return { hasContact: true, type: "lien" };
  }
  
  // Social media handles
  if (/@[a-zA-Z0-9._]{3,}/.test(text)) {
    return { hasContact: true, type: "pseudo de réseau social" };
  }
  
  // Social media mentions (insta:, snap:, etc.)
  if (/(?:insta(?:gram)?|snap(?:chat)?|whatsapp|telegram|tiktok|facebook|fb|twitter|discord)[\s:]+[a-zA-Z0-9._@-]+/i.test(text)) {
    return { hasContact: true, type: "contact de réseau social" };
  }
  
  return { hasContact: false, type: null };
}

const RoseMessageModal = ({
  isOpen,
  onClose,
  onSend,
  recipientName,
  isLoading = false,
}: RoseMessageModalProps) => {
  const [message, setMessage] = useState("");
  const maxLength = 150;

  // Check for contact info in real-time
  const contactDetection = useMemo(() => detectContactInfo(message), [message]);

  const handleSend = () => {
    // Block sending if contact info detected
    if (contactDetection.hasContact) return;
    
    onSend(message.trim() || "Une rose pour toi 🌹");
    setMessage("");
  };

  const handleClose = () => {
    setMessage("");
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-sm bg-gradient-to-br from-rose-950/90 via-background/95 to-background/90 backdrop-blur-xl rounded-3xl p-6 border border-rose-500/30 shadow-2xl"
          >
            {/* Close Button */}
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            >
              <X className="w-4 h-4 text-white" />
            </button>

            {/* Header */}
            <div className="text-center mb-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1, rotate: [0, -10, 10, 0] }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="text-5xl mb-3"
              >
                🌹
              </motion.div>
              <h2 className="text-xl font-bold text-white mb-1">
                Offrir une rose à {recipientName}
              </h2>
              <p className="text-sm text-rose-200/80">
                Écrivez un message pour accompagner votre rose
              </p>
            </div>

            {/* Message Input */}
            <div className="relative mb-2">
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, maxLength))}
                placeholder="Ton sourire m'a captivé... 💕"
                className={`min-h-[100px] bg-white/10 border-rose-400/30 text-white placeholder:text-rose-200/50 resize-none rounded-xl focus:ring-rose-400/30 ${
                  contactDetection.hasContact 
                    ? "border-red-500 focus:border-red-500" 
                    : "focus:border-rose-400"
                }`}
                disabled={isLoading}
              />
              <span className="absolute bottom-2 right-3 text-xs text-rose-200/60">
                {message.length}/{maxLength}
              </span>
            </div>

            {/* Contact Info Warning */}
            <AnimatePresence>
              {contactDetection.hasContact && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-3"
                >
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/20 border border-red-500/30">
                    <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                    <p className="text-xs text-red-200">
                      Les {contactDetection.type}s ne sont pas autorisés. Matchez d'abord pour discuter ! 😊
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Cost Info */}
            <div className="flex items-center justify-center gap-2 mb-4 text-sm text-rose-200/80">
              <span className="text-lg">🪙</span>
              <span>10 coins</span>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleClose}
                className="flex-1 border-rose-400/30 text-rose-200 hover:bg-rose-500/20"
                disabled={isLoading}
              >
                Annuler
              </Button>
              <Button
                onClick={handleSend}
                disabled={isLoading || contactDetection.hasContact}
                className="flex-1 bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white gap-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                  />
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Envoyer
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default RoseMessageModal;
