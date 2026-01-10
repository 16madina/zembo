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

    const initFaceLandmarker = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const { FaceLandmarker, FilesetResolver } = await import("@mediapipe/tasks-vision");

        const filesetResolver = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm"
        );

        const faceLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
            delegate: "GPU"
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
        setIsLoading(false);

        // Start detection loop
        let lastVideoTime = -1;
        
        const detectFace = () => {
          if (!isMounted || !videoRef.current || !faceLandmarkerRef.current) return;
          
          const video = videoRef.current;
          
          if (video.readyState >= 2 && video.currentTime !== lastVideoTime) {
            lastVideoTime = video.currentTime;
            
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
              console.error("Detection error:", err);
            }
          }
          
          animationFrameRef.current = requestAnimationFrame(detectFace);
        };

        // Wait for video to be ready
        const checkVideoReady = () => {
          if (!isMounted) return;
          if (videoRef.current && videoRef.current.readyState >= 2) {
            detectFace();
          } else {
            setTimeout(checkVideoReady, 100);
          }
        };

        checkVideoReady();
      } catch (err) {
        console.error("Face detection init error:", err);
        if (isMounted) {
          setError("Erreur lors de l'initialisation de la détection faciale");
          setIsLoading(false);
        }
      }
    };

    initFaceLandmarker();

    return () => {
      isMounted = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (faceLandmarkerRef.current) {
        faceLandmarkerRef.current.close();
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
