import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, Video, PhoneIncoming, PhoneOutgoing, PhoneMissed, Clock, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

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
  const [isExpanded, setIsExpanded] = useState(false);

  const fetchCallHistory = useCallback(async () => {
    if (!user?.id) return;

    try {
      // Fetch call sessions where user is caller or callee
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

      // Get unique other user IDs
      const otherUserIds = [...new Set(callsData.map(call => 
        call.caller_id === user.id ? call.callee_id : call.caller_id
      ))];

      // Fetch profiles for other users
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

  // Real-time subscription for new calls
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

  if (calls.length === 0) {
    return null;
  }

  const displayedCalls = isExpanded ? calls : calls.slice(0, 3);
  const missedCount = calls.filter(c => c.status === "missed" || c.status === "rejected").length;

  return (
    <motion.div
      className="px-4 md:px-8 mb-4"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full mb-3"
      >
        <div className="flex items-center gap-2">
          <Phone className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-medium text-muted-foreground">
            Historique des appels
          </h3>
          {missedCount > 0 && (
            <span className="px-1.5 py-0.5 text-xs font-medium bg-destructive text-destructive-foreground rounded-full">
              {missedCount} manqué{missedCount > 1 ? "s" : ""}
            </span>
          )}
        </div>
        <ChevronRight 
          className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`} 
        />
      </button>

      <AnimatePresence>
        <motion.div 
          className="space-y-2"
          initial={false}
        >
          {displayedCalls.map((call, index) => {
            const statusInfo = getCallStatusInfo(call);
            const StatusIcon = statusInfo.icon;
            const isMissed = call.status === "missed" || call.status === "rejected";

            return (
              <motion.div
                key={call.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`flex items-center gap-3 p-3 rounded-xl bg-card/50 backdrop-blur-sm border border-border/50 ${
                  isMissed ? "border-destructive/30" : ""
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
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onCallUser(call.otherUser.id, call.callType);
                      }}
                      className={`p-2 rounded-full ${
                        call.callType === "video" 
                          ? "bg-primary/10 text-primary hover:bg-primary/20" 
                          : "bg-success/10 text-success hover:bg-success/20"
                      } transition-colors`}
                    >
                      {call.callType === "video" ? (
                        <Video className="w-4 h-4" />
                      ) : (
                        <Phone className="w-4 h-4" />
                      )}
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </AnimatePresence>

      {calls.length > 3 && !isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          className="w-full mt-2 py-2 text-xs text-primary font-medium hover:underline"
        >
          Voir tout ({calls.length} appels)
        </button>
      )}
    </motion.div>
  );
};

export default CallHistorySection;
