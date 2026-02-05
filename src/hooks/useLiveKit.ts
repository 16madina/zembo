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
   * Stage guest: When true, this participant is on stage in DUO mode
   * and will publish their video/audio to LiveKit so spectators can see them.
   */
  isStageGuest?: boolean;
  /**
   * Optional existing stream to publish for streamers or stage guests.
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
  isStageGuest = false,
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
  // Map of participant identity -> their video track (for multi-participant scenarios like DUO)
  const [remoteVideoTracks, setRemoteVideoTracks] = useState<Map<string, Track>>(new Map());
  const [remoteAudioTracks, setRemoteAudioTracks] = useState<Map<string, Track>>(new Map());
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [needsAudioUnlock, setNeedsAudioUnlock] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const hasConnectedRef = useRef(false);
  const hasPublishedRef = useRef(false); // BUG #1 FIX: Track if we've published tracks
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const hasUnlockedAudioRef = useRef(false);
  // Keep the latest publishStream without re-creating callbacks
  const publishStreamRef = useRef<MediaStream | null>(publishStream ?? null);
  // Track role changes to force reconnection when isStreamer changes
  const previousRoleRef = useRef<{ isStreamer: boolean; isStageGuest: boolean } | null>(null);

  useEffect(() => {
    publishStreamRef.current = publishStream ?? null;
  }, [publishStream]);

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
  // Now stores tracks by participant identity for multi-participant scenarios (DUO mode)
  const syncRemoteTracks = useCallback((currentRoom: Room) => {
    // In DUO mode, even the streamer needs to receive the guest's video tracks
    // Stage guests need to receive the streamer's video
    // So we allow sync for: viewers, stage guests, AND streamers (for DUO mode)
    // The streamer won't attach to their own track (filtered below)

    console.log("[LiveKit] syncRemoteTracks - Scanning for remote tracks...");
    
    // Get local participant identity to avoid attaching our own tracks
    const localIdentity = currentRoom.localParticipant.identity;
    console.log("[LiveKit] Local participant identity:", localIdentity);
    
    const remoteParticipants = Array.from(currentRoom.remoteParticipants.values());
    console.log("[LiveKit] Remote participants:", remoteParticipants.map(p => ({
      identity: p.identity,
      name: p.name,
      videoTracks: p.videoTrackPublications.size,
      audioTracks: p.audioTrackPublications.size,
    })));

    const newVideoTracks = new Map<string, Track>();
    const newAudioTracks = new Map<string, Track>();
    // For streamers, we don't need a primary video (they have their own camera)
    // For viewers, the first video track found is the streamer's (primary)
    let foundPrimaryVideo = isStreamer; // Streamer already has video, skip primary assignment
    let foundPrimaryAudio = isStreamer; // Streamer already has audio, skip primary assignment

    for (const participant of remoteParticipants) {
      console.log("[LiveKit] Processing participant:", participant.identity, 
        "Video pubs:", participant.videoTrackPublications.size,
        "Audio pubs:", participant.audioTrackPublications.size);
      
      // Handle video tracks
      for (const [, publication] of participant.videoTrackPublications) {
        console.log("[LiveKit] Video publication:", {
          participant: participant.identity,
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

        // If we have a track, store it by participant identity
        if (publication.track && publication.track.kind === Track.Kind.Video) {
          console.log("[LiveKit] ✓ Found video track from:", participant.identity);
          newVideoTracks.set(participant.identity, publication.track);
          
          // Set the primary remote video track (first one found, usually the streamer)
          if (!foundPrimaryVideo) {
            setRemoteVideoTrack(publication.track);
            if (remoteVideoRef.current) {
              publication.track.attach(remoteVideoRef.current);
            }
            foundPrimaryVideo = true;
          }
        }
      }

      // Handle audio tracks
      for (const [, publication] of participant.audioTrackPublications) {
        console.log("[LiveKit] Audio publication:", {
          participant: participant.identity,
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

        // If we have a track, store it and attach with mobile-friendly handling
        if (publication.track && publication.track.kind === Track.Kind.Audio) {
          console.log("[LiveKit] ✓ Found audio track from:", participant.identity);
          newAudioTracks.set(participant.identity, publication.track);
          
          if (!foundPrimaryAudio) {
            setRemoteAudioTrack(publication.track);
            attachAudioTrack(publication.track);
            foundPrimaryAudio = true;
          }
        }
      }
    }

    // Update the Maps with all found tracks
    setRemoteVideoTracks(newVideoTracks);
    setRemoteAudioTracks(newAudioTracks);

    console.log("[LiveKit] syncRemoteTracks complete:", {
      videoTracksCount: newVideoTracks.size,
      audioTracksCount: newAudioTracks.size,
      videoTrackIdentities: Array.from(newVideoTracks.keys()),
      audioTrackIdentities: Array.from(newAudioTracks.keys()),
    });
  }, [isStreamer, isStageGuest, attachAudioTrack]);

  // Get LiveKit token from edge function
  const getToken = useCallback(async () => {
    const role = isStreamer ? "streamer" : isStageGuest ? "stageGuest" : "viewer";
    console.log(`[LiveKit] Requesting token as ${role} for room: ${roomName}`);
    
    const { data, error } = await supabase.functions.invoke("livekit-token", {
      body: { roomName, isStreamer, isStageGuest },
    });

    if (error) {
      console.error("[LiveKit] Token error:", error);
      throw new Error(error.message || "Failed to get token");
    }

    console.log("[LiveKit] Token received successfully");
    return data;
  }, [roomName, isStreamer, isStageGuest]);

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
    // Allow for ALL participants including streamer (for DUO mode)
    if (room) {
      console.log("[LiveKit] Force resync remote tracks");
      syncRemoteTracks(room);
    }
  }, [room, syncRemoteTracks]);

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
        
        // ALL participants sync remote tracks for DUO mode support
        // Streamer needs to see guest's video, viewer needs to see both
        setTimeout(() => syncRemoteTracks(newRoom), 500);
        
        updateDebugInfo(newRoom);
      });

      newRoom.on(RoomEvent.Reconnected, () => {
        console.log("[LiveKit] Room reconnected");
        // ALL participants resync on reconnect for DUO mode
        syncRemoteTracks(newRoom);
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
        
        // ALL participants sync when someone new joins (guest might be joining)
        setTimeout(() => syncRemoteTracks(newRoom), 500);
        updateDebugInfo(newRoom);
      });

      newRoom.on(RoomEvent.ParticipantDisconnected, (participant) => {
        console.log("[LiveKit] Participant disconnected:", participant.identity);
        setParticipantCount(newRoom.numParticipants);
        onParticipantLeft?.(participant);
        updateDebugInfo(newRoom);
      });

      // Track published event - important for viewers and stage guests to catch streamer publishing
      newRoom.on(RoomEvent.TrackPublished, (publication, participant) => {
        console.log("[LiveKit] TrackPublished:", publication.kind, "from", participant.identity);
        // ALL participants sync when tracks are published (guest publishes their video)
        setTimeout(() => syncRemoteTracks(newRoom), 300);
        updateDebugInfo(newRoom);
      });

      newRoom.on(
        RoomEvent.TrackSubscribed,
        (track, publication, participant) => {
          console.log("[LiveKit] TrackSubscribed:", track.kind, "from", participant.identity);
         
         // Listen for mute/unmute events on the track for proper state sync
         track.on("muted", () => {
           console.log("[LiveKit] Track muted:", track.kind, "from", participant.identity);
         });
         track.on("unmuted", () => {
           console.log("[LiveKit] Track unmuted:", track.kind, "from", participant.identity);
         });
          
          // Store track in Map by participant identity
          if (track.kind === Track.Kind.Video) {
            console.log("[LiveKit] Adding remote video track from:", participant.identity);
            setRemoteVideoTracks(prev => new Map(prev).set(participant.identity, track));
            // Also set the legacy single track (for backward compatibility)
            setRemoteVideoTrack(track);
            if (remoteVideoRef.current) {
              track.attach(remoteVideoRef.current);
            }
          } else if (track.kind === Track.Kind.Audio) {
            console.log("[LiveKit] Adding remote audio track from:", participant.identity);
            setRemoteAudioTracks(prev => new Map(prev).set(participant.identity, track));
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
          
          // Remove from Maps
          if (track.kind === Track.Kind.Video) {
            setRemoteVideoTracks(prev => {
              const newMap = new Map(prev);
              newMap.delete(participant.identity);
              return newMap;
            });
            // If this was the primary track, clear it
            setRemoteVideoTrack(prevTrack => prevTrack === track ? null : prevTrack);
          } else if (track.kind === Track.Kind.Audio) {
            setRemoteAudioTracks(prev => {
              const newMap = new Map(prev);
              newMap.delete(participant.identity);
              return newMap;
            });
            setRemoteAudioTrack(prevTrack => {
              if (prevTrack === track) {
                setAudioPlaying(false);
                // Clean up audio element
                if (audioElementRef.current) {
                  audioElementRef.current.pause();
                  audioElementRef.current.srcObject = null;
                  audioElementRef.current.remove();
                  audioElementRef.current = null;
                }
                return null;
              }
              return prevTrack;
            });
          }
          updateDebugInfo(newRoom);
        }
      );

      // Connect to room
      console.log("[LiveKit] Connecting to room:", roomName);
      await newRoom.connect(url, token);
      setRoom(newRoom);

      // If streamer OR stage guest, publish tracks
      if (isStreamer || isStageGuest) {
        // IMPORTANT: Reuse existing getUserMedia stream when available.
        // This avoids a second camera capture which often fails on mobile/webviews.
        const existingVideoTrack = publishStream?.getVideoTracks?.()?.[0] || null;
        const existingAudioTrack = publishStream?.getAudioTracks?.()?.[0] || null;

        const role = isStreamer ? "streamer" : "stage guest";
        console.log(`[LiveKit] Publishing as ${role}:`, {
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
          
          console.log(`[LiveKit] ${role} publications after publish:`, {
            videoPubs: videoPubs.length,
            audioPubs: audioPubs.length,
            hasActiveVideoTrack: videoPubs.some(p => p.track && !p.track.isMuted),
          });

          // Check if video track is actually active (only for streamer, stage guest may have different flow)
          if (isStreamer && (videoPubs.length === 0 || !videoPubs[0].track)) {
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

          // BUG #5 FIX: Mark as published to prevent duplicate publishing
          hasPublishedRef.current = true;
          console.log(`[LiveKit] ${role} tracks published successfully`);
        } catch (pubError: any) {
          console.error(`[LiveKit] Error publishing tracks as ${role}:`, pubError);
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
    console.log("[LiveKit] toggleMute called, room:", !!room, "isMuted:", isMuted);
    
    if (!room) {
      console.warn("[LiveKit] No room available for mute toggle");
      return;
    }

    try {
      const localParticipant = room.localParticipant;
      const newMutedState = !isMuted;
      
      console.log("[LiveKit] Setting microphone enabled:", !newMutedState);

      // IMPORTANT:
      // When we publish existing MediaStreamTracks (publishStream), LiveKit publications may NOT
      // be tagged as Track.Source.Microphone/Camera. So we must mute/unmute ALL publications.
      const audioPubs = Array.from(localParticipant.audioTrackPublications.values());
      if (audioPubs.length > 0) {
        await Promise.all(
          audioPubs.map(async (pub) => {
            try {
              if (newMutedState) {
                await pub.mute();
              } else {
                await pub.unmute();
              }
            } catch (e) {
              console.warn("[LiveKit] Audio pub mute/unmute failed:", e);
            }
          })
        );
        console.log("[LiveKit] ✓ Audio publications toggled:", { count: audioPubs.length, newMutedState });
      } else {
        await localParticipant.setMicrophoneEnabled(!newMutedState);
        console.log("[LiveKit] ✓ Microphone enabled state set via setMicrophoneEnabled()" );
      }

      // Also toggle the underlying MediaStreamTrack(s) if we reused an existing stream.
      // This guarantees the source itself stops producing audio in all environments.
      const stream = publishStreamRef.current;
      stream?.getAudioTracks?.()?.forEach((t) => {
        t.enabled = !newMutedState;
      });
     
      setIsMuted(newMutedState);
      console.log("[LiveKit] Microphone muted state updated to:", newMutedState);
    } catch (error) {
      console.error("[LiveKit] Error toggling mute:", error);
    }
  }, [room, isMuted]);

  // Toggle video
  const toggleVideo = useCallback(async () => {
    console.log("[LiveKit] toggleVideo called, room:", !!room, "isVideoOff:", isVideoOff);
    
    if (!room) {
      console.warn("[LiveKit] No room available for video toggle");
      return;
    }

    try {
      const localParticipant = room.localParticipant;
      const newVideoOffState = !isVideoOff;
      
      console.log("[LiveKit] Setting camera enabled:", !newVideoOffState);

      const videoPubs = Array.from(localParticipant.videoTrackPublications.values());
      if (videoPubs.length > 0) {
        await Promise.all(
          videoPubs.map(async (pub) => {
            try {
              if (newVideoOffState) {
                await pub.mute();
              } else {
                await pub.unmute();
              }
            } catch (e) {
              console.warn("[LiveKit] Video pub mute/unmute failed:", e);
            }
          })
        );

        // Attach any available local video track after turning back on
        if (!newVideoOffState && localVideoRef.current) {
          for (const pub of videoPubs) {
            if (pub.track) {
              try {
                pub.track.attach(localVideoRef.current);
                break;
              } catch (e) {
                console.warn("[LiveKit] Failed attaching local video track:", e);
              }
            }
          }
        }

        console.log("[LiveKit] ✓ Video publications toggled:", { count: videoPubs.length, newVideoOffState });
      } else {
        // Fallback: No publications, rely on LiveKit helpers
        if (newVideoOffState) {
          await localParticipant.setCameraEnabled(false);
          console.log("[LiveKit] ✓ Camera disabled");
        } else {
          console.log("[LiveKit] No existing video track, creating new one...");
          const newVideoTrack = await createLocalVideoTrack({
            facingMode: "user",
            resolution: VideoPresets.h720.resolution,
          });
          const newPub = await localParticipant.publishTrack(newVideoTrack);
          console.log("[LiveKit] ✓ New video track published");

          if (localVideoRef.current && newPub?.track) {
            newPub.track.attach(localVideoRef.current);
          }
        }
      }

      // Also toggle the underlying MediaStreamTrack(s) if we reused an existing stream.
      const stream = publishStreamRef.current;
      stream?.getVideoTracks?.()?.forEach((t) => {
        t.enabled = !newVideoOffState;
      });
     
      setIsVideoOff(newVideoOffState);
      console.log("[LiveKit] Camera off state updated to:", newVideoOffState);
    } catch (error) {
      console.error("[LiveKit] Error toggling video:", error);
    }
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

  // CRITICAL: Force reconnection when role changes (isStreamer or isStageGuest)
  // This fixes the issue where the streamer connects as viewer if live data loads after initial connection
  useEffect(() => {
    const prevRole = previousRoleRef.current;
    const currentRole = { isStreamer, isStageGuest };
    
    // Skip on first render
    if (prevRole === null) {
      previousRoleRef.current = currentRole;
      return;
    }
    
    // Check if role changed
    const roleChanged = prevRole.isStreamer !== isStreamer || prevRole.isStageGuest !== isStageGuest;
    
    if (roleChanged) {
      console.log("[LiveKit] 🔄 Role changed:", {
        from: prevRole,
        to: currentRole,
        wasConnected: isConnected,
        hadConnectedBefore: hasConnectedRef.current,
      });
      
      // If we were connected, disconnect first
      if (isConnected && room) {
        console.log("[LiveKit] Disconnecting current connection due to role change");
        room.disconnect();
      }
      
      // Reset state to allow fresh connection with new role
      setRoom(null);
      setIsConnected(false);
      hasConnectedRef.current = false;
      hasPublishedRef.current = false; // BUG #1 FIX: Reset to allow re-publication with new role
      setRemoteVideoTrack(null);
      setRemoteAudioTrack(null);
      setRemoteVideoTracks(new Map());
      setRemoteAudioTracks(new Map());
      setError(null);
      setIsConnecting(false); // CRITICAL: Reset connecting state so we can connect again
    }
    
    previousRoleRef.current = currentRole;
  }, [isStreamer, isStageGuest, isConnected, room]);

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

  // BUG #1 & #2 FIX: Re-publish tracks if stream becomes available AFTER connection
  // This fixes the race condition where publishStream arrives after connect() was called
  useEffect(() => {
    // Only applies to streamers and stage guests who need to publish
    if (!room || !isConnected) return;
    if (!(isStreamer || isStageGuest)) return;
    if (!publishStream) return;
    if (hasPublishedRef.current) return;

    console.log("[LiveKit] 🔄 Stream became available after connection, publishing now...");

    const publishLateStream = async () => {
      try {
        const existingVideoTrack = publishStream.getVideoTracks()?.[0];
        const existingAudioTrack = publishStream.getAudioTracks()?.[0];

        console.log("[LiveKit] Late stream tracks:", {
          hasVideo: !!existingVideoTrack,
          hasAudio: !!existingAudioTrack,
        });

        if (existingVideoTrack) {
          await room.localParticipant.publishTrack(existingVideoTrack);
          console.log("[LiveKit] ✓ Late video track published");
        }
        if (existingAudioTrack) {
          await room.localParticipant.publishTrack(existingAudioTrack);
          console.log("[LiveKit] ✓ Late audio track published");
        }

        hasPublishedRef.current = true;
        console.log("[LiveKit] ✓ Late stream published successfully");
        updateDebugInfo(room);
      } catch (err) {
        console.error("[LiveKit] ❌ Failed to publish late stream:", err);
      }
    };

    publishLateStream();
  }, [room, isConnected, isStreamer, isStageGuest, publishStream, updateDebugInfo]);

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
    // New: Map of all remote video tracks by participant identity (for DUO mode)
    remoteVideoTracks,
    remoteAudioTracks,
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
