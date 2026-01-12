import { useState, useEffect, useCallback } from "react";
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

  // Fetch reactions for all messages
  const fetchReactions = useCallback(async () => {
    if (!messageIds.length) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("message_reactions")
        .select("*")
        .in("message_id", messageIds);

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
  }, [messageIds]);

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

  // Subscribe to realtime changes
  useEffect(() => {
    if (!messageIds.length) return;

    fetchReactions();

    const channel = supabase
      .channel("message-reactions")
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

          if (payload.eventType === "INSERT" && reaction) {
            if (messageIds.includes(reaction.message_id)) {
              setReactions((prev) => ({
                ...prev,
                [reaction.message_id]: [...(prev[reaction.message_id] || []), reaction],
              }));
            }
          } else if (payload.eventType === "DELETE" && oldReaction) {
            if (messageIds.includes(oldReaction.message_id)) {
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
  }, [messageIds.join(",")]);

  return {
    reactions,
    isLoading,
    addReaction,
    removeReaction,
    toggleReaction,
    getReactionSummary,
  };
};
