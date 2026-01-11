import { useState, useEffect, useCallback, useRef } from "react";
import {
  Room,
  RoomEvent,
  Track,
  LocalParticipant,
  RemoteParticipant,
  RemoteTrackPublication,
  LocalTrackPublication,
  VideoPresets,
  createLocalVideoTrack,
  createLocalAudioTrack,
} from "livekit-client";
import { supabase } from "@/integrations/supabase/client";

interface UseLiveKitOptions {
  roomName: string;
  isStreamer: boolean;
  onParticipantJoined?: (participant: RemoteParticipant) => void;
  onParticipantLeft?: (participant: RemoteParticipant) => void;
}

export const useLiveKit = ({
  roomName,
  isStreamer,
  onParticipantJoined,
  onParticipantLeft,
}: UseLiveKitOptions) => {
  const [room, setRoom] = useState<Room | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [participantCount, setParticipantCount] = useState(0);
  const [remoteVideoTrack, setRemoteVideoTrack] = useState<Track | null>(null);
  const [remoteAudioTrack, setRemoteAudioTrack] = useState<Track | null>(null);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  // Get LiveKit token from edge function
  const getToken = useCallback(async () => {
    const { data, error } = await supabase.functions.invoke("livekit-token", {
      body: { roomName, isStreamer },
    });

    if (error) {
      throw new Error(error.message || "Failed to get token");
    }

    return data;
  }, [roomName, isStreamer]);

  // Connect to room
  const connect = useCallback(async () => {
    if (isConnecting || isConnected) return;

    setIsConnecting(true);
    setError(null);

    try {
      const { token, url } = await getToken();

      const newRoom = new Room({
        adaptiveStream: true,
        dynacast: true,
        videoCaptureDefaults: {
          resolution: VideoPresets.h720.resolution,
        },
      });

      // Set up event listeners
      newRoom.on(RoomEvent.Connected, () => {
        setIsConnected(true);
        setIsConnecting(false);
        setParticipantCount(newRoom.numParticipants);
      });

      newRoom.on(RoomEvent.Disconnected, () => {
        setIsConnected(false);
        setRoom(null);
      });

      newRoom.on(RoomEvent.ParticipantConnected, (participant) => {
        setParticipantCount(newRoom.numParticipants);
        onParticipantJoined?.(participant);
      });

      newRoom.on(RoomEvent.ParticipantDisconnected, (participant) => {
        setParticipantCount(newRoom.numParticipants);
        onParticipantLeft?.(participant);
      });

      newRoom.on(
        RoomEvent.TrackSubscribed,
        (track, publication, participant) => {
          if (track.kind === Track.Kind.Video) {
            setRemoteVideoTrack(track);
            if (remoteVideoRef.current) {
              track.attach(remoteVideoRef.current);
            }
          } else if (track.kind === Track.Kind.Audio) {
            setRemoteAudioTrack(track);
            // Audio tracks auto-play
            track.attach();
          }
        }
      );

      newRoom.on(
        RoomEvent.TrackUnsubscribed,
        (track, publication, participant) => {
          track.detach();
          if (track.kind === Track.Kind.Video) {
            setRemoteVideoTrack(null);
          } else if (track.kind === Track.Kind.Audio) {
            setRemoteAudioTrack(null);
          }
        }
      );

      // Connect to room
      await newRoom.connect(url, token);
      setRoom(newRoom);

      // If streamer, publish tracks
      if (isStreamer) {
        const videoTrack = await createLocalVideoTrack({
          facingMode: "user",
          resolution: VideoPresets.h720.resolution,
        });
        const audioTrack = await createLocalAudioTrack();

        await newRoom.localParticipant.publishTrack(videoTrack);
        await newRoom.localParticipant.publishTrack(audioTrack);

        if (localVideoRef.current) {
          videoTrack.attach(localVideoRef.current);
        }
      }
    } catch (err: any) {
      console.error("LiveKit connection error:", err);
      setError(err.message || "Failed to connect");
      setIsConnecting(false);
    }
  }, [getToken, isStreamer, isConnecting, isConnected, onParticipantJoined, onParticipantLeft]);

  // Disconnect from room
  const disconnect = useCallback(() => {
    if (room) {
      room.disconnect();
      setRoom(null);
      setIsConnected(false);
    }
  }, [room]);

  // Toggle mute
  const toggleMute = useCallback(async () => {
    if (!room) return;

    const localParticipant = room.localParticipant;
    const audioTrack = localParticipant.getTrackPublication(Track.Source.Microphone);
    
    if (audioTrack) {
      if (isMuted) {
        await localParticipant.setMicrophoneEnabled(true);
      } else {
        await localParticipant.setMicrophoneEnabled(false);
      }
      setIsMuted(!isMuted);
    }
  }, [room, isMuted]);

  // Toggle video
  const toggleVideo = useCallback(async () => {
    if (!room) return;

    const localParticipant = room.localParticipant;
    
    if (isVideoOff) {
      await localParticipant.setCameraEnabled(true);
    } else {
      await localParticipant.setCameraEnabled(false);
    }
    setIsVideoOff(!isVideoOff);
  }, [room, isVideoOff]);

  // Switch camera
  const switchCamera = useCallback(async () => {
    if (!room) return;

    const videoTrack = room.localParticipant.getTrackPublication(Track.Source.Camera);
    if (videoTrack?.track) {
      const currentFacingMode = (videoTrack.track as any).facingMode;
      const newFacingMode = currentFacingMode === "user" ? "environment" : "user";
      
      await room.localParticipant.setCameraEnabled(false);
      
      const newVideoTrack = await createLocalVideoTrack({
        facingMode: newFacingMode,
        resolution: VideoPresets.h720.resolution,
      });
      
      await room.localParticipant.publishTrack(newVideoTrack);
      
      if (localVideoRef.current) {
        newVideoTrack.attach(localVideoRef.current);
      }
    }
  }, [room]);

  // Set video refs
  const setLocalVideoRef = useCallback((ref: HTMLVideoElement | null) => {
    localVideoRef.current = ref;
  }, []);

  const setRemoteVideoRef = useCallback((ref: HTMLVideoElement | null) => {
    remoteVideoRef.current = ref;
    if (ref && remoteVideoTrack) {
      remoteVideoTrack.attach(ref);
    }
  }, [remoteVideoTrack]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (room) {
        room.disconnect();
      }
    };
  }, [room]);

  return {
    room,
    isConnected,
    isConnecting,
    error,
    isMuted,
    isVideoOff,
    participantCount,
    remoteVideoTrack,
    connect,
    disconnect,
    toggleMute,
    toggleVideo,
    switchCamera,
    setLocalVideoRef,
    setRemoteVideoRef,
  };
};
