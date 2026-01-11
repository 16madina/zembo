import { useState, useRef, useCallback, useEffect } from "react";

interface UseLiveStreamOptions {
  isStreamer: boolean;
  demoMode?: boolean;
}

export const useLiveStream = ({ isStreamer, demoMode = true }: UseLiveStreamOptions) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
    }
    setIsMuted((prev) => !prev);
  }, []);

  // Toggle video
  const toggleVideo = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
    }
    setIsVideoOff((prev) => !prev);
  }, []);

  // Switch camera
  const switchCamera = useCallback(async () => {
    if (!streamRef.current) return;

    const newFacingMode = facingMode === "user" ? "environment" : "user";
    
    try {
      // Stop current video track
      streamRef.current.getVideoTracks().forEach((track) => track.stop());

      // Get new stream with different camera
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: newFacingMode, width: 1280, height: 720 },
        audio: false, // Keep existing audio track
      });

      // Replace video track
      const newVideoTrack = newStream.getVideoTracks()[0];
      const oldVideoTrack = streamRef.current.getVideoTracks()[0];
      
      if (oldVideoTrack) {
        streamRef.current.removeTrack(oldVideoTrack);
      }
      streamRef.current.addTrack(newVideoTrack);

      // Update video element
      if (videoRef.current) {
        videoRef.current.srcObject = streamRef.current;
      }

      setFacingMode(newFacingMode);
    } catch (err) {
      console.error("Failed to switch camera:", err);
    }
  }, [facingMode]);

  // Initialize stream
  const initStream = useCallback(async () => {
    if (!isStreamer || !demoMode) return null;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: 1280, height: 720 },
        audio: true,
      });
      streamRef.current = stream;
      return stream;
    } catch (err) {
      console.error("Failed to initialize stream:", err);
      return null;
    }
  }, [isStreamer, demoMode, facingMode]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  // Set video ref
  const setVideoRef = useCallback((ref: HTMLVideoElement | null) => {
    videoRef.current = ref;
    if (ref && streamRef.current) {
      ref.srcObject = streamRef.current;
    }
  }, []);

  return {
    isMuted,
    isVideoOff,
    facingMode,
    streamRef,
    toggleMute,
    toggleVideo,
    switchCamera,
    initStream,
    setVideoRef,
  };
};
