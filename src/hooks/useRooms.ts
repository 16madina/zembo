import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useBlockedUsers } from "@/hooks/useBlockedUsers";
import { toast } from "sonner";

export type RoomTheme = "music" | "business" | "debate" | "chill" | "culture" | "sport" | "other";
export type RoomMode = "audio" | "video";

export interface Room {
  id: string;
  host_id: string;
  title: string;
  theme: RoomTheme;
  mode: RoomMode;
  livekit_room: string;
  is_active: boolean;
  participant_count: number;
  created_at: string;
  host_profile?: { display_name: string | null; avatar_url: string | null };
  participants?: Array<{ user_id: string; display_name: string | null; avatar_url: string | null; role: string }>;
}

export const useRooms = () => {
  const { user } = useAuth();
  const { blockedUserIds } = useBlockedUsers();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRooms = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("rooms")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setRooms([]);
      setLoading(false);
      return;
    }

    const roomsRaw = (data || []) as Room[];
    const visible = roomsRaw.filter((r) => !blockedUserIds.has(r.host_id));
    const hostIds = [...new Set(visible.map((r) => r.host_id))];
    const roomIds = visible.map((r) => r.id);

    const [profilesRes, participantsRes] = await Promise.all([
      hostIds.length
        ? supabase.from("profiles").select("user_id, display_name, avatar_url").in("user_id", hostIds)
        : Promise.resolve({ data: [] as any[] }),
      roomIds.length
        ? (supabase as any)
            .from("room_participants")
            .select("room_id, user_id, role")
            .in("room_id", roomIds)
            .eq("is_active", true)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const hostMap = new Map((profilesRes.data || []).map((p: any) => [p.user_id, p]));

    const participantUserIds = [
      ...new Set(((participantsRes.data || []) as any[]).map((p) => p.user_id as string)),
    ];
    const partProfilesRes = participantUserIds.length
      ? await supabase
          .from("profiles")
          .select("user_id, display_name, avatar_url")
          .in("user_id", participantUserIds)
      : { data: [] as any[] };
    const partProfileMap = new Map((partProfilesRes.data || []).map((p: any) => [p.user_id, p]));

    const enriched = visible.map((r) => ({
      ...r,
      host_profile: hostMap.get(r.host_id),
      participants: ((participantsRes.data || []) as any[])
        .filter((p: any) => p.room_id === r.id && !blockedUserIds.has(p.user_id))
        .map((p: any) => ({
          user_id: p.user_id,
          role: p.role,
          display_name: partProfileMap.get(p.user_id)?.display_name ?? null,
          avatar_url: partProfileMap.get(p.user_id)?.avatar_url ?? null,
        })),
    }));

    setRooms(enriched);
    setLoading(false);
  }, [blockedUserIds]);

  useEffect(() => {
    fetchRooms();
    const channel = supabase
      .channel(`rooms-list-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "rooms" }, () => fetchRooms())
      .on("postgres_changes", { event: "*", schema: "public", table: "room_participants" }, () => fetchRooms())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchRooms]);

  const createRoom = useCallback(
    async (payload: { title: string; theme: RoomTheme; mode: RoomMode }) => {
      if (!user?.id) return { error: new Error("Not authenticated") };
      const livekit_room = `room_${crypto.randomUUID()}`;
      const { data, error } = await (supabase as any)
        .from("rooms")
        .insert({
          host_id: user.id,
          title: payload.title.trim().slice(0, 100),
          theme: payload.theme,
          mode: payload.mode,
          livekit_room,
          is_active: true,
          participant_count: 1,
        })
        .select()
        .single();
      if (error) {
        toast.error("Impossible de créer le salon");
        return { error };
      }
      // Add host as participant
      await (supabase as any).from("room_participants").insert({
        room_id: data.id,
        user_id: user.id,
        role: "host",
      });
      return { data };
    },
    [user?.id]
  );

  const joinRoom = useCallback(
    async (roomId: string) => {
      if (!user?.id) return { error: new Error("Not authenticated") };
      const { error } = await (supabase as any)
        .from("room_participants")
        .upsert(
          { room_id: roomId, user_id: user.id, role: "participant", is_active: true, left_at: null },
          { onConflict: "room_id,user_id" }
        );
      if (!error) {
        await (supabase as any).rpc("increment_room_participants", { p_room_id: roomId }).catch(() => {});
      }
      return { error };
    },
    [user?.id]
  );

  const leaveRoom = useCallback(
    async (roomId: string) => {
      if (!user?.id) return;
      await (supabase as any)
        .from("room_participants")
        .update({ is_active: false, left_at: new Date().toISOString() })
        .eq("room_id", roomId)
        .eq("user_id", user.id);
    },
    [user?.id]
  );

  const endRoom = useCallback(
    async (roomId: string) => {
      await (supabase as any)
        .from("rooms")
        .update({ is_active: false, ended_at: new Date().toISOString() })
        .eq("id", roomId);
    },
    []
  );

  const kickParticipant = useCallback(
    async (roomId: string, targetUserId: string) => {
      await (supabase as any)
        .from("room_participants")
        .update({ is_active: false, left_at: new Date().toISOString() })
        .eq("room_id", roomId)
        .eq("user_id", targetUserId);
      toast.success("Participant expulsé");
    },
    []
  );

  return { rooms, loading, fetchRooms, createRoom, joinRoom, leaveRoom, endRoom, kickParticipant };
};
