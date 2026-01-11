import { useState, useRef, useCallback, useEffect } from "react";

interface UseLocalStreamOptions {
  autoStart?: boolean;
}

export const useLocalStream = ({ autoStart = false }: UseLocalStreamOptions = {}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Initialize camera
  const initCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: 1280, height: 720 },
        audio: true,
      });
      setStream(mediaStream);
      setIsInitialized(true);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }

      return mediaStream;
    } catch (err) {
      console.error("Camera access error:", err);
      setIsInitialized(false);
      return null;
    }
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
        video: { facingMode: newFacingMode, width: 1280, height: 720 },
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
    initCamera,
    stopStream,
    toggleMute,
    toggleVideo,
    switchCamera,
    setVideoRef,
    videoRef,
  };
};
