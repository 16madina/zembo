import { useEffect, useRef, useState, useCallback } from "react";

export type FaceDirection = "center" | "left" | "right" | "none";

interface FaceDetectionResult {
  isDetected: boolean;
  direction: FaceDirection;
  confidence: number;
  yaw: number;
  pitch: number;
}

interface UseFaceDetectionProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  enabled: boolean;
  onDetection?: (result: FaceDetectionResult) => void;
}

// Check if we're on mobile
const isMobileDevice = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

// Check if we're on Android specifically
const isAndroidDevice = () => {
  return /Android/i.test(navigator.userAgent);
};

export const useFaceDetection = ({ videoRef, enabled, onDetection }: UseFaceDetectionProps) => {
  const [isLoading, setIsLoading] = useState<boolean>(enabled);
  const [error, setError] = useState<string | null>(null);
  const [currentResult, setCurrentResult] = useState<FaceDetectionResult>({
    isDetected: false,
    direction: "none",
    confidence: 0,
    yaw: 0,
    pitch: 0,
  });

  const faceLandmarkerRef = useRef<any>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastDetectionRef = useRef<FaceDetectionResult>(currentResult);
  const isInitializedRef = useRef(false);
  const isInitializingRef = useRef(false);
  // Store callback in ref to avoid re-triggering useEffect
  const onDetectionRef = useRef(onDetection);
  onDetectionRef.current = onDetection;

  const calculateHeadPose = useCallback((landmarks: any[]) => {
    // Key landmark indices for head pose
    const noseTip = landmarks[1];
    const leftEyeOuter = landmarks[33];
    const rightEyeOuter = landmarks[263];
    const leftEar = landmarks[234];
    const rightEar = landmarks[454];

    // Calculate eye center
    const eyeCenter = {
      x: (leftEyeOuter.x + rightEyeOuter.x) / 2,
      y: (leftEyeOuter.y + rightEyeOuter.y) / 2,
    };

    // Distance from nose to eye center
    const noseOffset = noseTip.x - eyeCenter.x;
    const eyeDistance = Math.abs(rightEyeOuter.x - leftEyeOuter.x);

    // Yaw calculation (inverted because video is mirrored)
    const yaw = -(noseOffset / (eyeDistance * 0.5)) * 45;

    // Pitch calculation
    const nosePitchOffset = noseTip.y - eyeCenter.y;
    const pitch = (nosePitchOffset / eyeDistance) * 30;

    // Determine direction
    let direction: FaceDirection = "center";
    if (yaw < -15) {
      direction = "left";
    } else if (yaw > 15) {
      direction = "right";
    }

    // Confidence based on landmark visibility
    const earDistance = Math.abs(rightEar.x - leftEar.x);
    const confidence = Math.min(1, (eyeDistance / 0.15) * (earDistance > 0.05 ? 1 : 0.5));

    return { yaw, pitch, direction, confidence };
  }, []);

  // Store videoRef in a stable ref to avoid triggering useEffect
  const videoRefStable = useRef(videoRef.current);
  videoRefStable.current = videoRef.current;

  // Important: when disabled, don't report "loading" (prevents infinite UI spinners)
  useEffect(() => {
    if (enabled) return;

    setIsLoading(false);
    setError(null);

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, [enabled]);

  useEffect(() => {
    // Prevent re-initialization if already done or in progress
    if (!enabled || isInitializedRef.current || isInitializingRef.current) {
      return;
    }

    let isMounted = true;
    const isMobile = isMobileDevice();
    const isAndroid = isAndroidDevice();
    isInitializingRef.current = true;

    const initFaceLandmarker = async (useGPU: boolean = true) => {
      try {
        setIsLoading(true);
        setError(null);

        console.log(`[FaceDetection] Init, GPU: ${useGPU}, Mobile: ${isMobile}, Android: ${isAndroid}`);

        const { FaceLandmarker, FilesetResolver } = await import("@mediapipe/tasks-vision");

        if (!isMounted) return;

        // Use a more compatible WASM version for mobile
        // For Android, use an older more stable version
        const wasmUrl = isAndroid 
          ? "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
          : "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm";
        
        console.log(`[FaceDetection] Loading FilesetResolver from ${wasmUrl}...`);
        const filesetResolver = await FilesetResolver.forVisionTasks(wasmUrl);
        
        if (!isMounted) return;
        
        console.log("[FaceDetection] FilesetResolver loaded successfully");

        // On Android and mobile, always use CPU for stability
        // GPU WebGL support is very inconsistent on Android WebViews
        const delegate = (isAndroid || isMobile || !useGPU) ? "CPU" : "GPU";
        console.log(`[FaceDetection] Creating FaceLandmarker with delegate: ${delegate}`);

        const faceLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
            delegate: delegate as "GPU" | "CPU"
          },
          outputFaceBlendshapes: false,
          runningMode: "VIDEO",
          numFaces: 1
        });

        console.log("[FaceDetection] FaceLandmarker created successfully");

        if (!isMounted) {
          faceLandmarker.close();
          return;
        }

        faceLandmarkerRef.current = faceLandmarker;
        isInitializedRef.current = true;
        isInitializingRef.current = false;
        setIsLoading(false);
        setError(null);

        // Start detection loop
        let lastVideoTime = -1;
        let frameCount = 0;
        
        const detectFace = () => {
          if (!isMounted || !videoRefStable.current || !faceLandmarkerRef.current) return;
          
          const video = videoRefStable.current;
          
          // More robust video ready check for WebView
          const hasFrames = video.videoWidth > 0 && video.videoHeight > 0;
          const isReady = hasFrames || video.readyState >= 2;
          
          if (isReady && video.currentTime !== lastVideoTime) {
            lastVideoTime = video.currentTime;
            frameCount++;
            
            try {
              const results = faceLandmarkerRef.current.detectForVideo(video, performance.now());
              
              if (results.faceLandmarks && results.faceLandmarks.length > 0) {
                const landmarks = results.faceLandmarks[0];
                const { yaw, pitch, direction, confidence } = calculateHeadPose(landmarks);

                const newResult: FaceDetectionResult = {
                  isDetected: true,
                  direction,
                  confidence,
                  yaw,
                  pitch,
                };

                lastDetectionRef.current = newResult;
                setCurrentResult(newResult);
                onDetectionRef.current?.(newResult);
              } else {
                const noFaceResult: FaceDetectionResult = {
                  isDetected: false,
                  direction: "none",
                  confidence: 0,
                  yaw: 0,
                  pitch: 0,
                };
                lastDetectionRef.current = noFaceResult;
                setCurrentResult(noFaceResult);
                onDetectionRef.current?.(noFaceResult);
              }
            } catch (err) {
              // Log every 60 frames to avoid spam
              if (frameCount % 60 === 0) {
                console.error("[FaceDetection] Detection error:", err);
              }
            }
          }
          
          animationFrameRef.current = requestAnimationFrame(detectFace);
        };

        // Wait for video to be ready with timeout - use robust check for WebView
        let videoCheckCount = 0;
        const maxVideoChecks = 150; // 15 seconds max wait (150 * 100ms)
        const checkStartTime = Date.now();

        const checkVideoReady = () => {
          if (!isMounted) return;
          
          videoCheckCount++;
          const video = videoRefStable.current;
          
          if (!video) {
            if (videoCheckCount < maxVideoChecks) {
              setTimeout(checkVideoReady, 100);
            }
            return;
          }
          
          // More robust check: video has dimensions OR readyState >= 2
          const hasFrames = (video.videoWidth ?? 0) > 0 && (video.videoHeight ?? 0) > 0;
          const isReady = hasFrames || (video.readyState ?? 0) >= 2;
          
          // Try to play if video is paused but has a stream
          if (!isReady && video.srcObject && video.paused) {
            video.play().catch(() => {});
          }
          
          if (isReady) {
            console.log(`[FaceDetection] Video ready (hasFrames=${hasFrames}, readyState=${video.readyState}), starting detection loop`);
            detectFace();
          } else if (videoCheckCount < maxVideoChecks) {
            // Log periodically for debugging
            if (videoCheckCount % 10 === 0) {
              console.log(`[FaceDetection] Waiting for video... check ${videoCheckCount}, readyState=${video.readyState}, dimensions=${video.videoWidth}x${video.videoHeight}, paused=${video.paused}`);
            }
            setTimeout(checkVideoReady, 100);
          } else {
            const elapsed = Date.now() - checkStartTime;
            console.warn(`[FaceDetection] Video not ready after ${elapsed}ms, readyState=${video.readyState}, dimensions=${video.videoWidth}x${video.videoHeight}`);
            setError("La caméra met trop de temps à démarrer");
            setIsLoading(false);
            isInitializingRef.current = false;
          }
        };

        checkVideoReady();
      } catch (err: any) {
        console.error("[FaceDetection] Init error:", err);
        
        // If GPU failed and we haven't tried CPU yet, retry with CPU
        if (useGPU && !isMobile && isMounted) {
          console.log("[FaceDetection] GPU init failed, retrying with CPU...");
          await initFaceLandmarker(false);
          return;
        }
        
        if (isMounted) {
          isInitializingRef.current = false;
          const errorMessage = err?.message || "Erreur inconnue";
          setError(`Erreur d'initialisation: ${errorMessage}`);
          setIsLoading(false);
        }
      }
    };

    // Add a loading timeout - if still loading after timeout, show error
    // Extended timeout for Android (25s) vs iOS/desktop (15s)
    const timeoutMs = isAndroidDevice() ? 25000 : 15000;
    const loadingTimeout = setTimeout(() => {
      if (isMounted && enabled && !isInitializedRef.current) {
        console.error(`[FaceDetection] Loading timeout reached (${timeoutMs}ms)`);
        setError("Le chargement de l'IA prend trop de temps. Veuillez réessayer.");
        setIsLoading(false);
        isInitializingRef.current = false;
      }
    }, timeoutMs);

    initFaceLandmarker(!isMobile); // Start with GPU on desktop, CPU on mobile

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
          console.error("[FaceDetection] Error closing FaceLandmarker:", e);
        }
        faceLandmarkerRef.current = null;
      }
      isInitializedRef.current = false;
      isInitializingRef.current = false;
    };
  }, [enabled, calculateHeadPose]); // Removed videoRef from dependencies

  return {
    isLoading,
    error,
    result: currentResult,
  };
};
