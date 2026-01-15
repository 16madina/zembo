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
  /**
   * Optional existing stream to publish for streamers.
   * When provided, we reuse these tracks instead of requesting a second camera/mic.
   */
  publishStream?: MediaStream | null;
  onParticipantJoined?: (participant: RemoteParticipant) => void;
  onParticipantLeft?: (participant: RemoteParticipant) => void;
}

export interface LiveKitDebugInfo {
  role: "streamer" | "viewer";
  roomName: string;
  isConnecting: boolean;
  isConnected: boolean;
  error: string | null;
  numParticipants: number;
  localVideoPublications: number;
  localAudioPublications: number;
  remoteParticipants: number;
  remoteVideoTracks: number;
  hasRemoteVideoTrack: boolean;
  hasRemoteAudioTrack: boolean;
  audioPlaying: boolean;
}

// Helper to detect iOS
const isIOS = (): boolean => {
  if (typeof window === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
};

// Helper to detect Android
const isAndroid = (): boolean => {
  if (typeof window === "undefined") return false;
  return /Android/.test(navigator.userAgent);
};

// Helper to detect mobile
const isMobile = (): boolean => isIOS() || isAndroid();

export const useLiveKit = ({
  roomName,
  isStreamer,
  publishStream,
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
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [needsAudioUnlock, setNeedsAudioUnlock] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const hasConnectedRef = useRef(false);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const hasUnlockedAudioRef = useRef(false);

  // Debug info state
  const [debugInfo, setDebugInfo] = useState<LiveKitDebugInfo>({
    role: isStreamer ? "streamer" : "viewer",
    roomName,
    isConnecting: false,
    isConnected: false,
    error: null,
    numParticipants: 0,
    localVideoPublications: 0,
    localAudioPublications: 0,
    remoteParticipants: 0,
    remoteVideoTracks: 0,
    hasRemoteVideoTrack: false,
    hasRemoteAudioTrack: false,
    audioPlaying: false,
  });

  // Unlock audio for iOS/Android - MUST be called on user interaction (tap/click)
  const unlockAudio = useCallback(async () => {
    console.log("[LiveKit] 🔊 Unlocking audio for mobile...", {
      alreadyUnlocked: hasUnlockedAudioRef.current,
      isIOS: isIOS(),
      isAndroid: isAndroid(),
    });
    
    try {
      // Step 1: Create or resume AudioContext (CRITICAL for iOS)
      if (!audioContextRef.current) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          audioContextRef.current = new AudioContextClass();
          console.log("[LiveKit] Created new AudioContext, state:", audioContextRef.current.state);
        }
      }
      
      if (audioContextRef.current && audioContextRef.current.state === "suspended") {
        await audioContextRef.current.resume();
        console.log("[LiveKit] ✓ AudioContext resumed to state:", audioContextRef.current.state);
      }
      
      // Step 2: Play a silent audio to unlock the audio session (iOS Safari requirement)
      const silentAudio = document.createElement("audio");
      silentAudio.setAttribute("playsinline", "");
      silentAudio.setAttribute("webkit-playsinline", "");
      silentAudio.muted = false;
      silentAudio.volume = 0.001; // Nearly silent but not muted
      // Tiny valid WAV file (44 bytes header + minimal data)
      silentAudio.src = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA";
      
      try {
        await silentAudio.play();
        console.log("[LiveKit] ✓ Silent audio played successfully");
      } catch (e) {
        console.warn("[LiveKit] Silent audio play failed (may be expected on first call):", e);
      }
      silentAudio.pause();
      silentAudio.remove();
      
      hasUnlockedAudioRef.current = true;
      setNeedsAudioUnlock(false);
      setAudioPlaying(true);
      console.log("[LiveKit] ✓ Audio unlocked successfully");
      
      // Step 3: If we have an audio element waiting, unmute and play it
      if (audioElementRef.current) {
        audioElementRef.current.muted = false;
        audioElementRef.current.volume = 1.0;
        
        try {
          await audioElementRef.current.play();
          console.log("[LiveKit] ✓ Existing audio element now playing");
          setAudioPlaying(true);
        } catch (e) {
          console.warn("[LiveKit] Existing audio play failed:", e);
        }
      }
      
      return true;
    } catch (e) {
      console.error("[LiveKit] Audio unlock failed:", e);
      return false;
    }
  }, []);

  // Attach audio track with proper mobile handling (iOS + Android)
  const attachAudioTrack = useCallback((track: Track) => {
    console.log("[LiveKit] 🎵 Attaching audio track...", {
      isMobile: isMobile(),
      isIOS: isIOS(),
      isAndroid: isAndroid(),
      audioUnlocked: hasUnlockedAudioRef.current,
    });
    
    // Clean up existing audio element
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.srcObject = null;
      audioElementRef.current.remove();
      audioElementRef.current = null;
    }
    
    // Create new audio element with ALL mobile-friendly attributes
    const audioElement = document.createElement("audio");
    audioElement.id = "livekit-remote-audio-" + Date.now();
    audioElement.style.cssText = "position:absolute;left:-9999px;"; // Hidden but in DOM
    
    // Critical attributes for iOS Safari
    audioElement.setAttribute("playsinline", "");
    audioElement.setAttribute("webkit-playsinline", "");
    audioElement.setAttribute("x-webkit-airplay", "allow");
    audioElement.autoplay = true;
    
    // Start muted on mobile if audio not unlocked (to allow autoplay)
    // We'll unmute after user interaction
    const startMuted = isMobile() && !hasUnlockedAudioRef.current;
    audioElement.muted = startMuted;
    audioElement.volume = 1.0;
    
    document.body.appendChild(audioElement);
    audioElementRef.current = audioElement;
    
    // Attach the LiveKit track to our audio element
    track.attach(audioElement);
    
    console.log("[LiveKit] Audio element created:", {
      id: audioElement.id,
      muted: audioElement.muted,
      volume: audioElement.volume,
      readyState: audioElement.readyState,
      startedMuted: startMuted,
    });
    
    // Try to play the audio
    const tryPlay = async (attempt = 1) => {
      console.log(`[LiveKit] Attempting audio play (attempt ${attempt})...`);
      
      try {
        // On mobile, if we started muted, audio context should work now
        if (audioContextRef.current && audioContextRef.current.state === "suspended") {
          await audioContextRef.current.resume();
        }
        
        await audioElement.play();
        
        // If we started muted, check if we can unmute now
        if (audioElement.muted && hasUnlockedAudioRef.current) {
          audioElement.muted = false;
          console.log("[LiveKit] ✓ Audio unmuted after successful play");
        }
        
        console.log("[LiveKit] ✓ Remote audio playing successfully", {
          muted: audioElement.muted,
          paused: audioElement.paused,
        });
        
        // Only set audio as playing if it's not muted
        if (!audioElement.muted) {
          setAudioPlaying(true);
          setNeedsAudioUnlock(false);
        } else {
          // Playing but muted - user needs to tap to unmute
          setAudioPlaying(false);
          setNeedsAudioUnlock(true);
        }
      } catch (err) {
        console.warn(`[LiveKit] ⚠️ Remote audio play blocked (attempt ${attempt}):`, String(err));
        
        // On mobile, this is expected before user interaction
        setAudioPlaying(false);
        setNeedsAudioUnlock(true);
        
        // Retry with exponential backoff (up to 3 attempts)
        if (attempt < 3) {
          setTimeout(() => tryPlay(attempt + 1), attempt * 500);
        }
      }
    };
    
    // Start playback attempt (slight delay for track to initialize)
    setTimeout(() => tryPlay(1), 150);
    
    // Also listen for track enabled/mute changes
    const handleTrackMuted = () => {
      console.log("[LiveKit] Track muted event");
    };
    const handleTrackUnmuted = () => {
      console.log("[LiveKit] Track unmuted event");
      if (audioElement && !audioElement.paused && !audioElement.muted) {
        setAudioPlaying(true);
      }
    };
    
    track.on("muted", handleTrackMuted);
    track.on("unmuted", handleTrackUnmuted);
  }, []);

  // Update debug info
  const updateDebugInfo = useCallback((currentRoom: Room | null) => {
    if (!currentRoom) {
      setDebugInfo(prev => ({
        ...prev,
        isConnected: false,
        numParticipants: 0,
        localVideoPublications: 0,
        localAudioPublications: 0,
        remoteParticipants: 0,
        remoteVideoTracks: 0,
        hasRemoteAudioTrack: false,
        audioPlaying: false,
      }));
      return;
    }

    const localVideoPubs = Array.from(currentRoom.localParticipant.videoTrackPublications.values()).length;
    const localAudioPubs = Array.from(currentRoom.localParticipant.audioTrackPublications.values()).length;
    const remoteParticipants = Array.from(currentRoom.remoteParticipants.values());
    const remoteVideoCount = remoteParticipants.reduce((acc, p) => {
      return acc + Array.from(p.videoTrackPublications.values()).filter(pub => pub.track).length;
    }, 0);
    const remoteAudioCount = remoteParticipants.reduce((acc, p) => {
      return acc + Array.from(p.audioTrackPublications.values()).filter(pub => pub.track).length;
    }, 0);

    setDebugInfo({
      role: isStreamer ? "streamer" : "viewer",
      roomName,
      isConnecting,
      isConnected,
      error,
      numParticipants: currentRoom.numParticipants,
      localVideoPublications: localVideoPubs,
      localAudioPublications: localAudioPubs,
      remoteParticipants: remoteParticipants.length,
      remoteVideoTracks: remoteVideoCount,
      hasRemoteVideoTrack: !!remoteVideoTrack,
      hasRemoteAudioTrack: remoteAudioCount > 0,
      audioPlaying,
    });
  }, [isStreamer, roomName, isConnecting, isConnected, error, remoteVideoTrack, audioPlaying]);

  // Sync remote tracks - finds and attaches any available video/audio tracks from remote participants
  const syncRemoteTracks = useCallback((currentRoom: Room) => {
    if (isStreamer) return; // Only viewers need this

    console.log("[LiveKit] syncRemoteTracks - Scanning for remote tracks...");
    
    const remoteParticipants = Array.from(currentRoom.remoteParticipants.values());
    console.log("[LiveKit] Remote participants:", remoteParticipants.length);

    let foundVideo = false;
    let foundAudio = false;

    for (const participant of remoteParticipants) {
      console.log("[LiveKit] Participant:", participant.identity, 
        "Video pubs:", participant.videoTrackPublications.size,
        "Audio pubs:", participant.audioTrackPublications.size);
      
      // Handle video tracks
      for (const [, publication] of participant.videoTrackPublications) {
        console.log("[LiveKit] Video publication:", {
          trackSid: publication.trackSid,
          source: publication.source,
          isSubscribed: publication.isSubscribed,
          hasTrack: !!publication.track,
        });

        // Force subscription if not subscribed
        if (!publication.isSubscribed && publication.trackSid) {
          console.log("[LiveKit] Forcing subscription to video track:", publication.trackSid);
          publication.setSubscribed(true);
        }

        // If we have a track, use it
        if (publication.track && publication.track.kind === Track.Kind.Video && !foundVideo) {
          console.log("[LiveKit] Found video track, attaching...");
          setRemoteVideoTrack(publication.track);
          if (remoteVideoRef.current) {
            publication.track.attach(remoteVideoRef.current);
          }
          foundVideo = true;
        }
      }

      // Handle audio tracks
      for (const [, publication] of participant.audioTrackPublications) {
        console.log("[LiveKit] Audio publication:", {
          trackSid: publication.trackSid,
          source: publication.source,
          isSubscribed: publication.isSubscribed,
          hasTrack: !!publication.track,
        });

        // Force subscription if not subscribed
        if (!publication.isSubscribed && publication.trackSid) {
          console.log("[LiveKit] Forcing subscription to audio track:", publication.trackSid);
          publication.setSubscribed(true);
        }

        // If we have a track, attach it with mobile-friendly handling
        if (publication.track && publication.track.kind === Track.Kind.Audio && !foundAudio) {
          console.log("[LiveKit] Found audio track, attaching with mobile support...");
          setRemoteAudioTrack(publication.track);
          attachAudioTrack(publication.track);
          foundAudio = true;
        }
      }
    }

    if (!foundVideo) {
      console.log("[LiveKit] No remote video track found yet");
    }
    if (!foundAudio) {
      console.log("[LiveKit] No remote audio track found yet");
    }
  }, [isStreamer, attachAudioTrack]);

  // Get LiveKit token from edge function
  const getToken = useCallback(async () => {
    console.log(`[LiveKit] Requesting token as ${isStreamer ? "streamer" : "viewer"} for room: ${roomName}`);
    
    const { data, error } = await supabase.functions.invoke("livekit-token", {
      body: { roomName, isStreamer },
    });

    if (error) {
      console.error("[LiveKit] Token error:", error);
      throw new Error(error.message || "Failed to get token");
    }

    console.log("[LiveKit] Token received successfully");
    return data;
  }, [roomName, isStreamer]);

  // Force reconnect function
  const forceReconnect = useCallback(async () => {
    console.log("[LiveKit] Force reconnect triggered");
    if (room) {
      room.disconnect();
      setRoom(null);
      setIsConnected(false);
      hasConnectedRef.current = false;
    }
    setRemoteVideoTrack(null);
    setError(null);
    // Wait a bit before reconnecting
    await new Promise(resolve => setTimeout(resolve, 500));
  }, [room]);

  // Force resync remote tracks
  const forceResyncTracks = useCallback(() => {
    if (room && !isStreamer) {
      console.log("[LiveKit] Force resync remote tracks");
      syncRemoteTracks(room);
    }
  }, [room, isStreamer, syncRemoteTracks]);

  // Connect to room
  const connect = useCallback(async () => {
    if (isConnecting || isConnected) {
      console.log("[LiveKit] Already connecting or connected, skipping");
      return;
    }

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
        console.log("[LiveKit] Room connected event fired");
        setIsConnected(true);
        setIsConnecting(false);
        setParticipantCount(newRoom.numParticipants);
        hasConnectedRef.current = true;
        
        // VIEWER: Sync remote tracks immediately after connection
        if (!isStreamer) {
          setTimeout(() => syncRemoteTracks(newRoom), 500);
        }
        
        updateDebugInfo(newRoom);
      });

      newRoom.on(RoomEvent.Reconnected, () => {
        console.log("[LiveKit] Room reconnected");
        if (!isStreamer) {
          syncRemoteTracks(newRoom);
        }
        updateDebugInfo(newRoom);
      });

      newRoom.on(RoomEvent.Disconnected, () => {
        console.log("[LiveKit] Room disconnected");
        setIsConnected(false);
        setRoom(null);
        hasConnectedRef.current = false;
        updateDebugInfo(null);
      });

      newRoom.on(RoomEvent.ParticipantConnected, (participant) => {
        console.log("[LiveKit] Participant connected:", participant.identity);
        setParticipantCount(newRoom.numParticipants);
        onParticipantJoined?.(participant);
        
        // VIEWER: Try to sync tracks when a new participant joins
        if (!isStreamer) {
          setTimeout(() => syncRemoteTracks(newRoom), 500);
        }
        updateDebugInfo(newRoom);
      });

      newRoom.on(RoomEvent.ParticipantDisconnected, (participant) => {
        console.log("[LiveKit] Participant disconnected:", participant.identity);
        setParticipantCount(newRoom.numParticipants);
        onParticipantLeft?.(participant);
        updateDebugInfo(newRoom);
      });

      // Track published event - important for viewers to catch streamer publishing
      newRoom.on(RoomEvent.TrackPublished, (publication, participant) => {
        console.log("[LiveKit] TrackPublished:", publication.kind, "from", participant.identity);
        if (!isStreamer) {
          setTimeout(() => syncRemoteTracks(newRoom), 300);
        }
        updateDebugInfo(newRoom);
      });

      newRoom.on(
        RoomEvent.TrackSubscribed,
        (track, publication, participant) => {
          console.log("[LiveKit] TrackSubscribed:", track.kind, "from", participant.identity);
          if (track.kind === Track.Kind.Video) {
            console.log("[LiveKit] Setting remote video track for viewer");
            setRemoteVideoTrack(track);
            if (remoteVideoRef.current) {
              track.attach(remoteVideoRef.current);
            }
          } else if (track.kind === Track.Kind.Audio) {
            console.log("[LiveKit] Setting remote audio track with mobile support");
            setRemoteAudioTrack(track);
            // Use our custom audio attachment with iOS/Android support
            attachAudioTrack(track);
          }
          updateDebugInfo(newRoom);
        }
      );

      newRoom.on(
        RoomEvent.TrackUnsubscribed,
        (track, publication, participant) => {
          console.log("[LiveKit] TrackUnsubscribed:", track.kind, "from", participant.identity);
          track.detach();
          if (track.kind === Track.Kind.Video) {
            setRemoteVideoTrack(null);
          } else if (track.kind === Track.Kind.Audio) {
            setRemoteAudioTrack(null);
            setAudioPlaying(false);
            // Clean up audio element
            if (audioElementRef.current) {
              audioElementRef.current.pause();
              audioElementRef.current.srcObject = null;
              audioElementRef.current.remove();
              audioElementRef.current = null;
            }
          }
          updateDebugInfo(newRoom);
        }
      );

      // Connect to room
      console.log("[LiveKit] Connecting to room:", roomName);
      await newRoom.connect(url, token);
      setRoom(newRoom);

      // If streamer, publish tracks
      if (isStreamer) {
        // IMPORTANT: Reuse existing getUserMedia stream when available.
        // This avoids a second camera capture which often fails on mobile/webviews.
        const existingVideoTrack = publishStream?.getVideoTracks?.()?.[0] || null;
        const existingAudioTrack = publishStream?.getAudioTracks?.()?.[0] || null;

        console.log("[LiveKit] Publishing as streamer:", {
          hasPublishStream: !!publishStream,
          videoTracksCount: publishStream?.getVideoTracks?.()?.length || 0,
          audioTracksCount: publishStream?.getAudioTracks?.()?.length || 0,
        });

        let publishedVideoPub: LocalTrackPublication | undefined;
        
        try {
          publishedVideoPub = existingVideoTrack
            ? await newRoom.localParticipant.publishTrack(existingVideoTrack)
            : await newRoom.localParticipant.publishTrack(
                await createLocalVideoTrack({
                  facingMode: "user",
                  resolution: VideoPresets.h720.resolution,
                })
              );

          if (existingAudioTrack) {
            await newRoom.localParticipant.publishTrack(existingAudioTrack);
          } else {
            await newRoom.localParticipant.publishTrack(await createLocalAudioTrack());
          }

          // Verify publication success
          const videoPubs = Array.from(newRoom.localParticipant.videoTrackPublications.values());
          const audioPubs = Array.from(newRoom.localParticipant.audioTrackPublications.values());
          
          console.log("[LiveKit] Streamer publications after publish:", {
            videoPubs: videoPubs.length,
            audioPubs: audioPubs.length,
            hasActiveVideoTrack: videoPubs.some(p => p.track && !p.track.isMuted),
          });

          // Check if video track is actually active
          if (videoPubs.length === 0 || !videoPubs[0].track) {
            console.warn("[LiveKit] Warning: No active video publication after publish, attempting fallback...");
            // Fallback: create and publish a new track
            const fallbackTrack = await createLocalVideoTrack({
              facingMode: "user",
              resolution: VideoPresets.h720.resolution,
            });
            publishedVideoPub = await newRoom.localParticipant.publishTrack(fallbackTrack);
          }

          if (localVideoRef.current && publishedVideoPub?.track) {
            publishedVideoPub.track.attach(localVideoRef.current);
          }

          console.log("[LiveKit] Streamer tracks published successfully");
        } catch (pubError: any) {
          console.error("[LiveKit] Error publishing tracks:", pubError);
          setError("Erreur lors de la publication de la vidéo: " + pubError.message);
        }
        
        updateDebugInfo(newRoom);
      }
    } catch (err: any) {
      console.error("[LiveKit] Connection error:", err);
      setError(err.message || "Failed to connect");
      setIsConnecting(false);
    }
  }, [getToken, isStreamer, isConnecting, isConnected, publishStream, onParticipantJoined, onParticipantLeft, syncRemoteTracks, updateDebugInfo, roomName, attachAudioTrack]);

  // Disconnect from room
  const disconnect = useCallback(() => {
    if (room) {
      console.log("[LiveKit] Disconnecting from room");
      room.disconnect();
      setRoom(null);
      setIsConnected(false);
      hasConnectedRef.current = false;
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
      // Clean up audio element
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current.srcObject = null;
        audioElementRef.current.remove();
        audioElementRef.current = null;
      }
      // Clean up audio context
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, [room]);

  // Periodic debug info update
  useEffect(() => {
    if (!room) return;
    const interval = setInterval(() => updateDebugInfo(room), 2000);
    return () => clearInterval(interval);
  }, [room, updateDebugInfo]);

  return {
    room,
    isConnected,
    isConnecting,
    error,
    isMuted,
    isVideoOff,
    participantCount,
    remoteVideoTrack,
    remoteAudioTrack,
    audioPlaying,
    needsAudioUnlock,
    debugInfo,
    connect,
    disconnect,
    toggleMute,
    toggleVideo,
    switchCamera,
    setLocalVideoRef,
    setRemoteVideoRef,
    forceReconnect,
    forceResyncTracks,
    unlockAudio,
  };
};
