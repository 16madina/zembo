import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, CheckCircle2, RotateCcw, Sparkles, Shield, AlertCircle, Loader2, UserCheck, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isNative } from "@/lib/capacitor";
import { useFaceDetection, FaceDirection } from "@/hooks/useFaceDetection";
import { useFaceRecognitionPreload } from "@/contexts/FaceRecognitionPreloadContext";
import * as faceapi from 'face-api.js';

interface FaceVerificationStepProps {
  onNext: () => void;
  onBack: () => void;
  data: { faceVerified?: boolean; photos: string[] };
  updateData: (data: { faceVerified: boolean }) => void;
}

type VerificationStep = "intro" | "center" | "left" | "right" | "comparing" | "complete" | "failed";

const verificationSteps: { id: VerificationStep; instruction: string; subtext: string; targetDirection: FaceDirection }[] = [
  { id: "center", instruction: "Regardez la caméra", subtext: "Gardez votre visage au centre du cadre", targetDirection: "center" },
  { id: "left", instruction: "Tournez la tête à gauche", subtext: "Lentement, jusqu'à ce que le cercle soit rempli", targetDirection: "left" },
  { id: "right", instruction: "Tournez la tête à droite", subtext: "Lentement, jusqu'à ce que le cercle soit rempli", targetDirection: "right" },
];

const REQUIRED_HOLD_TIME = 1500; // ms to hold position
const FACE_MATCH_THRESHOLD = 0.45; // Similarity threshold for face matching

export const FaceVerificationStep = ({ onNext, onBack, data, updateData }: FaceVerificationStepProps) => {
  const [currentStep, setCurrentStep] = useState<VerificationStep>("intro");
  const [progress, setProgress] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<VerificationStep[]>([]);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isAILoading, setIsAILoading] = useState(false);
  const [detectionStatus, setDetectionStatus] = useState<string>("");
  const [faceMatchResult, setFaceMatchResult] = useState<{ similarity: number; isMatch: boolean } | null>(null);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string>("");
  const [retryCount, setRetryCount] = useState(0);
  const [showSkipOption, setShowSkipOption] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const holdStartTimeRef = useRef<number | null>(null);
  const comparisonAttemptedRef = useRef(false);
  const cameraStartedRef = useRef(false);

  const isVerificationActive = currentStep !== "intro" && currentStep !== "complete" && currentStep !== "comparing" && currentStep !== "failed";
  
  // Use preloaded face recognition context (models + descriptors already loaded in PhotosStep)
  const { 
    isModelsLoaded: isComparisonModelsLoaded, 
    isModelsLoading: isComparisonLoading,
    modelsError: comparisonError,
    photoDescriptors,
    hasDescriptors: hasPhotoDescriptors,
  } = useFaceRecognitionPreload();

  // Fast face comparison using preloaded descriptors
  const compareFaceWithPreloaded = useCallback(async (videoElement: HTMLVideoElement) => {
    if (!isComparisonModelsLoaded || photoDescriptors.length === 0) {
      return { isMatch: false, similarity: 0, error: 'Modèles non chargés ou descripteurs manquants' };
    }

    try {
      const detection = await faceapi
        .detectSingleFace(videoElement)
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        return { isMatch: false, similarity: 0, error: null };
      }

      const videoDescriptor = detection.descriptor;
      let bestMatch = { index: -1, distance: Infinity };

      for (let i = 0; i < photoDescriptors.length; i++) {
        const distance = faceapi.euclideanDistance(videoDescriptor, photoDescriptors[i]);
        if (distance < bestMatch.distance) {
          bestMatch = { index: i, distance };
        }
      }

      const similarity = Math.max(0, 1 - bestMatch.distance);
      const isMatch = similarity >= FACE_MATCH_THRESHOLD;

      console.log(`[FaceVerification] Match: ${isMatch}, similarity: ${(similarity * 100).toFixed(1)}%`);

      return { isMatch, similarity, error: null };
    } catch (err: any) {
      console.error('[FaceVerification] Comparison error:', err);
      return { isMatch: false, similarity: 0, error: err?.message || 'Erreur de comparaison' };
    }
  }, [isComparisonModelsLoaded, photoDescriptors]);

  const { isLoading: isFaceDetectionLoading, error: faceDetectionError, result: faceResult } = useFaceDetection({
    videoRef,
    enabled: isVerificationActive && isVideoReady,
    onDetection: (result) => {
      if (!isVerificationActive) return;
      
      const currentStepConfig = verificationSteps.find(s => s.id === currentStep);
      if (!currentStepConfig) return;

      // Update status message
      if (!result.isDetected) {
        setDetectionStatus("Visage non détecté");
        holdStartTimeRef.current = null;
        setProgress(0);
        return;
      }

      const isCorrectDirection = result.direction === currentStepConfig.targetDirection;
      
      if (isCorrectDirection) {
        setDetectionStatus("Parfait ! Maintenez la position...");
        
        if (!holdStartTimeRef.current) {
          holdStartTimeRef.current = Date.now();
        }
        
        const holdDuration = Date.now() - holdStartTimeRef.current;
        const newProgress = Math.min(100, (holdDuration / REQUIRED_HOLD_TIME) * 100);
        setProgress(newProgress);
        
        if (holdDuration >= REQUIRED_HOLD_TIME) {
          completeCurrentStep();
        }
      } else {
        holdStartTimeRef.current = null;
        setProgress(prev => Math.max(0, prev - 5)); // Slowly decrease progress
        
        // Provide guidance
        if (currentStepConfig.targetDirection === "center") {
          if (result.direction === "left") {
            setDetectionStatus("Tournez légèrement vers la droite");
          } else if (result.direction === "right") {
            setDetectionStatus("Tournez légèrement vers la gauche");
          }
        } else if (currentStepConfig.targetDirection === "left") {
          if (result.direction === "center") {
            setDetectionStatus("Tournez plus vers la gauche");
          } else if (result.direction === "right") {
            setDetectionStatus("Tournez vers la gauche");
          }
        } else if (currentStepConfig.targetDirection === "right") {
          if (result.direction === "center") {
            setDetectionStatus("Tournez plus vers la droite");
          } else if (result.direction === "left") {
            setDetectionStatus("Tournez vers la droite");
          }
        }
      }
    },
  });

  // Perform face comparison after movement verification is complete
  const performFaceComparison = useCallback(async () => {
    if (!videoRef.current || comparisonAttemptedRef.current) return;

    const stopCameraNow = () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        try {
          // @ts-ignore
          videoRef.current.srcObject = null;
        } catch {
          // ignore
        }
      }
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    };

    // If the recognition pipeline isn't ready, fail fast (avoid hanging in "comparing")
    if (!isComparisonModelsLoaded) {
      setCameraError("La reconnaissance faciale se charge encore. Réessayez dans quelques secondes.");
      setCurrentStep("failed");
      stopCameraNow();
      return;
    }

    if (!hasPhotoDescriptors) {
      setCameraError("Aucun visage détecté dans vos photos de profil. Modifiez vos photos puis réessayez.");
      setCurrentStep("failed");
      stopCameraNow();
      return;
    }

    comparisonAttemptedRef.current = true;
    setCurrentStep("comparing");
    setDetectionStatus("Comparaison avec vos photos...");

    const withTimeout = async <T,>(promise: Promise<T>, ms: number, label: string): Promise<T> => {
      return await Promise.race([
        promise,
        new Promise<T>((_, reject) => {
          setTimeout(() => reject(new Error(label)), ms);
        }),
      ]);
    };

    try {
      // Wait a moment for stable video frame
      await withTimeout(new Promise<void>((resolve) => setTimeout(resolve, 500)), 2000, "Délai de préparation de la caméra");

      const results: { similarity: number; isMatch: boolean }[] = [];
      const overallStart = Date.now();
      const OVERALL_TIMEOUT_MS = 15000;

      for (let i = 0; i < 3; i++) {
        const remaining = OVERALL_TIMEOUT_MS - (Date.now() - overallStart);
        if (remaining <= 0) throw new Error("La comparaison prend trop de temps");

        const result = await withTimeout(
          compareFaceWithPreloaded(videoRef.current!),
          Math.min(5000, remaining),
          "Délai de comparaison (essayez de réessayer)"
        );

        if (result.error) {
          throw new Error(result.error);
        }

        results.push({ similarity: result.similarity, isMatch: result.isMatch });
        await withTimeout(new Promise<void>((resolve) => setTimeout(resolve, 300)), 1000, "Délai interne");
      }

      const bestResult = results.reduce((best, curr) => (curr.similarity > best.similarity ? curr : best), results[0]);
      setFaceMatchResult(bestResult);

      stopCameraNow();

      if (bestResult.isMatch) {
        setCurrentStep("complete");
        updateData({ faceVerified: true });
      } else {
        setCurrentStep("failed");
      }
    } catch (err: any) {
      console.error("[FaceVerification] Face comparison failed:", err);
      stopCameraNow();
      setCameraError(err?.message || "Erreur pendant la comparaison");
      setCurrentStep("failed");
    }
  }, [compareFaceWithPreloaded, updateData, isComparisonModelsLoaded, hasPhotoDescriptors]);

  const completeCurrentStep = useCallback(() => {
    setCompletedSteps(prev => [...prev, currentStep as VerificationStep]);
    holdStartTimeRef.current = null;
    
    setTimeout(() => {
      if (currentStep === "center") {
        setCurrentStep("left");
        setProgress(0);
        setDetectionStatus("");
      } else if (currentStep === "left") {
        setCurrentStep("right");
        setProgress(0);
        setDetectionStatus("");
      } else if (currentStep === "right") {
        // After all movement steps, perform face comparison
        performFaceComparison();
      }
    }, 300);
  }, [currentStep, performFaceComparison]);

  const startCamera = useCallback(async () => {
    try {
      setCameraError(null);
      setIsAILoading(true);
      setIsVideoReady(false);
      
      console.log("[FaceVerification] Starting camera, isNative:", isNative);
      
      // For native Capacitor apps, still try getUserMedia as it works in WebView
      const constraints: MediaStreamConstraints = {
        video: { 
          facingMode: "user", 
          width: { ideal: 640, max: 1280 }, 
          height: { ideal: 640, max: 1280 } 
        }
      };

      // Check if getUserMedia is available
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("getUserMedia n'est pas disponible sur cet appareil");
      }

      console.log("[FaceVerification] Requesting camera with constraints:", constraints);
      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      // Keep stream even if the video element isn't mounted yet (AnimatePresence can delay it)
      streamRef.current = stream;

      const waitForVideoElement = async (): Promise<HTMLVideoElement> => {
        const start = Date.now();
        while (!videoRef.current && Date.now() - start < 3000) {
          setDebugInfo("waiting-video-el");
          await new Promise((r) => setTimeout(r, 50));
        }
        const v = videoRef.current;
        if (!v) throw new Error("Élément vidéo indisponible (montage retardé)");
        return v;
      };

      const video = await waitForVideoElement();

      // Set attributes programmatically for iOS WebView compatibility
      video.muted = true;
      video.playsInline = true;
      video.autoplay = true;
      video.setAttribute("playsinline", "true");
      video.setAttribute("webkit-playsinline", "true");

      // Attach stream
      if (video.srcObject !== stream) {
        video.srcObject = stream;
      }

      // Use robust video ready detection for WebView
      await new Promise<void>((resolve, reject) => {
        let resolved = false;
        const timeoutId = setTimeout(() => {
          if (!resolved) {
            // Even if timeout, check if video has frames
            if (video.videoWidth > 0 && video.videoHeight > 0) {
              console.log("[FaceVerification] Timeout but video has frames, proceeding");
              resolved = true;
              resolve();
            } else {
              reject(new Error("Timeout de la caméra"));
            }
          }
        }, 15000);

        const checkVideoReady = () => {
          if (resolved) return;
          const state = `rs=${video.readyState} w=${video.videoWidth} h=${video.videoHeight} p=${video.paused}`;
          console.log(`[FaceVerification] Video state: ${state}`);
          setDebugInfo(state);

          // More robust check: video has dimensions OR readyState >= 2
          if ((video.videoWidth > 0 && video.videoHeight > 0) || video.readyState >= 2) {
            clearTimeout(timeoutId);
            resolved = true;
            console.log("[FaceVerification] Video ready, dimensions:", video.videoWidth, "x", video.videoHeight);
            resolve();
          }
        };

        // Listen to multiple events for WebView compatibility
        video.onloadedmetadata = () => {
          console.log("[FaceVerification] loadedmetadata event");
          checkVideoReady();
        };

        video.onloadeddata = () => {
          console.log("[FaceVerification] loadeddata event");
          checkVideoReady();
        };

        video.oncanplay = () => {
          console.log("[FaceVerification] canplay event");
          checkVideoReady();
        };

        video.onplaying = () => {
          console.log("[FaceVerification] playing event");
          checkVideoReady();
        };

        video.onerror = () => {
          clearTimeout(timeoutId);
          reject(new Error("Erreur de chargement vidéo"));
        };

        // Try to play and handle potential autoplay restrictions
        video
          .play()
          .then(() => {
            console.log("[FaceVerification] video.play() succeeded");
            // Check after play succeeds
            setTimeout(checkVideoReady, 100);
          })
          .catch((playError) => {
            console.warn("[FaceVerification] video.play() failed:", playError);
            // Still check if video has frames despite play failure
            setTimeout(checkVideoReady, 500);
          });

        // Also poll for video dimensions (WebView fallback)
        const pollInterval = setInterval(() => {
          if (resolved) {
            clearInterval(pollInterval);
            return;
          }
          checkVideoReady();
        }, 200);

        // Clear poll interval on resolve/reject
        const originalResolve = resolve;
        const originalReject = reject;
        // @ts-ignore
        resolve = () => {
          clearInterval(pollInterval);
          originalResolve();
        };
        // @ts-ignore
        reject = (err: any) => {
          clearInterval(pollInterval);
          originalReject(err);
        };
      });

      // Mark video as ready for face detection
      setIsVideoReady(true);
      
      console.log("[FaceVerification] Camera started successfully, video ready for detection");
    } catch (error: any) {
      console.error("[FaceVerification] Camera error:", error);
      
      let errorMessage = "Impossible d'accéder à la caméra.";
      
      if (error.name === "NotAllowedError") {
        errorMessage = "Accès caméra refusé. Veuillez autoriser l'accès dans les paramètres.";
      } else if (error.name === "NotFoundError") {
        errorMessage = "Aucune caméra détectée sur cet appareil.";
      } else if (error.name === "NotReadableError") {
        errorMessage = "La caméra est utilisée par une autre application.";
      } else if (error.name === "OverconstrainedError") {
        errorMessage = "Configuration caméra non supportée.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      // Allow retry if mounting timing / permissions caused a failure
      cameraStartedRef.current = false;

      // Ensure we don't leak an open stream on errors
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }

      setCameraError(errorMessage);
      setIsVideoReady(false);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    // Detach stream from the element (helps iOS free the camera)
    if (videoRef.current) {
      try {
        // @ts-ignore
        videoRef.current.srcObject = null;
      } catch {
        // ignore
      }
    }

    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }

    setIsVideoReady(false);
  }, []);

  useEffect(() => {
    const shouldHaveCamera = currentStep !== "intro" && currentStep !== "complete" && currentStep !== "failed";
    
    if (shouldHaveCamera && !cameraStartedRef.current && !streamRef.current) {
      cameraStartedRef.current = true;
      startCamera();
    } else if (!shouldHaveCamera && cameraStartedRef.current) {
      cameraStartedRef.current = false;
      stopCamera();
    }
    
    return () => {
      if (cameraStartedRef.current) {
        cameraStartedRef.current = false;
        stopCamera();
      }
    };
  }, [currentStep, startCamera, stopCamera]);

  useEffect(() => {
    if (!isFaceDetectionLoading && isVerificationActive) {
      setIsAILoading(false);
    }
  }, [isFaceDetectionLoading, isVerificationActive]);

  // Always show live video state in the on-screen debug panel (useful when console isn't accessible)
  useEffect(() => {
    if (!isVerificationActive) return;

    const id = setInterval(() => {
      const v = videoRef.current;
      if (!v) {
        setDebugInfo("no-video-el");
        return;
      }
      setDebugInfo(`rs=${v.readyState} w=${v.videoWidth} h=${v.videoHeight} p=${v.paused}`);
    }, 250);

    return () => clearInterval(id);
  }, [isVerificationActive]);

  const startVerification = () => {
    setCurrentStep("center");
    setProgress(0);
    setCompletedSteps([]);
    setDetectionStatus("");
    comparisonAttemptedRef.current = false;
    setFaceMatchResult(null);
  };

  const resetVerification = () => {
    cameraStartedRef.current = false;
    stopCamera();
    setCurrentStep("intro");
    setProgress(0);
    setCompletedSteps([]);
    setDetectionStatus("");
    holdStartTimeRef.current = null;
    comparisonAttemptedRef.current = false;
    setFaceMatchResult(null);
    setIsVideoReady(false);
    setDebugInfo("");
    setCameraError(null);
  };

  const handleRetry = () => {
    const newRetryCount = retryCount + 1;
    setRetryCount(newRetryCount);
    
    // After 3 failed attempts, show skip option
    if (newRetryCount >= 3) {
      setShowSkipOption(true);
    }
    
    resetVerification();
    setTimeout(() => startVerification(), 200);
  };

  const handleSkipVerification = () => {
    // Allow user to skip after multiple failures
    stopCamera();
    updateData({ faceVerified: false });
    onNext();
  };

  const currentStepIndex = verificationSteps.findIndex(s => s.id === currentStep);
  const currentInstruction = verificationSteps.find(s => s.id === currentStep);

  // Determine ring color based on detection
  const getRingColor = () => {
    if (!faceResult.isDetected) return "hsl(var(--muted))";
    const currentStepConfig = verificationSteps.find(s => s.id === currentStep);
    if (currentStepConfig && faceResult.direction === currentStepConfig.targetDirection) {
      return "hsl(var(--primary))";
    }
    return "hsl(var(--destructive) / 0.5)";
  };

  const isLoadingModels = isAILoading || isFaceDetectionLoading || isComparisonLoading;

  // Animation variants for smoother transitions
  const pageTransition = {
    initial: { opacity: 0, scale: 0.95, y: 20 },
    animate: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.95, y: -20 }
  };

  const verificationTransition = {
    initial: { opacity: 0, x: 50 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -50 }
  };

  const resultTransition = {
    initial: { opacity: 0, scale: 0.8 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.9 }
  };

  const smoothSpring = { type: "spring" as const, stiffness: 200, damping: 25 };
  const smoothEase = { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const };

  return (
    <div className="min-h-full flex flex-col">
      <AnimatePresence mode="wait">
        {currentStep === "intro" && (
          <motion.div
            key="intro"
            initial={pageTransition.initial}
            animate={pageTransition.animate}
            exit={pageTransition.exit}
            transition={smoothEase}
            className="flex-1 flex flex-col items-center justify-center text-center px-6"
          >
            {/* Shield Icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.2 }}
              className="relative mb-8"
            >
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center">
                  <Shield className="w-12 h-12 text-primary" />
                </div>
              </div>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0"
              >
                <Sparkles className="w-6 h-6 text-primary absolute -top-1 left-1/2 -translate-x-1/2" />
              </motion.div>
            </motion.div>

            <motion.h2
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-2xl font-bold text-foreground mb-3"
            >
              Vérification d'identité
            </motion.h2>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-muted-foreground mb-8 max-w-xs"
            >
              Notre IA va vérifier que vous êtes la même personne que sur vos photos de profil.
            </motion.p>

            {/* Info box about face matching */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
              className="w-full max-w-xs mb-6 p-4 rounded-2xl bg-primary/5 border border-primary/20"
            >
              <div className="flex items-center gap-3 mb-2">
                <UserCheck className="w-5 h-5 text-primary" />
                <span className="font-medium text-foreground text-sm">Reconnaissance faciale</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Votre visage sera comparé avec vos {data.photos.length} photo{data.photos.length > 1 ? 's' : ''} uploadée{data.photos.length > 1 ? 's' : ''} pour confirmer votre identité.
              </p>
            </motion.div>

            {/* Steps Preview */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="w-full max-w-xs space-y-3 mb-8"
            >
              {verificationSteps.map((step, index) => (
                <div
                  key={step.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-card/50 backdrop-blur-sm border border-border/50"
                >
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                    {index + 1}
                  </div>
                  <span className="text-sm text-foreground">{step.instruction}</span>
                </div>
              ))}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-card/50 backdrop-blur-sm border border-primary/30">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                  4
                </div>
                <span className="text-sm text-primary font-medium">Comparaison avec vos photos</span>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="w-full max-w-xs"
            >
              <Button
                onClick={startVerification}
                className="w-full h-14 text-lg font-semibold rounded-2xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/25"
              >
                <Camera className="w-5 h-5 mr-2" />
                Commencer la vérification
              </Button>
            </motion.div>
          </motion.div>
        )}

        {(currentStep !== "intro" && currentStep !== "complete" && currentStep !== "failed") && (
          <motion.div
            key="verification"
            initial={verificationTransition.initial}
            animate={verificationTransition.animate}
            exit={verificationTransition.exit}
            transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="flex-1 flex flex-col"
          >
            {/* Progress Steps */}
            <div className="px-6 py-4">
              <div className="flex items-center justify-center gap-2 mb-2">
                {verificationSteps.map((step, index) => (
                  <div key={step.id} className="flex items-center">
                    <motion.div
                      animate={{
                        scale: step.id === currentStep ? 1.1 : 1,
                        backgroundColor: completedSteps.includes(step.id) 
                          ? "hsl(142.1 76.2% 36.3%)" 
                          : step.id === currentStep 
                            ? "hsl(var(--primary) / 0.5)" 
                            : "hsl(var(--muted))"
                      }}
                      className="w-3 h-3 rounded-full flex items-center justify-center"
                    >
                      {completedSteps.includes(step.id) && (
                        <CheckCircle2 className="w-3 h-3 text-white" />
                      )}
                    </motion.div>
                    {index < verificationSteps.length - 1 && (
                      <div className={`w-8 h-0.5 mx-1 transition-colors ${
                        completedSteps.includes(step.id) ? "bg-green-500" : "bg-muted"
                      }`} />
                    )}
                  </div>
                ))}
                {/* Face comparison step indicator */}
                <div className="flex items-center">
                  <div className="w-8 h-0.5 mx-1 transition-colors bg-muted" />
                  <motion.div
                    animate={{
                      scale: currentStep === "comparing" ? 1.1 : 1,
                      backgroundColor: currentStep === "comparing" 
                        ? "hsl(var(--primary) / 0.5)" 
                        : "hsl(var(--muted))"
                    }}
                    className="w-3 h-3 rounded-full flex items-center justify-center"
                  >
                    {currentStep === "comparing" && (
                      <Loader2 className="w-2 h-2 text-white animate-spin" />
                    )}
                  </motion.div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                {currentStep === "comparing" 
                  ? "Comparaison en cours..." 
                  : `Étape ${currentStepIndex + 1} sur ${verificationSteps.length + 1}`
                }
              </p>
            </div>

            {/* Camera View */}
            <div className="flex-1 flex flex-col items-center justify-center px-6">
              <div className="relative">
                {/* Outer ring */}
                <svg className="w-72 h-72 -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke="hsl(var(--muted))"
                    strokeWidth="2"
                  />
                  <motion.circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke={currentStep === "comparing" ? "hsl(var(--primary))" : progress > 0 ? "hsl(var(--primary))" : getRingColor()}
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray={283}
                    strokeDashoffset={currentStep === "comparing" ? 0 : 283 - (283 * progress) / 100}
                    initial={{ strokeDashoffset: 283 }}
                    animate={{ strokeDashoffset: currentStep === "comparing" ? 0 : 283 - (283 * progress) / 100 }}
                    transition={{ duration: 0.1 }}
                  />
                </svg>

                {/* Camera container */}
                <div className="absolute inset-4 rounded-full overflow-hidden bg-black/50 backdrop-blur-sm">
                  {cameraError || faceDetectionError || comparisonError ? (
                    <div className="w-full h-full flex flex-col items-center justify-center text-center p-4">
                      <AlertCircle className="w-8 h-8 text-destructive mb-2" />
                      <p className="text-xs text-muted-foreground mb-2 max-w-[180px]">
                        {cameraError || faceDetectionError || comparisonError}
                      </p>
                      <p className="text-[10px] text-muted-foreground/70 mb-3">
                        Tentative {retryCount + 1}
                      </p>
                      <div className="flex flex-col gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleRetry}
                          className="text-xs"
                        >
                          <RotateCcw className="w-3 h-3 mr-1" />
                          Réessayer
                        </Button>
                        {showSkipOption && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleSkipVerification}
                            className="text-xs text-muted-foreground"
                          >
                            Passer cette étape
                          </Button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <>
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover scale-x-[-1]"
                      />
                      {/* Loading overlay */}
                      {isLoadingModels && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <div className="text-center">
                            <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-2" />
                            <p className="text-xs text-white">
                              {isComparisonLoading ? "Chargement reconnaissance..." : "Chargement de l'IA..."}
                            </p>
                          </div>
                        </div>
                      )}
                      {/* Comparing overlay */}
                      {currentStep === "comparing" && (
                        <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                          <div className="text-center">
                            <motion.div
                              animate={{ scale: [1, 1.1, 1] }}
                              transition={{ duration: 1.5, repeat: Infinity }}
                            >
                              <UserCheck className="w-8 h-8 text-primary mx-auto mb-2" />
                            </motion.div>
                            <p className="text-xs text-white font-medium">Comparaison...</p>
                          </div>
                        </div>
                      )}
                      {/* Face detection indicator */}
                      {!isFaceDetectionLoading && faceResult.isDetected && currentStep !== "comparing" && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="absolute top-2 left-1/2 -translate-x-1/2 px-2 py-1 rounded-full bg-green-500/80 backdrop-blur-sm"
                        >
                          <p className="text-[10px] text-white font-medium">Visage détecté</p>
                        </motion.div>
                      )}
                    </>
                  )}
                </div>

                {/* Direction indicator */}
                <AnimatePresence>
                  {currentStep === "left" && (
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                      className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-8"
                    >
                      <motion.div
                        animate={{ x: [-5, 5, -5] }}
                        transition={{ duration: 1, repeat: Infinity }}
                        className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center"
                      >
                        <div className="w-0 h-0 border-t-4 border-b-4 border-r-8 border-transparent border-r-primary" />
                      </motion.div>
                    </motion.div>
                  )}
                  {currentStep === "right" && (
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                      className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-8"
                    >
                      <motion.div
                        animate={{ x: [5, -5, 5] }}
                        transition={{ duration: 1, repeat: Infinity }}
                        className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center"
                      >
                        <div className="w-0 h-0 border-t-4 border-b-4 border-l-8 border-transparent border-l-primary" />
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Instructions with smooth step transitions */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, y: 15, scale: 0.98 }}
                  animate={{ 
                    opacity: 1, 
                    y: 0, 
                    scale: 1,
                    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }
                  }}
                  exit={{ 
                    opacity: 0, 
                    y: -10, 
                    scale: 0.98,
                    transition: { duration: 0.2 }
                  }}
                  className="mt-8 text-center"
              >
                {currentStep === "comparing" ? (
                  <>
                    <h3 className="text-xl font-semibold text-foreground mb-3">
                      Comparaison en cours
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Vérification avec vos photos de profil...
                    </p>
                    
                    {/* Photo thumbnails during comparison */}
                    <div className="flex items-center justify-center gap-2">
                      {data.photos.slice(0, 4).map((photo, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, scale: 0.5, y: 10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="relative"
                        >
                          <motion.div
                            animate={{ 
                              boxShadow: [
                                "0 0 0 0 hsl(var(--primary) / 0)",
                                "0 0 0 4px hsl(var(--primary) / 0.3)",
                                "0 0 0 0 hsl(var(--primary) / 0)"
                              ]
                            }}
                            transition={{ 
                              duration: 1.5, 
                              repeat: Infinity, 
                              delay: index * 0.3 
                            }}
                            className="w-12 h-12 rounded-full overflow-hidden border-2 border-primary/50"
                          >
                            <img
                              src={photo}
                              alt={`Photo ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </motion.div>
                          {index === 0 && (
                            <motion.div
                              animate={{ scale: [1, 1.2, 1] }}
                              transition={{ duration: 0.5, repeat: Infinity }}
                              className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center"
                            >
                              <CheckCircle2 className="w-3 h-3 text-primary-foreground" />
                            </motion.div>
                          )}
                        </motion.div>
                      ))}
                      {data.photos.length > 4 && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.5 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.4 }}
                          className="w-12 h-12 rounded-full bg-muted flex items-center justify-center border-2 border-border"
                        >
                          <span className="text-xs font-medium text-muted-foreground">
                            +{data.photos.length - 4}
                          </span>
                        </motion.div>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <h3 className="text-xl font-semibold text-foreground mb-2">
                      {currentInstruction?.instruction}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      {currentInstruction?.subtext}
                    </p>
                  </>
                )}
                {/* Real-time feedback */}
                {detectionStatus && !isFaceDetectionLoading && currentStep !== "comparing" && (
                  <motion.p
                    key={detectionStatus}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`text-sm font-medium ${
                      detectionStatus.includes("Parfait") ? "text-green-500" : 
                      detectionStatus.includes("non détecté") ? "text-destructive" : 
                      "text-primary"
                    }`}
                  >
                    {detectionStatus}
                  </motion.p>
                )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Reset button */}
            {currentStep !== "comparing" && (
              <div className="px-6 py-4">
                <button
                  onClick={resetVerification}
                  className="flex items-center justify-center gap-2 w-full text-muted-foreground hover:text-foreground transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span className="text-sm">Recommencer</span>
                </button>
              </div>
            )}
          </motion.div>
        )}

        {currentStep === "failed" && (
          <motion.div
            key="failed"
            initial={resultTransition.initial}
            animate={resultTransition.animate}
            exit={resultTransition.exit}
            transition={smoothSpring}
            className="flex-1 flex flex-col items-center justify-center text-center px-6"
          >
            {/* Failed animation */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.2 }}
              className="relative mb-8"
            >
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-destructive/20 to-destructive/5 flex items-center justify-center">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-destructive/30 to-destructive/10 flex items-center justify-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", delay: 0.4 }}
                  >
                    <XCircle className="w-12 h-12 text-destructive" />
                  </motion.div>
                </div>
              </div>
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-2xl font-bold text-foreground mb-3"
            >
              Vérification échouée
            </motion.h2>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-muted-foreground mb-4 max-w-xs"
            >
              Nous n'avons pas pu confirmer que vous êtes la même personne que sur vos photos de profil.
            </motion.p>

            {faceMatchResult && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.65 }}
                className="mb-8 px-4 py-2 rounded-full bg-destructive/10 border border-destructive/20"
              >
                <p className="text-xs text-muted-foreground">
                  Similarité détectée : {Math.round(faceMatchResult.similarity * 100)}%
                </p>
              </motion.div>
            )}

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="w-full max-w-xs space-y-3"
            >
              <Button
                onClick={handleRetry}
                className="w-full h-14 text-lg font-semibold rounded-2xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/25"
              >
                <RotateCcw className="w-5 h-5 mr-2" />
                Réessayer ({retryCount + 1})
              </Button>
              <Button
                onClick={onBack}
                variant="ghost"
                className="w-full h-12 text-muted-foreground"
              >
                Modifier mes photos
              </Button>
              {showSkipOption && (
                <Button
                  onClick={handleSkipVerification}
                  variant="outline"
                  className="w-full h-12 text-muted-foreground border-muted"
                >
                  Passer la vérification
                </Button>
              )}
            </motion.div>
          </motion.div>
        )}

        {currentStep === "complete" && (
          <motion.div
            key="complete"
            initial={resultTransition.initial}
            animate={resultTransition.animate}
            exit={resultTransition.exit}
            transition={smoothSpring}
            className="flex-1 flex flex-col items-center justify-center text-center px-6"
          >
            {/* Success animation */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.2 }}
              className="relative mb-8"
            >
              <motion.div
                initial={{ scale: 1 }}
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 0.5, delay: 0.5 }}
                className="w-32 h-32 rounded-full bg-gradient-to-br from-green-500/20 to-green-500/5 flex items-center justify-center"
              >
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green-500/30 to-green-500/10 flex items-center justify-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", delay: 0.4 }}
                  >
                    <CheckCircle2 className="w-12 h-12 text-green-500" />
                  </motion.div>
                </div>
              </motion.div>
              
              {/* Confetti effect */}
              {[...Array(8)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ scale: 0, x: 0, y: 0 }}
                  animate={{ 
                    scale: [0, 1, 0],
                    x: Math.cos(i * Math.PI / 4) * 80,
                    y: Math.sin(i * Math.PI / 4) * 80
                  }}
                  transition={{ duration: 0.8, delay: 0.6 + i * 0.05 }}
                  className="absolute top-1/2 left-1/2 w-2 h-2 rounded-full bg-primary"
                />
              ))}
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-2xl font-bold text-foreground mb-3"
            >
              Identité confirmée !
            </motion.h2>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-muted-foreground mb-4 max-w-xs"
            >
              Votre visage correspond à vos photos de profil. Vous obtiendrez le badge vérifié.
            </motion.p>

            {faceMatchResult && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.65 }}
                className="mb-6 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/20"
              >
                <p className="text-xs text-green-600 dark:text-green-400">
                  Similarité : {Math.round(faceMatchResult.similarity * 100)}%
                </p>
              </motion.div>
            )}

            {/* Verified badge preview */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8"
            >
              <CheckCircle2 className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium text-primary">Profil Vérifié</span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="w-full max-w-xs"
            >
              <Button
                onClick={onNext}
                className="w-full h-14 text-lg font-semibold rounded-2xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/25"
              >
                Continuer
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
