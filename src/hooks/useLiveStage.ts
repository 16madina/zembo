import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface StageRequest {
  id: string;
  live_id: string;
  user_id: string;
  status: "pending" | "accepted" | "rejected" | "on_stage" | "ended";
  created_at: string;
  accepted_at: string | null;
  ended_at: string | null;
  profile?: {
    display_name: string | null;
    avatar_url: string | null;
  };
}

interface UseLiveStageProps {
  liveId: string;
  streamerId: string;
  isStreamer: boolean;
}

export const useLiveStage = ({ liveId, streamerId, isStreamer }: UseLiveStageProps) => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<StageRequest[]>([]);
  const [currentGuest, setCurrentGuest] = useState<StageRequest | null>(null);
  const [myRequest, setMyRequest] = useState<StageRequest | null>(null);
  const [isOnStage, setIsOnStage] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // WebRTC state
  const [guestStream, setGuestStream] = useState<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const guestVideoRef = useRef<HTMLVideoElement | null>(null);

  // Fetch initial requests
  useEffect(() => {
    const fetchRequests = async () => {
      const { data, error } = await supabase
        .from("live_stage_requests")
        .select("*")
        .eq("live_id", liveId)
        .in("status", ["pending", "accepted", "on_stage"]);

      if (error) {
        console.error("Error fetching stage requests:", error);
        return;
      }

      if (data && data.length > 0) {
        // Fetch profiles for all requesters
        const userIds = [...new Set(data.map((r) => r.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, display_name, avatar_url")
          .in("user_id", userIds);

        const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);

        const requestsWithProfiles: StageRequest[] = data.map((r) => ({
          ...r,
          status: r.status as StageRequest["status"],
          profile: profileMap.get(r.user_id) || { display_name: null, avatar_url: null },
        }));

        setRequests(requestsWithProfiles.filter((r) => r.status === "pending"));
        
        const onStage = requestsWithProfiles.find((r) => r.status === "on_stage");
        if (onStage) {
          setCurrentGuest(onStage);
          if (onStage.user_id === user?.id) {
            setIsOnStage(true);
          }
        }

        const mine = requestsWithProfiles.find((r) => r.user_id === user?.id);
        if (mine) {
          setMyRequest(mine);
        }
      }
    };

    fetchRequests();
  }, [liveId, user?.id]);

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel(`live-stage-${liveId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "live_stage_requests",
          filter: `live_id=eq.${liveId}`,
        },
        async (payload) => {
          if (payload.eventType === "INSERT") {
            const newRequest = payload.new as StageRequest;
            
            // Fetch profile for new request
            const { data: profile } = await supabase
              .from("profiles")
              .select("display_name, avatar_url")
              .eq("user_id", newRequest.user_id)
              .maybeSingle();

            const requestWithProfile: StageRequest = {
              ...newRequest,
              status: newRequest.status as StageRequest["status"],
              profile: profile || { display_name: null, avatar_url: null },
            };

            if (newRequest.user_id === user?.id) {
              setMyRequest(requestWithProfile);
            }

            if (newRequest.status === "pending") {
              setRequests((prev) => [...prev, requestWithProfile]);
              if (isStreamer) {
                toast.info(`${profile?.display_name || "Quelqu'un"} veut monter sur scène !`);
              }
            }
          } else if (payload.eventType === "UPDATE") {
            const updated = payload.new as StageRequest;
            
            // Fetch profile
            const { data: profile } = await supabase
              .from("profiles")
              .select("display_name, avatar_url")
              .eq("user_id", updated.user_id)
              .maybeSingle();

            const updatedWithProfile: StageRequest = {
              ...updated,
              status: updated.status as StageRequest["status"],
              profile: profile || { display_name: null, avatar_url: null },
            };

            if (updated.user_id === user?.id) {
              setMyRequest(updatedWithProfile);
              
              if (updated.status === "on_stage") {
                setIsOnStage(true);
                toast.success("🎉 Vous êtes sur scène !");
              } else if (updated.status === "rejected") {
                toast.info("Votre demande a été refusée");
              } else if (updated.status === "ended") {
                setIsOnStage(false);
                toast.info("Vous avez quitté la scène");
              }
            }

            if (updated.status === "on_stage") {
              setCurrentGuest(updatedWithProfile);
              setRequests((prev) => prev.filter((r) => r.id !== updated.id));
            } else if (updated.status === "rejected" || updated.status === "ended") {
              setRequests((prev) => prev.filter((r) => r.id !== updated.id));
              if (currentGuest?.id === updated.id) {
                setCurrentGuest(null);
              }
            } else {
              setRequests((prev) =>
                prev.map((r) => (r.id === updated.id ? updatedWithProfile : r))
              );
            }
          } else if (payload.eventType === "DELETE") {
            const deleted = payload.old as { id: string; user_id: string };
            setRequests((prev) => prev.filter((r) => r.id !== deleted.id));
            if (currentGuest?.id === deleted.id) {
              setCurrentGuest(null);
            }
            if (deleted.user_id === user?.id) {
              setMyRequest(null);
              setIsOnStage(false);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [liveId, user?.id, isStreamer, currentGuest?.id]);

  // Request to join stage
  const requestStage = useCallback(async () => {
    if (!user || myRequest) return;

    setIsLoading(true);
    const { error } = await supabase.from("live_stage_requests").insert({
      live_id: liveId,
      user_id: user.id,
    });

    setIsLoading(false);

    if (error) {
      toast.error("Erreur lors de la demande");
      return;
    }

    toast.success("Demande envoyée !");
  }, [liveId, user, myRequest]);

  // Cancel request
  const cancelRequest = useCallback(async () => {
    if (!myRequest) return;

    const { error } = await supabase
      .from("live_stage_requests")
      .delete()
      .eq("id", myRequest.id);

    if (error) {
      toast.error("Erreur lors de l'annulation");
      return;
    }

    setMyRequest(null);
  }, [myRequest]);

  // Accept request (streamer only)
  const acceptRequest = useCallback(async (requestId: string) => {
    if (!isStreamer) return;

    // First, end any current guest
    if (currentGuest) {
      await supabase
        .from("live_stage_requests")
        .update({ status: "ended", ended_at: new Date().toISOString() })
        .eq("id", currentGuest.id);
    }

    const { error } = await supabase
      .from("live_stage_requests")
      .update({
        status: "on_stage",
        accepted_at: new Date().toISOString(),
      })
      .eq("id", requestId);

    if (error) {
      toast.error("Erreur lors de l'acceptation");
      return;
    }

    toast.success("Invité accepté !");
  }, [isStreamer, currentGuest]);

  // Reject request (streamer only)
  const rejectRequest = useCallback(async (requestId: string) => {
    if (!isStreamer) return;

    const { error } = await supabase
      .from("live_stage_requests")
      .update({ status: "rejected" })
      .eq("id", requestId);

    if (error) {
      toast.error("Erreur lors du refus");
    }
  }, [isStreamer]);

  // Remove guest from stage (streamer only)
  const removeFromStage = useCallback(async () => {
    if (!isStreamer || !currentGuest) return;

    const { error } = await supabase
      .from("live_stage_requests")
      .update({ status: "ended", ended_at: new Date().toISOString() })
      .eq("id", currentGuest.id);

    if (error) {
      toast.error("Erreur lors du retrait");
      return;
    }

    setCurrentGuest(null);
    toast.success("Invité retiré de la scène");
  }, [isStreamer, currentGuest]);

  // Leave stage voluntarily (guest only)
  const leaveStage = useCallback(async () => {
    if (!myRequest || myRequest.status !== "on_stage") return;

    const { error } = await supabase
      .from("live_stage_requests")
      .update({ status: "ended", ended_at: new Date().toISOString() })
      .eq("id", myRequest.id);

    if (error) {
      toast.error("Erreur lors de la sortie");
      return;
    }

    setIsOnStage(false);
    setMyRequest(null);
  }, [myRequest]);

  // Set guest video ref
  const setGuestVideoRef = useCallback((ref: HTMLVideoElement | null) => {
    guestVideoRef.current = ref;
    if (ref && guestStream) {
      ref.srcObject = guestStream;
    }
  }, [guestStream]);

  return {
    requests,
    currentGuest,
    myRequest,
    isOnStage,
    isLoading,
    guestStream,
    requestStage,
    cancelRequest,
    acceptRequest,
    rejectRequest,
    removeFromStage,
    leaveStage,
    setGuestVideoRef,
  };
};
