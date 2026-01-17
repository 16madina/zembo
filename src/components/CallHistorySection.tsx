import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, Video, PhoneIncoming, PhoneOutgoing, PhoneMissed, Clock, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

interface CallHistoryItem {
  id: string;
  callerId: string;
  calleeId: string;
  callType: "audio" | "video";
  status: string;
  createdAt: string;
  duration: number | null;
  otherUser: {
    id: string;
    name: string;
    photo: string;
  };
  direction: "incoming" | "outgoing";
}

interface CallHistorySectionProps {
  onCallUser?: (userId: string, callType: "audio" | "video") => void;
}

const CallHistorySection = ({ onCallUser }: CallHistorySectionProps) => {
  const { user } = useAuth();
  const [calls, setCalls] = useState<CallHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  const fetchCallHistory = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data: callsData, error } = await supabase
        .from("call_sessions")
        .select("*")
        .or(`caller_id.eq.${user.id},callee_id.eq.${user.id}`)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) {
        console.error("Error fetching call history:", error);
        return;
      }

      if (!callsData || callsData.length === 0) {
        setCalls([]);
        setIsLoading(false);
        return;
      }

      const otherUserIds = [...new Set(callsData.map(call => 
        call.caller_id === user.id ? call.callee_id : call.caller_id
      ))];

      const { data: profilesData } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", otherUserIds);

      const profilesMap = new Map(
        profilesData?.map(p => [p.user_id, p]) || []
      );

      const formattedCalls: CallHistoryItem[] = callsData.map(call => {
        const isOutgoing = call.caller_id === user.id;
        const otherUserId = isOutgoing ? call.callee_id : call.caller_id;
        const profile = profilesMap.get(otherUserId);

        return {
          id: call.id,
          callerId: call.caller_id,
          calleeId: call.callee_id,
          callType: call.call_type as "audio" | "video",
          status: call.status,
          createdAt: call.created_at,
          duration: call.duration_seconds,
          direction: isOutgoing ? "outgoing" : "incoming",
          otherUser: {
            id: otherUserId,
            name: profile?.display_name || "Utilisateur",
            photo: profile?.avatar_url || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop",
          },
        };
      });

      setCalls(formattedCalls);
    } catch (error) {
      console.error("Error in fetchCallHistory:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchCallHistory();
  }, [fetchCallHistory]);

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel("call-history-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "call_sessions",
          filter: `caller_id=eq.${user.id}`,
        },
        () => fetchCallHistory()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "call_sessions",
          filter: `callee_id=eq.${user.id}`,
        },
        () => fetchCallHistory()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, fetchCallHistory]);

  const getCallStatusInfo = (call: CallHistoryItem) => {
    const isMissed = call.status === "missed" || call.status === "rejected";
    const isEnded = call.status === "ended";
    
    if (isMissed) {
      return {
        icon: PhoneMissed,
        color: "text-destructive",
        label: call.direction === "incoming" ? "Manqué" : "Non répondu",
      };
    }
    
    if (call.direction === "outgoing") {
      return {
        icon: PhoneOutgoing,
        color: isEnded ? "text-success" : "text-muted-foreground",
        label: "Sortant",
      };
    }
    
    return {
      icon: PhoneIncoming,
      color: isEnded ? "text-success" : "text-muted-foreground",
      label: "Entrant",
    };
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return null;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatTime = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true, locale: fr });
    } catch {
      return "";
    }
  };

  if (isLoading) {
    return null;
  }

  const missedCount = calls.filter(c => 
    (c.status === "missed" || c.status === "rejected") && c.direction === "incoming"
  ).length;

  // Don't show anything if no calls
  if (calls.length === 0) {
    return null;
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <motion.button
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mx-4 md:mx-8 mb-4 flex items-center gap-2 px-4 py-2.5 rounded-full bg-card border border-border shadow-sm hover:bg-accent/50 transition-colors"
        >
          <Phone className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-foreground">Appels</span>
          {missedCount > 0 && (
            <span className="flex items-center justify-center min-w-5 h-5 px-1.5 text-xs font-bold bg-destructive text-destructive-foreground rounded-full animate-pulse">
              {missedCount}
            </span>
          )}
        </motion.button>
      </SheetTrigger>

      <SheetContent side="bottom" className="h-[70vh] rounded-t-3xl">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2">
            <Phone className="w-5 h-5 text-primary" />
            Historique des appels
            {missedCount > 0 && (
              <span className="px-2 py-0.5 text-xs font-medium bg-destructive text-destructive-foreground rounded-full">
                {missedCount} manqué{missedCount > 1 ? "s" : ""}
              </span>
            )}
          </SheetTitle>
        </SheetHeader>

        <div className="overflow-y-auto h-full pb-8 space-y-2">
          <AnimatePresence>
            {calls.map((call, index) => {
              const statusInfo = getCallStatusInfo(call);
              const StatusIcon = statusInfo.icon;
              const isMissed = call.status === "missed" || call.status === "rejected";

              return (
                <motion.div
                  key={call.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className={`flex items-center gap-3 p-3 rounded-xl bg-muted/50 ${
                    isMissed ? "border border-destructive/30" : ""
                  }`}
                >
                  {/* Avatar */}
                  <div className="relative">
                    <img
                      src={call.otherUser.photo}
                      alt={call.otherUser.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    <div className={`absolute -bottom-1 -right-1 p-1 rounded-full bg-background ${statusInfo.color}`}>
                      {call.callType === "video" ? (
                        <Video className="w-3 h-3" />
                      ) : (
                        <Phone className="w-3 h-3" />
                      )}
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`font-medium truncate ${isMissed ? "text-destructive" : "text-foreground"}`}>
                        {call.otherUser.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <StatusIcon className={`w-3 h-3 ${statusInfo.color}`} />
                      <span className={statusInfo.color}>{statusInfo.label}</span>
                      {call.duration && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDuration(call.duration)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Time & Action */}
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-xs text-muted-foreground">
                      {formatTime(call.createdAt)}
                    </span>
                    {onCallUser && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsOpen(false);
                          onCallUser(call.otherUser.id, call.callType);
                        }}
                        className={`h-8 w-8 p-0 rounded-full ${
                          call.callType === "video" 
                            ? "text-primary hover:bg-primary/10" 
                            : "text-success hover:bg-success/10"
                        }`}
                      >
                        {call.callType === "video" ? (
                          <Video className="w-4 h-4" />
                        ) : (
                          <Phone className="w-4 h-4" />
                        )}
                      </Button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default CallHistorySection;
