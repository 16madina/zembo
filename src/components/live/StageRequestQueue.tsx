import { motion, AnimatePresence } from "framer-motion";
import { Check, X, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface StageRequest {
  id: string;
  user_id: string;
  status: string;
  profile?: {
    display_name: string | null;
    avatar_url: string | null;
  };
}

interface StageRequestQueueProps {
  isOpen: boolean;
  onClose: () => void;
  requests: StageRequest[];
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
}

const StageRequestQueue = ({
  isOpen,
  onClose,
  requests,
  onAccept,
  onReject,
}: StageRequestQueueProps) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          />

          {/* Panel */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 bg-background rounded-t-3xl z-50 max-h-[60vh]"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                <h2 className="font-semibold text-lg">File d'attente</h2>
                <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-xs font-medium">
                  {requests.length}
                </span>
              </div>
              <Button size="icon" variant="ghost" onClick={onClose}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Content */}
            <ScrollArea className="max-h-[calc(60vh-80px)]">
              <div className="p-4 space-y-3">
                {requests.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Aucune demande en attente</p>
                  </div>
                ) : (
                  requests.map((request) => (
                    <motion.div
                      key={request.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -100 }}
                      className="flex items-center justify-between p-3 bg-card rounded-xl border border-border"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10 border border-border">
                          <AvatarImage
                            src={
                              request.profile?.avatar_url ||
                              `https://api.dicebear.com/7.x/avataaars/svg?seed=${request.user_id}`
                            }
                          />
                          <AvatarFallback>
                            {request.profile?.display_name?.[0] || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-foreground">
                            {request.profile?.display_name || "Anonyme"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Veut monter sur scène
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => onReject(request.id)}
                          className="w-9 h-9 text-destructive hover:bg-destructive/10"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          onClick={() => onAccept(request.id)}
                          className="w-9 h-9 bg-primary text-primary-foreground"
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </ScrollArea>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default StageRequestQueue;
