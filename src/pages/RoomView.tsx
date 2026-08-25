import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Room,
  RoomEvent,
  Track,
  RemoteTrack,
  RemoteParticipant,
  createLocalAudioTrack,
  createLocalVideoTrack,
} from "livekit-client";
import {
  ArrowLeft,
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  Loader2,
  MoreVertical,
  Flag,
  Ban,
  UserX,
  Crown,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useRooms } from "@/hooks/useRooms";
import { useBlockedUsers } from "@/hooks/useBlockedUsers";
import ReportModal from "@/components/ReportModal";
import BlockUserModal from "@/components/BlockUserModal";
import { toast } from "sonner";
import { tapHaptics } from "@/hooks/useHaptics";

interface RoomData {
  id: string;
  title: string;
  theme: string;
  mode: "audio" | "video";
  livekit_room: string;
  host_id: string;
  is_active: boolean;
}

interface Participant {
  user_id: string;
  role: string;
  display_name: string | null;
  avatar_url: string | null;
  is_active: boolean;
}

const RoomView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { leaveRoom, endRoom, kickParticipant } = useRooms();
  const { blockedUserIds } = useBlockedUsers();

  const [roomData, setRoomData] = useState<RoomData | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [connecting, setConnecting] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(false);
  const [remoteVideos, setRemoteVideos] = useState<Map<string, Track>>(new Map());

  const [reportTarget, setReportTarget] = useState<string | null>(null);
  const [blockTarget, setBlockTarget] = useState<{ id: string; name?: string } | null>(null);

  const roomRef = useRef<Room | null>(null);
  const audioContainerRef = useRef<HTMLDivElement | null>(null);

  const isHost = roomData?.host_id === user?.id;

  // Fetch room + connect
  useEffect(() => {
    if (!id || !user?.id) return;
    let cancelled = false;

    const connect = async () => {
      // 1. Fetch room
      const { data: rData, error: rErr } = await (supabase as any)
        .from("rooms")
        .select("*")
        .eq("id", id)
        .single();
      if (cancelled) return;
      if (rErr || !rData || !rData.is_active) {
        toast.error("Salon introuvable ou terminé");
        navigate("/rooms");
        return;
      }
      setRoomData(rData);

      // 2. Join as participant
      await (supabase as any)
        .from("room_participants")
        .upsert(
          {
            room_id: id,
            user_id: user.id,
            role: rData.host_id === user.id ? "host" : "participant",
            is_active: true,
            left_at: null,
          },
          { onConflict: "room_id,user_id" }
        );

      // 3. Get LiveKit token — reuse isStageGuest for publish rights
      const { data: tokenData, error: tErr } = await supabase.functions.invoke("livekit-token", {
        body: { roomName: rData.livekit_room, isStageGuest: true },
      });
      if (cancelled) return;
      if (tErr || !tokenData?.token) {
        toast.error("Impossible d'obtenir le token");
        navigate("/rooms");
        return;
      }

      const room = new Room({ adaptiveStream: true, dynacast: true });
      roomRef.current = room;

      room
        .on(RoomEvent.TrackSubscribed, (track: RemoteTrack, _pub, participant: RemoteParticipant) => {
          const identity = participant.identity;
          if (blockedUserIds.has(identity)) return;
          if (track.kind === Track.Kind.Audio) {
            const el = track.attach() as HTMLAudioElement;
            el.autoplay = true;
            audioContainerRef.current?.appendChild(el);
          } else if (track.kind === Track.Kind.Video) {
            setRemoteVideos((prev) => new Map(prev).set(identity, track as unknown as Track));
          }
        })
        .on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack, _pub, participant: RemoteParticipant) => {
          track.detach().forEach((el) => el.remove());
          if (track.kind === Track.Kind.Video) {
            setRemoteVideos((prev) => {
              const next = new Map(prev);
              next.delete(participant.identity);
              return next;
            });
          }
        });

      try {
        await room.connect(tokenData.url, tokenData.token);
        // Publish mic by default
        const mic = await createLocalAudioTrack();
        await room.localParticipant.publishTrack(mic);
        if (rData.mode === "video") {
          try {
            const cam = await createLocalVideoTrack();
            await room.localParticipant.publishTrack(cam);
            setCameraOn(true);
          } catch (e) {
            console.warn("Video publish failed", e);
          }
        }
      } catch (e) {
        console.error("LiveKit connect failed", e);
        toast.error("Connexion impossible");
      }

      if (!cancelled) setConnecting(false);
    };

    connect();

    return () => {
      cancelled = true;
      roomRef.current?.disconnect();
      roomRef.current = null;
      if (id) leaveRoom(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user?.id]);

  // Realtime participants list
  useEffect(() => {
    if (!id) return;
    const fetchParticipants = async () => {
      const { data } = await (supabase as any)
        .from("room_participants")
        .select("user_id, role, is_active")
        .eq("room_id", id)
        .eq("is_active", true);
      const rows = (data || []) as any[];
      const userIds = rows.map((r) => r.user_id);
      if (userIds.length === 0) {
        setParticipants([]);
        return;
      }
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", userIds);
      const map = new Map((profs || []).map((p: any) => [p.user_id, p]));
      setParticipants(
        rows
          .filter((r) => !blockedUserIds.has(r.user_id))
          .map((r) => ({
            user_id: r.user_id,
            role: r.role,
            is_active: r.is_active,
            display_name: map.get(r.user_id)?.display_name ?? null,
            avatar_url: map.get(r.user_id)?.avatar_url ?? null,
          }))
      );
    };
    fetchParticipants();
    const channel = supabase
      .channel(`room-${id}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "room_participants", filter: `room_id=eq.${id}` },
        () => fetchParticipants()
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "rooms", filter: `id=eq.${id}` },
        (payload: any) => {
          if (!payload.new?.is_active) {
            toast("Le salon a été fermé");
            navigate("/rooms");
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, blockedUserIds, navigate]);

  // Kick self if removed by host
  useEffect(() => {
    if (!id || !user?.id || connecting) return;
    const me = participants.find((p) => p.user_id === user.id);
    if (me === undefined && participants.length > 0) {
      toast("Vous avez été retiré du salon");
      navigate("/rooms");
    }
  }, [participants, id, user?.id, connecting, navigate]);

  const toggleMic = async () => {
    const local = roomRef.current?.localParticipant;
    if (!local) return;
    const pubs = Array.from(local.audioTrackPublications.values());
    for (const pub of pubs) {
      if (micOn) await pub.mute();
      else await pub.unmute();
    }
    setMicOn(!micOn);
  };

  const toggleCamera = async () => {
    const local = roomRef.current?.localParticipant;
    if (!local || roomData?.mode !== "video") return;
    if (cameraOn) {
      const pubs = Array.from(local.videoTrackPublications.values());
      for (const pub of pubs) {
        if (pub.track) {
          await local.unpublishTrack(pub.track);
          pub.track.stop();
        }
      }
      setCameraOn(false);
    } else {
      try {
        const cam = await createLocalVideoTrack();
        await local.publishTrack(cam);
        setCameraOn(true);
      } catch (e) {
        toast.error("Caméra indisponible");
      }
    }
  };

  const handleLeave = async () => {
    tapHaptics.impact("MEDIUM");
    if (isHost && id) {
      await endRoom(id);
    } else if (id) {
      await leaveRoom(id);
    }
    navigate("/rooms");
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-background pt-[env(safe-area-inset-top)]">
      <div ref={audioContainerRef} style={{ display: "none" }} />
      <header className="flex items-center gap-3 px-4 py-3 border-b border-border/50">
        <Button variant="ghost" size="icon" onClick={handleLeave}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold truncate">{roomData?.title ?? "Salon"}</h1>
          <p className="text-xs text-muted-foreground">
            {participants.length} participant{participants.length > 1 ? "s" : ""}
          </p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4">
        {connecting ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-3 md:grid-cols-4 gap-3 max-w-3xl mx-auto">
            {participants.map((p) => {
              const isMe = p.user_id === user?.id;
              const videoTrack = remoteVideos.get(p.user_id);
              return (
                <div key={p.user_id} className="relative aspect-square glass-strong rounded-2xl overflow-hidden">
                  {roomData?.mode === "video" && videoTrack ? (
                    <video
                      autoPlay
                      playsInline
                      className="w-full h-full object-cover"
                      ref={(el) => {
                        if (el && videoTrack) videoTrack.attach(el);
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Avatar className="w-16 h-16 border-2 border-primary/40">
                        <AvatarImage src={p.avatar_url || undefined} />
                        <AvatarFallback>{p.display_name?.[0] ?? "?"}</AvatarFallback>
                      </Avatar>
                    </div>
                  )}
                  <div className="absolute bottom-0 inset-x-0 p-2 bg-gradient-to-t from-black/70 to-transparent">
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1 min-w-0">
                        {p.role === "host" && <Crown className="w-3 h-3 text-primary flex-shrink-0" />}
                        <span className="text-xs font-medium text-white truncate">
                          {p.display_name ?? "?"}
                        </span>
                      </div>
                      {!isMe && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="text-white/80 hover:text-white p-1">
                              <MoreVertical className="w-3 h-3" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="z-[10000]">
                            <DropdownMenuItem onClick={() => setReportTarget(p.user_id)} className="gap-2">
                              <Flag className="w-4 h-4" /> Signaler
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setBlockTarget({ id: p.user_id, name: p.display_name || undefined })}
                              className="gap-2 text-destructive"
                            >
                              <Ban className="w-4 h-4" /> Bloquer
                            </DropdownMenuItem>
                            {isHost && (
                              <DropdownMenuItem
                                onClick={() => id && kickParticipant(id, p.user_id)}
                                className="gap-2 text-destructive"
                              >
                                <UserX className="w-4 h-4" /> Expulser
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] border-t border-border/50 flex items-center justify-center gap-4">
        <Button
          size="icon"
          variant={micOn ? "default" : "destructive"}
          onClick={() => { tapHaptics.impact("LIGHT"); toggleMic(); }}
          className="w-14 h-14 rounded-full"
        >
          {micOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
        </Button>
        {roomData?.mode === "video" && (
          <Button
            size="icon"
            variant={cameraOn ? "default" : "outline"}
            onClick={() => { tapHaptics.impact("LIGHT"); toggleCamera(); }}
            className="w-14 h-14 rounded-full"
          >
            {cameraOn ? <VideoIcon className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          </Button>
        )}
        <Button variant="destructive" onClick={handleLeave} className="h-14 rounded-full px-6">
          {isHost ? "Fermer le salon" : "Quitter"}
        </Button>
      </div>

      {reportTarget &&
        createPortal(
          <ReportModal
            isOpen={!!reportTarget}
            onClose={() => setReportTarget(null)}
            reportedUserId={reportTarget}
            contentType="room"
            contentId={id}
          />,
          document.body
        )}
      {blockTarget &&
        createPortal(
          <BlockUserModal
            isOpen={!!blockTarget}
            onClose={() => setBlockTarget(null)}
            userId={blockTarget.id}
            userName={blockTarget.name}
          />,
          document.body
        )}
    </div>
  );
};

export default RoomView;
