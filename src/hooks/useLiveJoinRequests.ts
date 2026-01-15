import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCoins } from "@/hooks/useCoins";
import { toast } from "sonner";

const JOIN_REQUEST_COST = 50;
const STREAMER_SHARE = 0.7; // 70% to streamer
const PLATFORM_SHARE = 0.3; // 30% platform fee
const REQUEST_TIMEOUT = 60000; // 60 seconds

export interface JoinRequest {
  id: string;
  live_id: string;
  user_id: string;
  coins_spent: number;
  status: "pending" | "accepted" | "rejected" | "expired";
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
  const timeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

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

    // Set up timeouts for each request
    requestsWithProfiles.forEach((request) => {
      setupRequestTimeout(request);
    });
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

  // Setup timeout for a request
  const setupRequestTimeout = useCallback((request: JoinRequest) => {
    // Clear existing timeout if any
    const existingTimeout = timeoutsRef.current.get(request.id);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    const createdAt = new Date(request.created_at).getTime();
    const timeLeft = REQUEST_TIMEOUT - (Date.now() - createdAt);

    if (timeLeft > 0) {
      const timeout = setTimeout(async () => {
        // Auto-expire the request
        await handleExpireRequest(request.id, request.user_id, request.coins_spent);
      }, timeLeft);

      timeoutsRef.current.set(request.id, timeout);
    } else {
      // Already expired, handle it
      handleExpireRequest(request.id, request.user_id, request.coins_spent);
    }
  }, []);

  // Handle request expiration
  const handleExpireRequest = async (requestId: string, userId: string, coinsSpent: number) => {
    // Update request status
    await supabase
      .from("live_join_requests")
      .update({ status: "expired", responded_at: new Date().toISOString() })
      .eq("id", requestId);

    // Refund coins to user
    const { data: currentCoins } = await supabase
      .from("user_coins")
      .select("balance")
      .eq("user_id", userId)
      .single();

    if (currentCoins) {
      await supabase
        .from("user_coins")
        .update({ balance: currentCoins.balance + coinsSpent })
        .eq("user_id", userId);
    }

    // Remove from local state
    setRequests(prev => prev.filter(r => r.id !== requestId));
    timeoutsRef.current.delete(requestId);
  };

  // Send join request (viewer)
  const sendJoinRequest = async (): Promise<boolean> => {
    if (!user || !liveId || sendingRequest) return false;

    if (balance < JOIN_REQUEST_COST) {
      toast.error(`Solde insuffisant. Il vous faut ${JOIN_REQUEST_COST} coins.`);
      return false;
    }

    setSendingRequest(true);

    try {
      // Deduct coins first
      const coinSuccess = await spendCoins(JOIN_REQUEST_COST);
      if (!coinSuccess) {
        toast.error("Erreur lors du paiement");
        return false;
      }

      // Create the join request
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
        // Refund coins on error
        await addCoins(JOIN_REQUEST_COST);
        toast.error("Erreur lors de l'envoi de la demande");
        return false;
      }

      // Record transaction
      await supabase.from("coin_transactions").insert({
        user_id: user.id,
        amount: -JOIN_REQUEST_COST,
        type: "join_request",
        reference_id: data.id,
        description: "Demande de participation au live"
      });

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

  // Cancel my request (viewer)
  const cancelRequest = async (): Promise<boolean> => {
    if (!myRequest || !user) return false;

    try {
      // Update status
      const { error } = await supabase
        .from("live_join_requests")
        .update({ status: "rejected", responded_at: new Date().toISOString() })
        .eq("id", myRequest.id);

      if (error) throw error;

      // Refund coins
      await addCoins(myRequest.coins_spent);

      // Record refund transaction
      await supabase.from("coin_transactions").insert({
        user_id: user.id,
        amount: myRequest.coins_spent,
        type: "refund",
        reference_id: myRequest.id,
        description: "Annulation de demande de participation"
      });

      setMyRequest(null);
      toast.info("Demande annulée, coins remboursés");
      return true;
    } catch (error) {
      console.error("Error canceling request:", error);
      return false;
    }
  };

  // Accept request (streamer)
  const acceptRequest = async (request: JoinRequest): Promise<boolean> => {
    if (!user || !isStreamer) return false;

    try {
      // Update request status
      const { error } = await supabase
        .from("live_join_requests")
        .update({ status: "accepted", responded_at: new Date().toISOString() })
        .eq("id", request.id);

      if (error) throw error;

      // Calculate shares
      const streamerAmount = Math.floor(request.coins_spent * STREAMER_SHARE);
      const platformAmount = request.coins_spent - streamerAmount;

      // Add coins to streamer
      await addCoins(streamerAmount);

      // Record transactions
      await supabase.from("coin_transactions").insert([
        {
          user_id: user.id,
          amount: streamerAmount,
          type: "gift_received",
          reference_id: request.id,
          description: `Participation acceptée (${STREAMER_SHARE * 100}%)`
        }
      ]);

      // Clear timeout
      const timeout = timeoutsRef.current.get(request.id);
      if (timeout) {
        clearTimeout(timeout);
        timeoutsRef.current.delete(request.id);
      }

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

  // Reject request (streamer)
  const rejectRequest = async (request: JoinRequest): Promise<boolean> => {
    if (!user || !isStreamer) return false;

    try {
      // Update request status
      const { error } = await supabase
        .from("live_join_requests")
        .update({ status: "rejected", responded_at: new Date().toISOString() })
        .eq("id", request.id);

      if (error) throw error;

      // Refund coins to requester
      const { data: requesterCoins } = await supabase
        .from("user_coins")
        .select("balance")
        .eq("user_id", request.user_id)
        .single();

      if (requesterCoins) {
        await supabase
          .from("user_coins")
          .update({ balance: requesterCoins.balance + request.coins_spent })
          .eq("user_id", request.user_id);
      }

      // Clear timeout
      const timeout = timeoutsRef.current.get(request.id);
      if (timeout) {
        clearTimeout(timeout);
        timeoutsRef.current.delete(request.id);
      }

      // Remove from local state
      setRequests(prev => prev.filter(r => r.id !== request.id));

      toast.info("Demande refusée, coins remboursés");
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
            setupRequestTimeout(requestWithProfile);

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
                toast.success("🎉 Votre demande a été acceptée !");
                // Trigger stage join logic here if needed
              } else if (updated.status === "rejected") {
                setMyRequest(null);
                refetchCoins();
                toast.info("Demande refusée, coins remboursés");
              } else if (updated.status === "expired") {
                setMyRequest(null);
                refetchCoins();
                toast.info("Temps écoulé, coins remboursés");
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      // Clear all timeouts
      timeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
      timeoutsRef.current.clear();
    };
  }, [liveId, user, isStreamer, setupRequestTimeout, refetchCoins]);

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
