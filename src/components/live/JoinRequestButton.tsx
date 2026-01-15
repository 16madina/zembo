import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Hand, Loader2, Coins, X, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useLiveJoinRequests } from "@/hooks/useLiveJoinRequests";
import CoinBalance from "./CoinBalance";

interface JoinRequestButtonProps {
  liveId: string;
  streamerId: string;
  onAccepted?: () => void;
}

const JoinRequestButton = ({ liveId, streamerId, onAccepted }: JoinRequestButtonProps) => {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const {
    myRequest,
    sendingRequest,
    balance,
    joinCost,
    sendJoinRequest,
    cancelRequest,
    isStreamer
  } = useLiveJoinRequests(liveId, streamerId);

  if (isStreamer) return null;

  const handleRequestClick = () => {
    if (myRequest) {
      // Already has pending request
      return;
    }
    setShowConfirmModal(true);
  };

  const handleConfirmRequest = async () => {
    const success = await sendJoinRequest();
    if (success) {
      setShowConfirmModal(false);
    }
  };

  const handleCancelRequest = async () => {
    await cancelRequest();
  };

  const canAfford = balance >= joinCost;

  return (
    <>
      <AnimatePresence mode="wait">
        {myRequest ? (
          <motion.div
            key="pending"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex flex-col items-center gap-2"
          >
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/20 border border-amber-500/50">
              <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
              <span className="text-sm text-amber-200">En attente de réponse...</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancelRequest}
              className="text-muted-foreground hover:text-destructive"
            >
              <X className="w-4 h-4 mr-1" />
              Annuler ma demande
            </Button>
          </motion.div>
        ) : (
          <motion.div
            key="request"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            <Button
              onClick={handleRequestClick}
              disabled={sendingRequest}
              className="gap-2 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90"
            >
              {sendingRequest ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Hand className="w-4 h-4" />
              )}
              Demander à rejoindre
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/20 text-xs">
                <Coins className="w-3 h-3" />
                {joinCost}
              </span>
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal */}
      <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Hand className="w-5 h-5 text-primary" />
              Rejoindre le live
            </DialogTitle>
            <DialogDescription>
              Envoyez une demande pour apparaître dans le live du streamer.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50">
              <span className="text-muted-foreground">Coût si accepté</span>
              <div className="flex items-center gap-2 text-lg font-bold text-primary">
                <Coins className="w-5 h-5" />
                {joinCost} coins
              </div>
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50">
              <span className="text-muted-foreground">Votre solde</span>
              <CoinBalance showBuyButton={false} compact />
            </div>

            {!canAfford && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm"
              >
                Solde insuffisant. Il vous manque {joinCost - balance} coins.
              </motion.div>
            )}

            <div className="p-3 rounded-lg bg-muted/30 text-sm text-muted-foreground">
              <p className="mb-2">
                <strong>Comment ça marche :</strong>
              </p>
              <ul className="space-y-1 list-disc list-inside">
                <li>L'hôte reçoit votre demande instantanément</li>
                <li>Les coins ne sont prélevés que si l'hôte accepte</li>
                <li>Vous pouvez annuler votre demande à tout moment</li>
                <li>Si refusé, aucun prélèvement</li>
              </ul>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowConfirmModal(false)}
            >
              Annuler
            </Button>
            <Button
              onClick={handleConfirmRequest}
              disabled={!canAfford || sendingRequest}
              className="gap-2"
            >
              {sendingRequest ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Hand className="w-4 h-4" />
              )}
              Envoyer la demande
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default JoinRequestButton;
