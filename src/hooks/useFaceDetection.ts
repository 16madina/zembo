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

export const useFaceDetection = ({ videoRef, enabled, onDetection }: UseFaceDetectionProps) => {
  const [isLoading, setIsLoading] = useState(true);
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
  const initAttemptRef = useRef(0);

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

  useEffect(() => {
    if (!enabled) return;

    let isMounted = true;
    const isMobile = isMobileDevice();

    const initFaceLandmarker = async (useGPU: boolean = true) => {
      try {
        setIsLoading(true);
        setError(null);
        initAttemptRef.current++;
        const attemptNumber = initAttemptRef.current;

        console.log(`[FaceDetection] Init attempt ${attemptNumber}, GPU: ${useGPU}, Mobile: ${isMobile}`);

        const { FaceLandmarker, FilesetResolver } = await import("@mediapipe/tasks-vision");

        // Use a more compatible WASM version for mobile
        const wasmUrl = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm";
        
        console.log("[FaceDetection] Loading FilesetResolver...");
        const filesetResolver = await FilesetResolver.forVisionTasks(wasmUrl);
        console.log("[FaceDetection] FilesetResolver loaded successfully");

        // Determine delegate based on device and retry attempt
        // On mobile, prefer CPU as GPU WebGL support is inconsistent
        const delegate = (isMobile || !useGPU) ? "CPU" : "GPU";
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
        setIsLoading(false);
        setError(null);

        // Start detection loop
        let lastVideoTime = -1;
        let frameCount = 0;
        
        const detectFace = () => {
          if (!isMounted || !videoRef.current || !faceLandmarkerRef.current) return;
          
          const video = videoRef.current;
          
          if (video.readyState >= 2 && video.currentTime !== lastVideoTime) {
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
                onDetection?.(newResult);
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
                onDetection?.(noFaceResult);
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

        // Wait for video to be ready with timeout
        let videoCheckCount = 0;
        const maxVideoChecks = 100; // 10 seconds max wait

        const checkVideoReady = () => {
          if (!isMounted) return;
          
          videoCheckCount++;
          
          if (videoRef.current && videoRef.current.readyState >= 2) {
            console.log("[FaceDetection] Video ready, starting detection loop");
            detectFace();
          } else if (videoCheckCount < maxVideoChecks) {
            setTimeout(checkVideoReady, 100);
          } else {
            console.warn("[FaceDetection] Video not ready after timeout");
            setError("La caméra met trop de temps à démarrer");
            setIsLoading(false);
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
          const errorMessage = err?.message || "Erreur inconnue";
          setError(`Erreur d'initialisation: ${errorMessage}`);
          setIsLoading(false);
        }
      }
    };

    // Add a loading timeout - if still loading after 15 seconds, show error
    const loadingTimeout = setTimeout(() => {
      if (isLoading && isMounted) {
        console.error("[FaceDetection] Loading timeout reached");
        setError("Le chargement de l'IA prend trop de temps. Veuillez réessayer.");
        setIsLoading(false);
      }
    }, 15000);

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
    };
  }, [enabled, videoRef, calculateHeadPose, onDetection]);

  return {
    isLoading,
    error,
    result: currentResult,
  };
};
