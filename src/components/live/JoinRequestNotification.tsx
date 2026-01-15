import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, Coins, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { JoinRequest } from "@/hooks/useLiveJoinRequests";

interface JoinRequestNotificationProps {
  request: JoinRequest;
  onAccept: (request: JoinRequest) => Promise<boolean>;
  onReject: (request: JoinRequest) => Promise<boolean>;
}

const JoinRequestNotification = ({
  request,
  onAccept,
  onReject
}: JoinRequestNotificationProps) => {
  const [processing, setProcessing] = useState(false);

  const handleAccept = async () => {
    setProcessing(true);
    await onAccept(request);
    setProcessing(false);
  };

  const handleReject = async () => {
    setProcessing(true);
    await onReject(request);
    setProcessing(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 100, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.9 }}
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-card to-card/80 border border-border/50 shadow-xl"
    >
      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Demande de participation
          </span>
        </div>

        {/* User info */}
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12 border-2 border-primary/30">
            <AvatarImage src={request.profile?.avatar_url || undefined} />
            <AvatarFallback className="bg-primary/20">
              <User className="w-5 h-5 text-primary" />
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground truncate">
              {request.profile?.display_name || "Utilisateur"}
            </p>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              veut rejoindre
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-primary/20 text-primary text-xs font-medium">
                <Coins className="w-3 h-3" />
                {request.coins_spent}
              </span>
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReject}
            disabled={processing}
            className="flex-1 border-destructive/30 text-destructive hover:bg-destructive/10"
          >
            <X className="w-4 h-4 mr-1" />
            Refuser
          </Button>
          <Button
            size="sm"
            onClick={handleAccept}
            disabled={processing}
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
            <Check className="w-4 h-4 mr-1" />
            Accepter
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

interface JoinRequestQueueProps {
  liveId: string;
  streamerId: string;
  requests: JoinRequest[];
  onAccept: (request: JoinRequest) => Promise<boolean>;
  onReject: (request: JoinRequest) => Promise<boolean>;
}

export const JoinRequestQueue = ({
  liveId,
  streamerId,
  requests,
  onAccept,
  onReject
}: JoinRequestQueueProps) => {
  return (
    <div className="fixed top-20 right-4 z-50 w-72 space-y-3">
      <AnimatePresence mode="popLayout">
        {requests.map((request) => (
          <JoinRequestNotification
            key={request.id}
            request={request}
            onAccept={onAccept}
            onReject={onReject}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};

export default JoinRequestNotification;
