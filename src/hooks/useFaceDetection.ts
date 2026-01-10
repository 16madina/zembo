import { useEffect, useRef, useState, useCallback } from "react";

export type FaceDirection = "center" | "left" | "right" | "none";

interface FaceDetectionResult {
  isDetected: boolean;
  direction: FaceDirection;
  confidence: number;
  yaw: number; // Head rotation left/right
  pitch: number; // Head rotation up/down
}

interface UseFaceDetectionProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  enabled: boolean;
  onDetection?: (result: FaceDetectionResult) => void;
}

// Landmark indices for head pose estimation
const NOSE_TIP = 1;
const CHIN = 152;
const LEFT_EYE_OUTER = 33;
const RIGHT_EYE_OUTER = 263;
const LEFT_EAR = 234;
const RIGHT_EAR = 454;

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
  
  const faceMeshRef = useRef<any>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastDetectionRef = useRef<FaceDetectionResult>(currentResult);

  const calculateHeadPose = useCallback((landmarks: any[]) => {
    // Get key landmarks
    const noseTip = landmarks[NOSE_TIP];
    const leftEyeOuter = landmarks[LEFT_EYE_OUTER];
    const rightEyeOuter = landmarks[RIGHT_EYE_OUTER];
    const leftEar = landmarks[LEFT_EAR];
    const rightEar = landmarks[RIGHT_EAR];

    // Calculate yaw (horizontal rotation) based on nose position relative to eyes
    const eyeCenter = {
      x: (leftEyeOuter.x + rightEyeOuter.x) / 2,
      y: (leftEyeOuter.y + rightEyeOuter.y) / 2,
    };
    
    // Distance from nose to eye center (horizontal)
    const noseOffset = noseTip.x - eyeCenter.x;
    
    // Calculate eye distance for normalization
    const eyeDistance = Math.abs(rightEyeOuter.x - leftEyeOuter.x);
    
    // Normalized yaw (-1 to 1, negative = looking left, positive = looking right)
    // When looking left, nose moves right relative to eyes (from camera perspective)
    // But since video is mirrored, we invert this
    const yaw = -(noseOffset / (eyeDistance * 0.5)) * 45; // Convert to approximate degrees

    // Calculate pitch based on nose tip relative to eye level
    const nosePitchOffset = noseTip.y - eyeCenter.y;
    const pitch = (nosePitchOffset / eyeDistance) * 30;

    // Determine direction based on yaw
    let direction: FaceDirection = "center";
    if (yaw < -15) {
      direction = "left";
    } else if (yaw > 15) {
      direction = "right";
    }

    // Confidence based on how well we can detect the face
    const earDistance = Math.abs(rightEar.x - leftEar.x);
    const confidence = Math.min(1, (eyeDistance / 0.15) * (earDistance > 0.05 ? 1 : 0.5));

    return { yaw, pitch, direction, confidence };
  }, []);

  useEffect(() => {
    if (!enabled) return;

    let isMounted = true;

    const initFaceMesh = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Dynamically import MediaPipe
        const { FaceMesh } = await import("@mediapipe/face_mesh");

        const faceMesh = new FaceMesh({
          locateFile: (file: string) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
          },
        });

        faceMesh.setOptions({
          maxNumFaces: 1,
          refineLandmarks: true,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        faceMesh.onResults((results: any) => {
          if (!isMounted) return;

          if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
            const landmarks = results.multiFaceLandmarks[0];
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
        });

        faceMeshRef.current = faceMesh;
        setIsLoading(false);

        // Start detection loop
        const detectFace = async () => {
          if (!isMounted || !videoRef.current || !faceMeshRef.current) return;
          
          const video = videoRef.current;
          if (video.readyState >= 2) {
            await faceMeshRef.current.send({ image: video });
          }
          
          animationFrameRef.current = requestAnimationFrame(detectFace);
        };

        // Wait for video to be ready
        const checkVideoReady = () => {
          if (videoRef.current && videoRef.current.readyState >= 2) {
            detectFace();
          } else {
            setTimeout(checkVideoReady, 100);
          }
        };

        checkVideoReady();
      } catch (err) {
        console.error("Face detection error:", err);
        if (isMounted) {
          setError("Erreur lors de l'initialisation de la détection faciale");
          setIsLoading(false);
        }
      }
    };

    initFaceMesh();

    return () => {
      isMounted = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (faceMeshRef.current) {
        faceMeshRef.current.close();
        faceMeshRef.current = null;
      }
    };
  }, [enabled, videoRef, calculateHeadPose, onDetection]);

  return {
    isLoading,
    error,
    result: currentResult,
  };
};
