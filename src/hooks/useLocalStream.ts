import { useState, useRef, useCallback, useEffect } from "react";

interface UseLocalStreamOptions {
  autoStart?: boolean;
}

// Detect Android
const isAndroid = (): boolean => {
  if (typeof window === "undefined") return false;
  return /Android/.test(navigator.userAgent);
};

// Detect iOS
const isIOS = (): boolean => {
  if (typeof window === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
};

export const useLocalStream = ({ autoStart = false }: UseLocalStreamOptions = {}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const initAttemptRef = useRef(0);

  // Initialize camera with robust fallback for Android/iOS
  const initCamera = useCallback(async () => {
    console.log("[useLocalStream] Initializing camera...", {
      isAndroid: isAndroid(),
      isIOS: isIOS(),
      attempt: initAttemptRef.current + 1,
      userAgent: navigator.userAgent,
    });

    initAttemptRef.current += 1;
    setError(null);

    // Define constraint sets to try in order (from most preferred to most basic)
    // CRITICAL: Use explicit "user" facingMode for front camera on mobile
    const constraintSets: MediaStreamConstraints[] = [
      // Try 1: Ideal resolution for live streaming
      {
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      },
      // Try 2: Lower resolution for older devices
      {
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: true,
      },
      // Try 3: Very basic constraints for problematic WebViews
      {
        video: { facingMode: "user" },
        audio: true,
      },
      // Try 4: Just video, no specific constraints (last resort)
      {
        video: true,
        audio: true,
      },
    ];

    for (let i = 0; i < constraintSets.length; i++) {
      const constraints = constraintSets[i];
      console.log(`[useLocalStream] Trying constraints set ${i + 1}/${constraintSets.length}:`, JSON.stringify(constraints));

      try {
        // Add timeout for getUserMedia (can hang on some Android WebViews)
        // INCREASED to 15s for slow mobile devices
        const mediaPromise = navigator.mediaDevices.getUserMedia(constraints);
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error("getUserMedia timeout after 15s")), 15000);
        });

        const mediaStream = await Promise.race([mediaPromise, timeoutPromise]);

        // Verify we actually got tracks
        const videoTracks = mediaStream.getVideoTracks();
        const audioTracks = mediaStream.getAudioTracks();
        
        console.log("[useLocalStream] ✓ Got stream:", {
          videoTracks: videoTracks.length,
          audioTracks: audioTracks.length,
          videoTrackState: videoTracks[0]?.readyState,
          audioTrackState: audioTracks[0]?.readyState,
          videoTrackLabel: videoTracks[0]?.label,
        });

        if (videoTracks.length === 0) {
          console.warn("[useLocalStream] No video tracks, trying next constraint set...");
          continue;
        }

        setStream(mediaStream);
        setIsInitialized(true);

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          // Force play on Android WebViews
          try {
            await videoRef.current.play();
            console.log("[useLocalStream] ✓ Video element play() successful");
          } catch (playErr: any) {
            console.warn("[useLocalStream] Video play failed (may need user interaction):", playErr?.message);
          }
        }

        return mediaStream;
      } catch (err: any) {
        console.error(`[useLocalStream] ❌ Constraint set ${i + 1} failed`);
        console.error("[useLocalStream] Error name:", err?.name);
        console.error("[useLocalStream] Error message:", err?.message);
        
        // If it's a permission error, stop trying
        if (err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError") {
          console.error("[useLocalStream] ❌ Camera permission denied by user or system");
          setError("Camera permission denied");
          setIsInitialized(false);
          return null;
        }
        
        // If it's a device not found error, stop trying
        if (err?.name === "NotFoundError" || err?.name === "DevicesNotFoundError") {
          console.error("[useLocalStream] ❌ No camera device found on this device");
          setError("No camera found");
          setIsInitialized(false);
          return null;
        }

        // If it's a timeout, log it specifically
        if (err?.message?.includes("timeout")) {
          console.error("[useLocalStream] ❌ getUserMedia timed out - WebView may be blocking camera access");
        }
        
        // Continue to next constraint set
        console.log(`[useLocalStream] Trying next constraint set...`);
      }
    }

    // All constraint sets failed
    console.error("[useLocalStream] ❌ All constraint sets failed - camera could not be accessed");
    console.error("[useLocalStream] This may be a WebView restriction or hardware issue");
    setError("Could not access camera");
    setIsInitialized(false);
    return null;
  }, [facingMode]);

  // Stop all tracks
  const stopStream = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
      setIsInitialized(false);
    }
  }, [stream]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (stream) {
      stream.getAudioTracks().forEach((track) => {
        track.enabled = isMuted; // Toggle: if muted, enable; if not muted, disable
      });
    }
    setIsMuted(!isMuted);
  }, [stream, isMuted]);

  // Toggle video
  const toggleVideo = useCallback(() => {
    if (stream) {
      stream.getVideoTracks().forEach((track) => {
        track.enabled = isVideoOff; // Toggle: if off, enable; if on, disable
      });
    }
    setIsVideoOff(!isVideoOff);
  }, [stream, isVideoOff]);

  // Switch camera
  const switchCamera = useCallback(async () => {
    if (!stream) return;

    // Stop current video track
    stream.getVideoTracks().forEach((track) => track.stop());

    const newFacingMode = facingMode === "user" ? "environment" : "user";

    try {
      // Get new stream with different camera
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: newFacingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });

      // Replace video track in current stream
      const newVideoTrack = newStream.getVideoTracks()[0];
      const oldVideoTrack = stream.getVideoTracks()[0];

      if (oldVideoTrack) {
        stream.removeTrack(oldVideoTrack);
      }
      stream.addTrack(newVideoTrack);

      // Update video element
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      setFacingMode(newFacingMode);
    } catch (err) {
      console.error("Failed to switch camera:", err);
    }
  }, [stream, facingMode]);

  // Set video ref
  const setVideoRef = useCallback(
    (ref: HTMLVideoElement | null) => {
      videoRef.current = ref;
      if (ref && stream) {
        ref.srcObject = stream;
      }
    },
    [stream]
  );

  // Auto-start if enabled
  useEffect(() => {
    if (autoStart && !isInitialized) {
      initCamera();
    }
  }, [autoStart, isInitialized, initCamera]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  return {
    stream,
    isMuted,
    isVideoOff,
    facingMode,
    isInitialized,
    error,
    initCamera,
    stopStream,
    toggleMute,
    toggleVideo,
    switchCamera,
    setVideoRef,
    videoRef,
  };
};
