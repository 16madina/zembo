import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

export type Live = Tables<"lives"> & {
  streamer?: {
    display_name: string | null;
    avatar_url: string | null;
  };
};

export const useLives = () => {
  const { user } = useAuth();
  const [lives, setLives] = useState<Live[]>([]);
  const [loading, setLoading] = useState(true);
  const [canGoLive, setCanGoLive] = useState(false);

  // Fetch active lives
  const fetchLives = async () => {
    setLoading(true);
    const { data: livesData, error } = await supabase
      .from("lives")
      .select("*")
      .eq("status", "live")
      .order("viewer_count", { ascending: false });

    if (!error && livesData) {
      // Fetch streamer profiles separately
      const streamerIds = [...new Set(livesData.map((l) => l.streamer_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", streamerIds);

      const profileMap = new Map(
        profiles?.map((p) => [p.user_id, p]) || []
      );

      const mappedLives = livesData.map((live) => ({
        ...live,
        streamer: profileMap.get(live.streamer_id) || {
          display_name: null,
          avatar_url: null,
        },
      }));
      setLives(mappedLives);
    }
    setLoading(false);
  };

  // Check if user can go live (premium/vip subscription)
  const checkCanGoLive = async () => {
    if (!user) {
      setCanGoLive(false);
      return;
    }

    const { data, error } = await supabase.rpc("can_go_live", {
      p_user_id: user.id,
    });

    if (!error) {
      setCanGoLive(data ?? false);
    }
  };

  // Create a new live
  const createLive = async (
    title: string,
    description?: string,
    tags?: string[],
    thumbnailUrl?: string
  ): Promise<{ data: Tables<"lives"> | null; error: Error | null }> => {
    if (!user) {
      return { data: null, error: new Error("Not authenticated") };
    }

    // Generate unique room name for LiveKit
    const roomName = `live_${user.id}_${Date.now()}`;

    const liveData: TablesInsert<"lives"> = {
      streamer_id: user.id,
      title,
      description,
      tags,
      status: "live",
      started_at: new Date().toISOString(),
      livekit_room_name: roomName,
      thumbnail_url: thumbnailUrl,
    };

    const { data, error } = await supabase
      .from("lives")
      .insert(liveData)
      .select()
      .single();

    if (!error) {
      fetchLives();
    }

    return { data, error };
  };

  // End a live
  const endLive = async (liveId: string): Promise<{ error: Error | null }> => {
    const { error } = await supabase
      .from("lives")
      .update({
        status: "ended",
        ended_at: new Date().toISOString(),
      })
      .eq("id", liveId);

    if (!error) {
      fetchLives();
    }

    return { error };
  };

  // Update viewer count
  const updateViewerCount = async (
    liveId: string,
    increment: boolean
  ): Promise<void> => {
    const { data: live } = await supabase
      .from("lives")
      .select("viewer_count, max_viewers")
      .eq("id", liveId)
      .single();

    if (live) {
      const newCount = increment
        ? live.viewer_count + 1
        : Math.max(0, live.viewer_count - 1);
      const newMax = Math.max(live.max_viewers, newCount);

      await supabase
        .from("lives")
        .update({
          viewer_count: newCount,
          max_viewers: newMax,
        })
        .eq("id", liveId);
    }
  };

  // Subscribe to live changes
  useEffect(() => {
    fetchLives();
    checkCanGoLive();

    const channel = supabase
      .channel("lives-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "lives",
        },
        () => {
          fetchLives();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return {
    lives,
    loading,
    canGoLive,
    fetchLives,
    createLive,
    endLive,
    updateViewerCount,
    checkCanGoLive,
  };
};
