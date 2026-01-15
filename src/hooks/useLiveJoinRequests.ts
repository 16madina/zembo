import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCoins } from "@/hooks/useCoins";
import { toast } from "sonner";

const JOIN_REQUEST_COST = 50;
const STREAMER_SHARE = 0.7; // 70% to streamer
const PLATFORM_SHARE = 0.3; // 30% platform fee

export interface JoinRequest {
  id: string;
  live_id: string;
  user_id: string;
  coins_spent: number;
  status: "pending" | "accepted" | "rejected";
  created_at: string;
  responded_at: string | null;
  profile?: {
    display_name: string | null;
    avatar_url: string | null;
  };
}

export const useLiveJoinRequests = (liveId: string, streamerId?: string) => {
  const { user } = useAuth();
  const { balance, spendCoins, addCoins, refetch: refetchCoins } = useCoins();
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [myRequest, setMyRequest] = useState<JoinRequest | null>(null);
  const [loading, setLoading] = useState(false);
  const [sendingRequest, setSendingRequest] = useState(false);

  const isStreamer = user?.id === streamerId;

  // Fetch pending requests (for streamer)
  const fetchRequests = useCallback(async () => {
    if (!liveId || !isStreamer) return;

    const { data, error } = await supabase
      .from("live_join_requests")
      .select("*")
      .eq("live_id", liveId)
      .eq("status", "pending")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching join requests:", error);
      return;
    }

    // Fetch profiles for each request
    const requestsWithProfiles = await Promise.all(
      (data || []).map(async (request) => {
        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name, avatar_url")
          .eq("user_id", request.user_id)
          .single();

        return { ...request, profile } as JoinRequest;
      })
    );

    setRequests(requestsWithProfiles);
  }, [liveId, isStreamer]);

  // Fetch my request (for viewer)
  const fetchMyRequest = useCallback(async () => {
    if (!liveId || !user || isStreamer) return;

    const { data, error } = await supabase
      .from("live_join_requests")
      .select("*")
      .eq("live_id", liveId)
      .eq("user_id", user.id)
      .eq("status", "pending")
      .maybeSingle();

    if (!error && data) {
      setMyRequest(data as JoinRequest);
    } else {
      setMyRequest(null);
    }
  }, [liveId, user, isStreamer]);

  // Send join request (viewer) - only verify coins, don't deduct
  const sendJoinRequest = async (): Promise<boolean> => {
    if (!user || !liveId || sendingRequest) return false;

    // Only verify the user has enough coins
    if (balance < JOIN_REQUEST_COST) {
      toast.error(`Solde insuffisant. Il vous faut ${JOIN_REQUEST_COST} coins.`);
      return false;
    }

    setSendingRequest(true);

    try {
      // Create the join request (no coin deduction yet)
      const { data, error } = await supabase
        .from("live_join_requests")
        .insert({
          live_id: liveId,
          user_id: user.id,
          coins_spent: JOIN_REQUEST_COST,
          status: "pending"
        })
        .select()
        .single();

      if (error) {
        toast.error("Erreur lors de l'envoi de la demande");
        return false;
      }

      setMyRequest(data as JoinRequest);
      toast.success("Demande envoyée ! En attente de réponse...");
      return true;
    } catch (error) {
      console.error("Error sending join request:", error);
      toast.error("Erreur lors de l'envoi de la demande");
      return false;
    } finally {
      setSendingRequest(false);
    }
  };

  // Cancel my request (viewer) - no refund needed since coins weren't deducted
  const cancelRequest = async (): Promise<boolean> => {
    if (!myRequest || !user) return false;

    try {
      // Simply delete the request
      const { error } = await supabase
        .from("live_join_requests")
        .delete()
        .eq("id", myRequest.id);

      if (error) throw error;

      setMyRequest(null);
      toast.info("Demande annulée");
      return true;
    } catch (error) {
      console.error("Error canceling request:", error);
      return false;
    }
  };

  // Accept request (streamer) - deduct coins from requester NOW
  const acceptRequest = async (request: JoinRequest): Promise<boolean> => {
    if (!user || !isStreamer) return false;

    try {
      // First, verify the requester still has enough coins
      const { data: requesterCoins } = await supabase
        .from("user_coins")
        .select("balance")
        .eq("user_id", request.user_id)
        .single();

      if (!requesterCoins || requesterCoins.balance < request.coins_spent) {
        // Requester no longer has enough coins, delete request
        await supabase
          .from("live_join_requests")
          .delete()
          .eq("id", request.id);

        setRequests(prev => prev.filter(r => r.id !== request.id));
        toast.error("L'utilisateur n'a plus assez de coins");
        return false;
      }

      // Deduct coins from requester
      await supabase
        .from("user_coins")
        .update({ 
          balance: requesterCoins.balance - request.coins_spent,
          total_spent: (requesterCoins as any).total_spent + request.coins_spent 
        })
        .eq("user_id", request.user_id);

      // Record transaction for requester
      await supabase.from("coin_transactions").insert({
        user_id: request.user_id,
        amount: -request.coins_spent,
        type: "join_request",
        reference_id: request.id,
        description: "Demande de participation au live acceptée"
      });

      // Update request status
      const { error } = await supabase
        .from("live_join_requests")
        .update({ status: "accepted", responded_at: new Date().toISOString() })
        .eq("id", request.id);

      if (error) throw error;

      // Calculate shares
      const streamerAmount = Math.floor(request.coins_spent * STREAMER_SHARE);

      // Add coins to streamer
      await addCoins(streamerAmount);

      // Record transaction for streamer
      await supabase.from("coin_transactions").insert({
        user_id: user.id,
        amount: streamerAmount,
        type: "gift_received",
        reference_id: request.id,
        description: `Participation acceptée (${STREAMER_SHARE * 100}%)`
      });

      // Remove from local state
      setRequests(prev => prev.filter(r => r.id !== request.id));

      toast.success(`${request.profile?.display_name || "Utilisateur"} rejoint le live !`);
      return true;
    } catch (error) {
      console.error("Error accepting request:", error);
      toast.error("Erreur lors de l'acceptation");
      return false;
    }
  };

  // Reject request (streamer) - just delete, no refund needed
  const rejectRequest = async (request: JoinRequest): Promise<boolean> => {
    if (!user || !isStreamer) return false;

    try {
      // Simply delete the request (no coins were deducted)
      const { error } = await supabase
        .from("live_join_requests")
        .delete()
        .eq("id", request.id);

      if (error) throw error;

      // Remove from local state
      setRequests(prev => prev.filter(r => r.id !== request.id));

      toast.info("Demande refusée");
      return true;
    } catch (error) {
      console.error("Error rejecting request:", error);
      toast.error("Erreur lors du refus");
      return false;
    }
  };

  // Real-time subscription
  useEffect(() => {
    if (!liveId || !user) return;

    const channel = supabase
      .channel(`join-requests-${liveId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "live_join_requests",
          filter: `live_id=eq.${liveId}`
        },
        async (payload) => {
          console.log("[join-requests] Realtime update:", payload);

          if (payload.eventType === "INSERT" && isStreamer) {
            // New request for streamer
            const newRequest = payload.new as JoinRequest;
            
            // Fetch profile
            const { data: profile } = await supabase
              .from("profiles")
              .select("display_name, avatar_url")
              .eq("user_id", newRequest.user_id)
              .single();

            const requestWithProfile = { ...newRequest, profile } as JoinRequest;
            setRequests(prev => [...prev, requestWithProfile]);

            toast.info(`${profile?.display_name || "Quelqu'un"} veut rejoindre le live !`);
          }

          if (payload.eventType === "UPDATE") {
            const updated = payload.new as JoinRequest;

            // Update local state
            setRequests(prev => prev.filter(r => r.id !== updated.id));

            // If this is my request, update it
            if (updated.user_id === user.id) {
              if (updated.status === "accepted") {
                setMyRequest(null);
                refetchCoins(); // Refresh coin balance after deduction
                toast.success("🎉 Votre demande a été acceptée !");
              } else if (updated.status === "rejected") {
                setMyRequest(null);
                toast.info("Demande refusée");
              }
            }
          }

          if (payload.eventType === "DELETE") {
            const deleted = payload.old as JoinRequest;

            // Remove from local state
            setRequests(prev => prev.filter(r => r.id !== deleted.id));

            // If this was my request
            if (deleted.user_id === user.id) {
              setMyRequest(null);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [liveId, user, isStreamer, refetchCoins]);

  // Initial fetch
  useEffect(() => {
    if (isStreamer) {
      fetchRequests();
    } else {
      fetchMyRequest();
    }
  }, [isStreamer, fetchRequests, fetchMyRequest]);

  return {
    requests,
    myRequest,
    loading,
    sendingRequest,
    balance,
    joinCost: JOIN_REQUEST_COST,
    sendJoinRequest,
    cancelRequest,
    acceptRequest,
    rejectRequest,
    isStreamer
  };
};
