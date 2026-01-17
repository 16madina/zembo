import { Phone, PhoneOff, Video } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

interface IncomingCallBannerProps {
  isVisible: boolean;
  callerName: string;
  callerPhoto?: string;
  callType: "audio" | "video";
  onAccept: () => void;
  onReject: () => void;
}

export default function IncomingCallBanner({
  isVisible,
  callerName,
  callerPhoto,
  callType,
  onAccept,
  onReject,
}: IncomingCallBannerProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed top-0 left-0 right-0 z-[9999] p-2 safe-area-top"
        >
          <div className="mx-2 bg-gradient-to-r from-green-600 to-green-500 rounded-2xl shadow-2xl overflow-hidden">
            {/* Pulsing background effect */}
            <div className="absolute inset-0 bg-white/10 animate-pulse" />
            
            <div className="relative flex items-center justify-between p-3 gap-3">
              {/* Caller info */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="relative">
                  <Avatar className="h-12 w-12 border-2 border-white/30">
                    <AvatarImage src={callerPhoto} alt={callerName} />
                    <AvatarFallback className="bg-white/20 text-white font-semibold">
                      {callerName?.charAt(0)?.toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>
                  {/* Ringing indicator */}
                  <span className="absolute -top-1 -right-1 h-4 w-4 bg-white rounded-full flex items-center justify-center">
                    {callType === "video" ? (
                      <Video className="h-2.5 w-2.5 text-green-600" />
                    ) : (
                      <Phone className="h-2.5 w-2.5 text-green-600" />
                    )}
                  </span>
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold truncate">{callerName}</p>
                  <p className="text-white/80 text-sm flex items-center gap-1">
                    {callType === "video" ? (
                      <>
                        <Video className="h-3 w-3" />
                        Appel vidéo entrant...
                      </>
                    ) : (
                      <>
                        <Phone className="h-3 w-3" />
                        Appel vocal entrant...
                      </>
                    )}
                  </p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2">
                {/* Reject button */}
                <Button
                  onClick={onReject}
                  size="icon"
                  className="h-11 w-11 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-lg"
                >
                  <PhoneOff className="h-5 w-5" />
                </Button>
                
                {/* Accept button */}
                <Button
                  onClick={onAccept}
                  size="icon"
                  className="h-11 w-11 rounded-full bg-white hover:bg-white/90 text-green-600 shadow-lg animate-pulse"
                >
                  {callType === "video" ? (
                    <Video className="h-5 w-5" />
                  ) : (
                    <Phone className="h-5 w-5" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
