import { useEffect, useRef, useState, useCallback } from "react";

export interface FaceLandmarks {
  // Key points for AR positioning (normalized 0-1 coordinates)
  forehead: { x: number; y: number };
  leftEye: { x: number; y: number };
  rightEye: { x: number; y: number };
  noseTip: { x: number; y: number };
  leftCheek: { x: number; y: number };
  rightCheek: { x: number; y: number };
  mouthCenter: { x: number; y: number };
  chin: { x: number; y: number };
  // Face dimensions
  faceWidth: number;
  faceHeight: number;
  eyeDistance: number;
  // Head pose
  yaw: number;
  pitch: number;
  roll: number;
}

interface UseFaceTrackingProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  enabled: boolean;
}

interface UseFaceTrackingResult {
  isLoading: boolean;
  error: string | null;
  isTracking: boolean;
  landmarks: FaceLandmarks | null;
}

const DEFAULT_LANDMARKS: FaceLandmarks = {
  forehead: { x: 0.5, y: 0.15 },
  leftEye: { x: 0.35, y: 0.35 },
  rightEye: { x: 0.65, y: 0.35 },
  noseTip: { x: 0.5, y: 0.5 },
  leftCheek: { x: 0.25, y: 0.5 },
  rightCheek: { x: 0.75, y: 0.5 },
  mouthCenter: { x: 0.5, y: 0.65 },
  chin: { x: 0.5, y: 0.85 },
  faceWidth: 0.4,
  faceHeight: 0.6,
  eyeDistance: 0.3,
  yaw: 0,
  pitch: 0,
  roll: 0,
};

// Check if we're on mobile
const isMobileDevice = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

// Check if we're on iPad (Safari has issues with MediaPipe WebGL)
const isIPad = () => {
  return /iPad/i.test(navigator.userAgent) || 
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
};

export const useFaceTracking = ({ videoRef, enabled }: UseFaceTrackingProps): UseFaceTrackingResult => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [landmarks, setLandmarks] = useState<FaceLandmarks | null>(null);

  const faceLandmarkerRef = useRef<any>(null);
  const animationFrameRef = useRef<number | null>(null);
  const smoothedLandmarksRef = useRef<FaceLandmarks>(DEFAULT_LANDMARKS);
  const isInitializedRef = useRef(false);
  const isInitializingRef = useRef(false);
  // Store videoRef in a stable ref to avoid triggering useEffect
  const videoRefStable = useRef(videoRef.current);
  videoRefStable.current = videoRef.current;

  // Smooth landmarks to reduce jitter
  const smoothLandmarks = useCallback((newLandmarks: FaceLandmarks, factor: number = 0.3): FaceLandmarks => {
    const prev = smoothedLandmarksRef.current;
    
    const smooth = (newVal: number, prevVal: number) => 
      prevVal + (newVal - prevVal) * factor;

    const smoothPoint = (newPoint: { x: number; y: number }, prevPoint: { x: number; y: number }) => ({
      x: smooth(newPoint.x, prevPoint.x),
      y: smooth(newPoint.y, prevPoint.y),
    });

    return {
      forehead: smoothPoint(newLandmarks.forehead, prev.forehead),
      leftEye: smoothPoint(newLandmarks.leftEye, prev.leftEye),
      rightEye: smoothPoint(newLandmarks.rightEye, prev.rightEye),
      noseTip: smoothPoint(newLandmarks.noseTip, prev.noseTip),
      leftCheek: smoothPoint(newLandmarks.leftCheek, prev.leftCheek),
      rightCheek: smoothPoint(newLandmarks.rightCheek, prev.rightCheek),
      mouthCenter: smoothPoint(newLandmarks.mouthCenter, prev.mouthCenter),
      chin: smoothPoint(newLandmarks.chin, prev.chin),
      faceWidth: smooth(newLandmarks.faceWidth, prev.faceWidth),
      faceHeight: smooth(newLandmarks.faceHeight, prev.faceHeight),
      eyeDistance: smooth(newLandmarks.eyeDistance, prev.eyeDistance),
      yaw: smooth(newLandmarks.yaw, prev.yaw),
      pitch: smooth(newLandmarks.pitch, prev.pitch),
      roll: smooth(newLandmarks.roll, prev.roll),
    };
  }, []);

  const extractLandmarks = useCallback((rawLandmarks: any[]): FaceLandmarks => {
    // MediaPipe Face Landmarker indices
    // Full face mesh has 478 landmarks
    
    // Key indices:
    // 10: forehead center
    // 33: left eye outer, 133: left eye inner
    // 362: right eye outer, 263: right eye inner
    // 1: nose tip
    // 234: left ear, 454: right ear
    // 93: left cheek, 323: right cheek
    // 13: upper lip center, 14: lower lip center
    // 152: chin

    const forehead = rawLandmarks[10] || rawLandmarks[151];
    const leftEyeOuter = rawLandmarks[33];
    const leftEyeInner = rawLandmarks[133];
    const rightEyeOuter = rawLandmarks[263];
    const rightEyeInner = rawLandmarks[362];
    const noseTip = rawLandmarks[1];
    const leftCheek = rawLandmarks[93];
    const rightCheek = rawLandmarks[323];
    const upperLip = rawLandmarks[13];
    const lowerLip = rawLandmarks[14];
    const chin = rawLandmarks[152];
    const leftEar = rawLandmarks[234];
    const rightEar = rawLandmarks[454];

    // Calculate eye centers
    const leftEye = {
      x: (leftEyeOuter.x + leftEyeInner.x) / 2,
      y: (leftEyeOuter.y + leftEyeInner.y) / 2,
    };
    const rightEye = {
      x: (rightEyeOuter.x + rightEyeInner.x) / 2,
      y: (rightEyeOuter.y + rightEyeInner.y) / 2,
    };

    // Mouth center
    const mouthCenter = {
      x: (upperLip.x + lowerLip.x) / 2,
      y: (upperLip.y + lowerLip.y) / 2,
    };

    // Face dimensions
    const eyeDistance = Math.sqrt(
      Math.pow(rightEye.x - leftEye.x, 2) + 
      Math.pow(rightEye.y - leftEye.y, 2)
    );
    const faceWidth = Math.abs(rightEar.x - leftEar.x);
    const faceHeight = Math.abs(chin.y - forehead.y);

    // Head pose estimation
    const eyeCenter = {
      x: (leftEye.x + rightEye.x) / 2,
      y: (leftEye.y + rightEye.y) / 2,
    };
    
    // Yaw (left-right rotation) - inverted for mirrored video
    const noseOffset = noseTip.x - eyeCenter.x;
    const yaw = -(noseOffset / (eyeDistance * 0.5)) * 45;

    // Pitch (up-down rotation)
    const nosePitchOffset = noseTip.y - eyeCenter.y;
    const pitch = (nosePitchOffset / eyeDistance) * 30;

    // Roll (tilt) - angle between eyes
    const roll = Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x) * (180 / Math.PI);

    // Mirror x coordinates for mirrored video display
    const mirrorX = (x: number) => 1 - x;

    return {
      forehead: { x: mirrorX(forehead.x), y: forehead.y },
      leftEye: { x: mirrorX(leftEye.x), y: leftEye.y },
      rightEye: { x: mirrorX(rightEye.x), y: rightEye.y },
      noseTip: { x: mirrorX(noseTip.x), y: noseTip.y },
      leftCheek: { x: mirrorX(leftCheek.x), y: leftCheek.y },
      rightCheek: { x: mirrorX(rightCheek.x), y: rightCheek.y },
      mouthCenter: { x: mirrorX(mouthCenter.x), y: mouthCenter.y },
      chin: { x: mirrorX(chin.x), y: chin.y },
      faceWidth,
      faceHeight,
      eyeDistance,
      yaw,
      pitch,
      roll,
    };
  }, []);

  useEffect(() => {
    // Prevent re-initialization if already done or in progress
    if (!enabled || isInitializedRef.current || isInitializingRef.current) {
      if (!enabled) {
        setIsTracking(false);
        setLandmarks(null);
      }
      return;
    }

    // Skip face tracking on iPad - Safari has known issues with MediaPipe WebGL
    const isIPadDevice = isIPad();
    if (isIPadDevice) {
      console.log("[FaceTracking] Disabled on iPad due to WebGL compatibility issues");
      setIsLoading(false);
      setError(null);
      return;
    }

    let isMounted = true;
    const isMobile = isMobileDevice();
    isInitializingRef.current = true;

    const initFaceLandmarker = async (useGPU: boolean = true) => {
      try {
        setIsLoading(true);
        setError(null);

        console.log(`[FaceTracking] Init, GPU: ${useGPU}, Mobile: ${isMobile}`);

        const { FaceLandmarker, FilesetResolver } = await import("@mediapipe/tasks-vision");

        if (!isMounted) return;

        const filesetResolver = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm"
        );

        if (!isMounted) return;

        // On mobile, prefer CPU as GPU WebGL support is inconsistent
        const delegate = (isMobile || !useGPU) ? "CPU" : "GPU";
        console.log(`[FaceTracking] Using delegate: ${delegate}`);

        const faceLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
            delegate: delegate as "GPU" | "CPU"
          },
          outputFaceBlendshapes: false,
          runningMode: "VIDEO",
          numFaces: 1
        });

        if (!isMounted) {
          faceLandmarker.close();
          return;
        }

        faceLandmarkerRef.current = faceLandmarker;
        isInitializedRef.current = true;
        isInitializingRef.current = false;
        setIsLoading(false);
        console.log("[FaceTracking] Initialized successfully");

        // Start tracking loop
        let lastVideoTime = -1;

        const trackFace = () => {
          if (!isMounted || !videoRefStable.current || !faceLandmarkerRef.current) return;

          const video = videoRefStable.current;

          if (video.readyState >= 2 && video.currentTime !== lastVideoTime) {
            lastVideoTime = video.currentTime;

            try {
              const results = faceLandmarkerRef.current.detectForVideo(video, performance.now());

              if (results.faceLandmarks && results.faceLandmarks.length > 0) {
                const rawLandmarks = results.faceLandmarks[0];
                const extractedLandmarks = extractLandmarks(rawLandmarks);
                const smoothed = smoothLandmarks(extractedLandmarks);
                
                smoothedLandmarksRef.current = smoothed;
                setLandmarks(smoothed);
                setIsTracking(true);
              } else {
                setIsTracking(false);
                setLandmarks(null);
              }
            } catch (err) {
              console.error("[FaceTracking] Error:", err);
            }
          }

          animationFrameRef.current = requestAnimationFrame(trackFace);
        };

        // Wait for video to be ready
        let videoCheckCount = 0;
        const maxVideoChecks = 100;

        const checkVideoReady = () => {
          if (!isMounted) return;
          videoCheckCount++;
          
          if (videoRefStable.current && videoRefStable.current.readyState >= 2) {
            console.log("[FaceTracking] Video ready, starting tracking");
            trackFace();
          } else if (videoCheckCount < maxVideoChecks) {
            setTimeout(checkVideoReady, 100);
          } else {
            console.warn("[FaceTracking] Video not ready after timeout");
            setError("La caméra met trop de temps à démarrer");
            setIsLoading(false);
            isInitializingRef.current = false;
          }
        };

        checkVideoReady();
      } catch (err: any) {
        console.error("[FaceTracking] Init error:", err);
        
        // Retry with CPU if GPU failed
        if (useGPU && !isMobile && isMounted) {
          console.log("[FaceTracking] GPU failed, retrying with CPU...");
          await initFaceLandmarker(false);
          return;
        }
        
        if (isMounted) {
          isInitializingRef.current = false;
          setError(`Erreur d'initialisation: ${err?.message || "Erreur inconnue"}`);
          setIsLoading(false);
        }
      }
    };

    // Loading timeout
    const loadingTimeout = setTimeout(() => {
      if (isLoading && isMounted && !isInitializedRef.current) {
        console.error("[FaceTracking] Loading timeout");
        setError("Le chargement prend trop de temps");
        setIsLoading(false);
        isInitializingRef.current = false;
      }
    }, 15000);

    initFaceLandmarker(!isMobile);

    return () => {
      isMounted = false;
      clearTimeout(loadingTimeout);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (faceLandmarkerRef.current) {
        try {
          faceLandmarkerRef.current.close();
        } catch (e) {
          console.error("[FaceTracking] Error closing:", e);
        }
        faceLandmarkerRef.current = null;
      }
      isInitializedRef.current = false;
      isInitializingRef.current = false;
    };
  }, [enabled]); // Removed unstable dependencies

  return {
    isLoading,
    error,
    isTracking,
    landmarks,
  };
};
