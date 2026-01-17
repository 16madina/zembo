import { useState, useRef, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

interface CallState {
  isInCall: boolean;
  isRinging: boolean;
  isIncoming: boolean;
  callId: string | null;
  callType: "audio" | "video";
  remoteUserId: string | null;
  remoteUserName: string | null;
  remoteUserPhoto: string | null;
  isMuted: boolean;
  duration: number;
}

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

export const useVoiceCall = () => {
  const { user } = useAuth();
  const [callState, setCallState] = useState<CallState>({
    isInCall: false,
    isRinging: false,
    isIncoming: false,
    callId: null,
    callType: "audio",
    remoteUserId: null,
    remoteUserName: null,
    remoteUserPhoto: null,
    isMuted: false,
    duration: 0,
  });

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const signalChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const callTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Call timeout duration: 60 seconds
  const CALL_TIMEOUT_MS = 60000;

  // Clean up on unmount
  useEffect(() => {
    return () => {
      endCall();
    };
  }, []);

  // Check for pending call from push notification (deep linking)
  useEffect(() => {
    if (!user?.id) return;

    const checkPendingCall = async () => {
      const pendingCallData = sessionStorage.getItem("pendingCall");
      if (!pendingCallData) return;

      console.log("[VoiceCall] Found pending call from notification:", pendingCallData);
      sessionStorage.removeItem("pendingCall");

      try {
        const pendingCall = JSON.parse(pendingCallData);
        const callId = pendingCall.callId;

        if (!callId) {
          console.log("[VoiceCall] No callId in pending call data");
          return;
        }

        // Fetch the active call from database
        const { data: call, error } = await supabase
          .from("call_sessions")
          .select("*")
          .eq("id", callId)
          .single();

        if (error || !call) {
          console.log("[VoiceCall] Call not found or error:", error);
          return;
        }

        console.log("[VoiceCall] Retrieved call from DB:", call);

        // Only process if call is still ringing and user is the callee
        if (call.status === "ringing" && call.callee_id === user.id) {
          // Fetch caller info
          const { data: callerProfile } = await supabase
            .from("profiles")
            .select("display_name, avatar_url")
            .eq("user_id", call.caller_id)
            .maybeSingle();

          console.log("[VoiceCall] Setting incoming call state from pending notification");

          setCallState({
            isInCall: false,
            isRinging: true,
            isIncoming: true,
            callId: call.id,
            callType: call.call_type as "audio" | "video",
            remoteUserId: call.caller_id,
            remoteUserName: callerProfile?.display_name || pendingCall.callerName || "Utilisateur",
            remoteUserPhoto: callerProfile?.avatar_url || pendingCall.callerPhoto || null,
            isMuted: false,
            duration: 0,
          });
        } else {
          console.log("[VoiceCall] Call is no longer active:", call.status);
        }
      } catch (err) {
        console.error("[VoiceCall] Error processing pending call:", err);
      }
    };

    // Check immediately and after a short delay (in case of race conditions)
    checkPendingCall();
    const timer = setTimeout(checkPendingCall, 500);

    return () => clearTimeout(timer);
  }, [user?.id]);

  // Check for missed call from push notification (deep linking)
  useEffect(() => {
    if (!user?.id) return;

    const checkMissedCall = () => {
      const missedCallData = sessionStorage.getItem("missedCall");
      if (!missedCallData) return;

      console.log("[VoiceCall] Found missed call from notification:", missedCallData);
      sessionStorage.removeItem("missedCall");

      try {
        const missedCall = JSON.parse(missedCallData);
        const callerName = missedCall.callerName || "Utilisateur";
        const callType = missedCall.callType === "video" ? "vidéo" : "vocal";

        toast({
          title: "📞 Appel manqué",
          description: `Vous avez manqué un appel ${callType} de ${callerName}`,
          variant: "destructive",
        });
      } catch (err) {
        console.error("[VoiceCall] Error processing missed call:", err);
      }
    };

    // Check immediately and after a short delay
    checkMissedCall();
    const timer = setTimeout(checkMissedCall, 500);

    return () => clearTimeout(timer);
  }, [user?.id]);

  // Listen for incoming calls
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`calls-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "call_sessions",
          filter: `callee_id=eq.${user.id}`,
        },
        async (payload) => {
          const call = payload.new as any;
          if (call.status === "ringing") {
            // Fetch caller info
            const { data: callerProfile } = await supabase
              .from("profiles")
              .select("display_name, avatar_url")
              .eq("user_id", call.caller_id)
              .maybeSingle();

            setCallState({
              isInCall: false,
              isRinging: true,
              isIncoming: true,
              callId: call.id,
              callType: call.call_type,
              remoteUserId: call.caller_id,
              remoteUserName: callerProfile?.display_name || "Utilisateur",
              remoteUserPhoto: callerProfile?.avatar_url || null,
              isMuted: false,
              duration: 0,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // Listen for call status updates
  useEffect(() => {
    if (!callState.callId || !user?.id) return;

    const channel = supabase
      .channel(`call-status-${callState.callId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "call_sessions",
          filter: `id=eq.${callState.callId}`,
        },
        (payload) => {
          const call = payload.new as any;
          if (call.status === "rejected" || call.status === "ended" || call.status === "missed") {
            endCall();
          } else if (call.status === "accepted" && !callState.isIncoming) {
            // Caller: call was accepted, start WebRTC
            setupWebRTCAsOfferer();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [callState.callId, callState.isIncoming, user?.id]);

  const sendSignal = async (callId: string, receiverId: string, signalType: string, signalData: any) => {
    if (!user?.id) return;
    
    try {
      await (supabase as any).from("call_signals").insert({
        call_id: callId,
        sender_id: user.id,
        receiver_id: receiverId,
        signal_type: signalType,
        signal_data: signalData,
      });
    } catch (err) {
      console.error("Error sending signal:", err);
    }
  };

  const setupSignaling = useCallback((callId: string) => {
    if (!user?.id) return;

    signalChannelRef.current = supabase
      .channel(`call-signals-${callId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "call_signals",
          filter: `call_id=eq.${callId}`,
        },
        async (payload) => {
          const signal = payload.new as any;
          if (signal.receiver_id !== user.id) return;

          const pc = peerConnectionRef.current;
          if (!pc) return;

          try {
            if (signal.signal_type === "offer") {
              await pc.setRemoteDescription(new RTCSessionDescription(signal.signal_data));
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              await sendSignal(callId, signal.sender_id, "answer", answer);
            } else if (signal.signal_type === "answer") {
              await pc.setRemoteDescription(new RTCSessionDescription(signal.signal_data));
            } else if (signal.signal_type === "ice-candidate") {
              await pc.addIceCandidate(new RTCIceCandidate(signal.signal_data));
            }
          } catch (err) {
            console.error("Signal handling error:", err);
          }
        }
      )
      .subscribe();
  }, [user?.id]);

  const setupWebRTCAsOfferer = useCallback(async () => {
    if (!user?.id || !callState.remoteUserId || !callState.callId) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: true, 
        video: callState.callType === "video" 
      });
      localStreamRef.current = stream;

      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      peerConnectionRef.current = pc;

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        console.log("[VoiceCall] ontrack received:", event.streams[0]);
        remoteStreamRef.current = event.streams[0];
        
        // Try to attach to audio element immediately
        if (remoteAudioRef.current) {
          console.log("[VoiceCall] Attaching remote stream to audio element");
          remoteAudioRef.current.srcObject = event.streams[0];
          remoteAudioRef.current.muted = false;
          remoteAudioRef.current.volume = 1.0;
          remoteAudioRef.current.play().then(() => {
            console.log("[VoiceCall] Remote audio playback started in ontrack");
          }).catch((err) => {
            console.warn("[VoiceCall] Failed to auto-play remote audio:", err);
          });
        }
      };

      pc.onicecandidate = async (event) => {
        if (event.candidate && callState.remoteUserId && callState.callId) {
          await sendSignal(callState.callId, callState.remoteUserId, "ice-candidate", event.candidate.toJSON());
        }
      };

      setupSignaling(callState.callId);

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      await sendSignal(callState.callId, callState.remoteUserId, "offer", offer);

      setCallState((prev) => ({ ...prev, isInCall: true, isRinging: false }));
      startDurationTimer();
    } catch (error) {
      console.error("Error setting up WebRTC:", error);
      endCall();
    }
  }, [user?.id, callState.remoteUserId, callState.callId, callState.callType, setupSignaling]);

  const setupWebRTCAsAnswerer = useCallback(async () => {
    if (!user?.id || !callState.callId) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: true, 
        video: callState.callType === "video" 
      });
      localStreamRef.current = stream;

      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      peerConnectionRef.current = pc;

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        console.log("[VoiceCall] ontrack received (answerer):", event.streams[0]);
        remoteStreamRef.current = event.streams[0];
        
        // Try to attach to audio element immediately
        if (remoteAudioRef.current) {
          console.log("[VoiceCall] Attaching remote stream to audio element (answerer)");
          remoteAudioRef.current.srcObject = event.streams[0];
          remoteAudioRef.current.muted = false;
          remoteAudioRef.current.volume = 1.0;
          remoteAudioRef.current.play().then(() => {
            console.log("[VoiceCall] Remote audio playback started in ontrack (answerer)");
          }).catch((err) => {
            console.warn("[VoiceCall] Failed to auto-play remote audio (answerer):", err);
          });
        }
      };

      pc.onicecandidate = async (event) => {
        if (event.candidate && callState.remoteUserId && callState.callId) {
          await sendSignal(callState.callId, callState.remoteUserId, "ice-candidate", event.candidate.toJSON());
        }
      };

      setupSignaling(callState.callId);
      setCallState((prev) => ({ ...prev, isInCall: true, isRinging: false }));
      startDurationTimer();
    } catch (error) {
      console.error("Error setting up WebRTC:", error);
      endCall();
    }
  }, [user?.id, callState.callId, callState.callType, callState.remoteUserId, setupSignaling]);

  const startDurationTimer = useCallback(() => {
    durationIntervalRef.current = setInterval(() => {
      setCallState((prev) => ({ ...prev, duration: prev.duration + 1 }));
    }, 1000);
  }, []);

  const initiateCall = useCallback(async (
    targetUserId: string,
    targetUserName: string,
    targetUserPhoto: string | null,
    type: "audio" | "video" = "audio"
  ) => {
    if (!user?.id) return;

    try {
      // Get caller's name for notification
      const { data: callerProfile } = await supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("user_id", user.id)
        .maybeSingle();

      // Create call session
      const { data: call, error } = await (supabase as any)
        .from("call_sessions")
        .insert({
          caller_id: user.id,
          callee_id: targetUserId,
          call_type: type,
          status: "ringing",
        })
        .select()
        .single();

      if (error) throw error;

      // Send push notification to callee
      try {
        await supabase.functions.invoke("notify-call", {
          body: {
            calleeId: targetUserId,
            callerName: callerProfile?.display_name || "Utilisateur",
            callerPhoto: callerProfile?.avatar_url || null,
            callId: call.id,
            callType: type,
          },
        });
      } catch (notifError) {
        console.warn("Could not send call notification:", notifError);
        // Don't fail the call if notification fails
      }

      setCallState({
        isInCall: false,
        isRinging: true,
        isIncoming: false,
        callId: call.id,
        callType: type,
        remoteUserId: targetUserId,
        remoteUserName: targetUserName,
        remoteUserPhoto: targetUserPhoto,
        isMuted: false,
        duration: 0,
      });

      // Start call timeout - mark as missed after 60 seconds
      callTimeoutRef.current = setTimeout(async () => {
        console.log("Call timeout reached, marking as missed");
        
        // Update call status to missed
        await (supabase as any)
          .from("call_sessions")
          .update({ status: "missed", ended_at: new Date().toISOString() })
          .eq("id", call.id);

        // Send missed call notification
        try {
          await supabase.functions.invoke("notify-missed-call", {
            body: {
              calleeId: targetUserId,
              callerName: callerProfile?.display_name || "Utilisateur",
              callerPhoto: callerProfile?.avatar_url || null,
              callId: call.id,
              callType: type,
            },
          });
        } catch (notifError) {
          console.warn("Could not send missed call notification:", notifError);
        }

        // Reset call state
        setCallState({
          isInCall: false,
          isRinging: false,
          isIncoming: false,
          callId: null,
          callType: "audio",
          remoteUserId: null,
          remoteUserName: null,
          remoteUserPhoto: null,
          isMuted: false,
          duration: 0,
        });
      }, CALL_TIMEOUT_MS);
    } catch (error) {
      console.error("Error initiating call:", error);
    }
  }, [user?.id]);

  const acceptCall = useCallback(async () => {
    if (!callState.callId) return;

    // Clear any existing call timeout (for incoming calls that were answered)
    if (callTimeoutRef.current) {
      clearTimeout(callTimeoutRef.current);
      callTimeoutRef.current = null;
    }

    try {
      await (supabase as any)
        .from("call_sessions")
        .update({ status: "accepted", started_at: new Date().toISOString() })
        .eq("id", callState.callId);

      await setupWebRTCAsAnswerer();
    } catch (error) {
      console.error("Error accepting call:", error);
    }
  }, [callState.callId, setupWebRTCAsAnswerer]);

  const rejectCall = useCallback(async () => {
    if (!callState.callId) return;

    try {
      await (supabase as any)
        .from("call_sessions")
        .update({ status: "rejected", ended_at: new Date().toISOString() })
        .eq("id", callState.callId);

      setCallState({
        isInCall: false,
        isRinging: false,
        isIncoming: false,
        callId: null,
        callType: "audio",
        remoteUserId: null,
        remoteUserName: null,
        remoteUserPhoto: null,
        isMuted: false,
        duration: 0,
      });
    } catch (error) {
      console.error("Error rejecting call:", error);
    }
  }, [callState.callId]);

  const endCall = useCallback(async () => {
    // Stop call timeout
    if (callTimeoutRef.current) {
      clearTimeout(callTimeoutRef.current);
      callTimeoutRef.current = null;
    }

    // Stop duration timer
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    // Update call status in database
    if (callState.callId) {
      await (supabase as any)
        .from("call_sessions")
        .update({ 
          status: "ended", 
          ended_at: new Date().toISOString(),
          duration_seconds: callState.duration,
        })
        .eq("id", callState.callId);
    }

    // Clean up WebRTC
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    if (signalChannelRef.current) {
      supabase.removeChannel(signalChannelRef.current);
      signalChannelRef.current = null;
    }

    remoteStreamRef.current = null;

    setCallState({
      isInCall: false,
      isRinging: false,
      isIncoming: false,
      callId: null,
      callType: "audio",
      remoteUserId: null,
      remoteUserName: null,
      remoteUserPhoto: null,
      isMuted: false,
      duration: 0,
    });
  }, [callState.callId, callState.duration]);

  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setCallState((prev) => ({ ...prev, isMuted: !audioTrack.enabled }));
      }
    }
  }, []);

  const formatDuration = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }, []);

  return {
    callState,
    initiateCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    formatDuration,
    remoteAudioRef,
    localStreamRef,
    remoteStreamRef,
  };
};
