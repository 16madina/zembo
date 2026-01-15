import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

export interface ReactionSummary {
  emoji: string;
  count: number;
  hasUserReacted: boolean;
}

export const useMessageReactions = (messageIds: string[]) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [reactions, setReactions] = useState<Record<string, MessageReaction[]>>({});
  const [isLoading, setIsLoading] = useState(false);
  
  // Store messageIds in a ref to prevent dependency changes on every render
  const messageIdsRef = useRef<string[]>([]);
  const lastFetchedIdsRef = useRef<string>("");

  // Fetch reactions for all messages - with deduplication
  const fetchReactions = useCallback(async (ids: string[]) => {
    if (!ids.length) return;

    const idsKey = ids.sort().join(",");
    // Skip if we already fetched these exact IDs
    if (idsKey === lastFetchedIdsRef.current) return;
    
    lastFetchedIdsRef.current = idsKey;
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase
        .from("message_reactions")
        .select("*")
        .in("message_id", ids);

      if (error) throw error;

      // Group reactions by message_id
      const grouped: Record<string, MessageReaction[]> = {};
      data?.forEach((reaction) => {
        if (!grouped[reaction.message_id]) {
          grouped[reaction.message_id] = [];
        }
        grouped[reaction.message_id].push(reaction);
      });

      setReactions(grouped);
    } catch (error) {
      console.error("Error fetching reactions:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Add a reaction
  const addReaction = async (messageId: string, emoji: string) => {
    if (!user) return;

    try {
      const { error } = await supabase.from("message_reactions").insert({
        message_id: messageId,
        user_id: user.id,
        emoji,
      });

      if (error) {
        // If duplicate, toggle off (remove)
        if (error.code === "23505") {
          await removeReaction(messageId, emoji);
          return;
        }
        throw error;
      }
    } catch (error) {
      console.error("Error adding reaction:", error);
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter la réaction",
        variant: "destructive",
      });
    }
  };

  // Remove a reaction
  const removeReaction = async (messageId: string, emoji: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("message_reactions")
        .delete()
        .eq("message_id", messageId)
        .eq("user_id", user.id)
        .eq("emoji", emoji);

      if (error) throw error;
    } catch (error) {
      console.error("Error removing reaction:", error);
    }
  };

  // Toggle reaction (add if not exists, remove if exists)
  const toggleReaction = async (messageId: string, emoji: string) => {
    if (!user) return;

    const messageReactions = reactions[messageId] || [];
    const existingReaction = messageReactions.find(
      (r) => r.user_id === user.id && r.emoji === emoji
    );

    if (existingReaction) {
      await removeReaction(messageId, emoji);
    } else {
      await addReaction(messageId, emoji);
    }
  };

  // Get reaction summary for a message
  const getReactionSummary = (messageId: string): ReactionSummary[] => {
    const messageReactions = reactions[messageId] || [];
    const emojiCounts: Record<string, { count: number; hasUserReacted: boolean }> = {};

    messageReactions.forEach((reaction) => {
      if (!emojiCounts[reaction.emoji]) {
        emojiCounts[reaction.emoji] = { count: 0, hasUserReacted: false };
      }
      emojiCounts[reaction.emoji].count++;
      if (reaction.user_id === user?.id) {
        emojiCounts[reaction.emoji].hasUserReacted = true;
      }
    });

    return Object.entries(emojiCounts).map(([emoji, data]) => ({
      emoji,
      count: data.count,
      hasUserReacted: data.hasUserReacted,
    }));
  };

  // Stable memoized messageIds key to prevent unnecessary re-subscriptions
  const messageIdsKey = useMemo(() => messageIds.sort().join(","), [messageIds]);

  // Subscribe to realtime changes
  useEffect(() => {
    if (!messageIds.length) return;
    
    // Update ref for use in callbacks
    messageIdsRef.current = messageIds;

    // Fetch only if IDs changed
    fetchReactions(messageIds);

    // Use a stable channel name based on conversation context, not all message IDs
    const channelName = `message-reactions-${messageIdsKey.slice(0, 50)}`;
    
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "message_reactions",
        },
        (payload) => {
          const reaction = payload.new as MessageReaction | null;
          const oldReaction = payload.old as MessageReaction | null;
          const currentIds = messageIdsRef.current;

          if (payload.eventType === "INSERT" && reaction) {
            if (currentIds.includes(reaction.message_id)) {
              setReactions((prev) => ({
                ...prev,
                [reaction.message_id]: [...(prev[reaction.message_id] || []), reaction],
              }));
            }
          } else if (payload.eventType === "DELETE" && oldReaction) {
            if (currentIds.includes(oldReaction.message_id)) {
              setReactions((prev) => ({
                ...prev,
                [oldReaction.message_id]: (prev[oldReaction.message_id] || []).filter(
                  (r) => r.id !== oldReaction.id
                ),
              }));
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [messageIdsKey, fetchReactions]);

  return {
    reactions,
    isLoading,
    addReaction,
    removeReaction,
    toggleReaction,
    getReactionSummary,
  };
};
