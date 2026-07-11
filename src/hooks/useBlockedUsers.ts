import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface BlockedUser {
  id: string;
  blocker_id: string;
  blocked_id: string;
  reason?: string;
  created_at: string;
}

export const useBlockedUsers = () => {
  const { user } = useAuth();
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [blockedUserIds, setBlockedUserIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  // Fetch blocked users
  const fetchBlockedUsers = useCallback(async () => {
    if (!user?.id) {
      setBlockedUsers([]);
      setBlockedUserIds(new Set());
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await (supabase as any)
        .from("blocked_users")
        .select("*")
        .eq("blocker_id", user.id);

      if (error) throw error;

      setBlockedUsers(data || []);
      setBlockedUserIds(new Set((data || []).map((b: BlockedUser) => b.blocked_id)));
    } catch (error) {
      console.error("Error fetching blocked users:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // Block a user
  const blockUser = useCallback(async (blockedId: string, reason?: string) => {
    if (!user?.id || blockedId === user.id) return false;

    try {
      const { error } = await (supabase as any)
        .from("blocked_users")
        .insert({
          blocker_id: user.id,
          blocked_id: blockedId,
          reason: reason || null,
        });

      if (error) {
        if (error.code === "23505") {
          toast.info("Utilisateur déjà bloqué");
          return true;
        }
        throw error;
      }

      // Update local state immediately
      setBlockedUserIds(prev => new Set([...prev, blockedId]));
      
      // Auto-create a content report so admins can review
      await (supabase as any).from("content_reports").insert({
        reporter_id: user.id,
        reported_user_id: blockedId,
        content_type: "block",
        reason: reason || "blocked_by_user",
      }).then(() => null).catch((e: unknown) => console.warn("content_report insert failed", e));

      // Notify admin about the block
      await notifyAdminAboutBlock(blockedId, reason);

      toast.success("Utilisateur bloqué", {
        description: "Cet utilisateur ne pourra plus vous contacter.",
      });

      // Refresh the list
      await fetchBlockedUsers();
      return true;
    } catch (error) {
      console.error("Error blocking user:", error);
      toast.error("Impossible de bloquer cet utilisateur");
      return false;
    }
  }, [user?.id, fetchBlockedUsers]);

  // Unblock a user
  const unblockUser = useCallback(async (blockedId: string) => {
    if (!user?.id) return false;

    try {
      const { error } = await (supabase as any)
        .from("blocked_users")
        .delete()
        .eq("blocker_id", user.id)
        .eq("blocked_id", blockedId);

      if (error) throw error;

      // Update local state immediately
      setBlockedUserIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(blockedId);
        return newSet;
      });

      toast.success("Utilisateur débloqué");

      // Refresh the list
      await fetchBlockedUsers();
      return true;
    } catch (error) {
      console.error("Error unblocking user:", error);
      toast.error("Impossible de débloquer cet utilisateur");
      return false;
    }
  }, [user?.id, fetchBlockedUsers]);

  // Check if a user is blocked
  const isBlocked = useCallback((userId: string) => {
    return blockedUserIds.has(userId);
  }, [blockedUserIds]);

  // Notify admin about the block (for App Store compliance)
  const notifyAdminAboutBlock = async (blockedId: string, reason?: string) => {
    try {
      // Get blocked user's profile for context
      const { data: blockedProfile } = await supabase
        .from("profiles")
        .select("display_name, email")
        .eq("user_id", blockedId)
        .single();

      // Create an admin notification via the existing system
      await supabase.functions.invoke("send-admin-email", {
        body: {
          subject: "🚫 Utilisateur bloqué",
          content: `Un utilisateur a été bloqué:
          
Utilisateur bloqué: ${blockedProfile?.display_name || "Inconnu"} (${blockedId})
Raison: ${reason || "Non spécifiée"}

Action requise: Vérifier si des mesures supplémentaires sont nécessaires.`,
        },
      });
    } catch (error) {
      console.error("Error notifying admin:", error);
      // Don't fail the block operation if notification fails
    }
  };

  // Real-time subscription for blocked users changes
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`blocked-users-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "blocked_users",
          filter: `blocker_id=eq.${user.id}`,
        },
        () => {
          fetchBlockedUsers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, fetchBlockedUsers]);

  // Initial fetch
  useEffect(() => {
    fetchBlockedUsers();
  }, [fetchBlockedUsers]);

  return {
    blockedUsers,
    blockedUserIds,
    isLoading,
    blockUser,
    unblockUser,
    isBlocked,
    refresh: fetchBlockedUsers,
  };
};
