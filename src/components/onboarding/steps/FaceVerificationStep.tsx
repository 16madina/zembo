import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, CheckCircle2, RotateCcw, Sparkles, Shield, AlertCircle, Loader2, UserCheck, XCircle, Star, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isNative } from "@/lib/capacitor";
import { useFaceDetection, FaceDirection } from "@/hooks/useFaceDetection";
import { useFaceRecognitionPreload } from "@/contexts/FaceRecognitionPreloadContext";
import * as faceapi from 'face-api.js';
import confetti from 'canvas-confetti';
import { IdentityUploadScreen } from "./IdentityUploadScreen";
import { CameraPermissionTutorial } from "./CameraPermissionTutorial";
interface FaceVerificationStepProps {
  onNext: () => void;
  onBack: () => void;
  data: { faceVerified?: boolean; photos: string[] };
  updateData: (data: { faceVerified: boolean }) => void;
}

type VerificationStep = "intro" | "preparing" | "center" | "left" | "right" | "comparing" | "complete" | "failed" | "identity_upload" | "permission_tutorial" | "android_camera_fallback";

const verificationSteps: { id: VerificationStep; instruction: string; subtext: string; targetDirection: FaceDirection }[] = [
  { id: "center", instruction: "Regardez la caméra", subtext: "Gardez votre visage au centre du cadre", targetDirection: "center" },
  { id: "left", instruction: "Tournez la tête à gauche", subtext: "Lentement, jusqu'à ce que le cercle soit rempli", targetDirection: "left" },
  { id: "right", instruction: "Tournez la tête à droite", subtext: "Lentement, jusqu'à ce que le cercle soit rempli", targetDirection: "right" },
];

const REQUIRED_HOLD_TIME = 1500; // ms to hold position
const FACE_MATCH_THRESHOLD = 0.38; // Lowered similarity threshold for better mobile compatibility

// Capture video frame to canvas for more reliable face detection on mobile
const captureVideoFrame = (video: HTMLVideoElement): HTMLCanvasElement | null => {
  if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
    console.warn('[FaceVerification] Video not ready for capture');
    return null;
  }
  
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    console.warn('[FaceVerification] Cannot get canvas context');
    return null;
  }
  
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  console.log(`[FaceVerification] Captured frame: ${canvas.width}x${canvas.height}`);
  return canvas;
};

// Elaborate success screen with confetti
const SuccessScreen = ({ 
  faceMatchResult, 
  onNext,
}: { 
  faceMatchResult: { similarity: number; isMatch: boolean } | null;
  onNext: () => void;
}) => {
  const confettiTriggeredRef = useRef(false);

  useEffect(() => {
    if (confettiTriggeredRef.current) return;
    confettiTriggeredRef.current = true;

    // Fire multiple confetti bursts for an elaborate effect
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const colors = ['#D4AF37', '#FFD700', '#FFC107', '#22C55E', '#10B981', '#6366F1'];

    // Initial big burst
    confetti({
      particleCount: 100,
      spread: 100,
      origin: { y: 0.6 },
      colors,
      startVelocity: 45,
      gravity: 0.8,
      ticks: 300,
      shapes: ['circle', 'square'],
      scalar: 1.2,
    });

    // Side cannons
    setTimeout(() => {
      confetti({
        particleCount: 50,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 },
        colors,
      });
      confetti({
        particleCount: 50,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 },
        colors,
      });
    }, 250);

    // Continuous rain effect
    const interval = setInterval(() => {
      if (Date.now() > animationEnd) {
        clearInterval(interval);
        return;
      }

      confetti({
        particleCount: 3,
        angle: 60,
        spread: 40,
        origin: { x: 0, y: 0.5 },
        colors,
        startVelocity: 30,
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 40,
        origin: { x: 1, y: 0.5 },
        colors,
        startVelocity: 30,
      });
    }, 100);

    // Final burst
    setTimeout(() => {
      confetti({
        particleCount: 80,
        spread: 120,
        origin: { y: 0.5 },
        colors,
        startVelocity: 35,
        gravity: 1,
        scalar: 0.9,
      });
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  return (
    <motion.div
      key="complete"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ type: "spring", stiffness: 200, damping: 25 }}
      className="flex-1 flex flex-col items-center justify-center text-center px-6 relative overflow-hidden"
    >
      {/* Background glow effect */}
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1, delay: 0.2 }}
        className="absolute inset-0 pointer-events-none"
      >
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-green-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/15 rounded-full blur-2xl" />
      </motion.div>

      {/* Success animation with rings */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", delay: 0.2 }}
        className="relative mb-8 z-10"
      >
        {/* Outer pulsing ring */}
        <motion.div
          animate={{ 
            scale: [1, 1.3, 1],
            opacity: [0.3, 0, 0.3]
          }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute inset-0 w-40 h-40 -m-4 rounded-full border-2 border-green-500/40"
        />
        
        {/* Second pulsing ring */}
        <motion.div
          animate={{ 
            scale: [1, 1.5, 1],
            opacity: [0.2, 0, 0.2]
          }}
          transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
          className="absolute inset-0 w-40 h-40 -m-4 rounded-full border-2 border-primary/30"
        />

        <motion.div
          initial={{ scale: 1 }}
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="w-32 h-32 rounded-full bg-gradient-to-br from-green-500/30 to-green-500/10 flex items-center justify-center backdrop-blur-sm border border-green-500/20"
        >
          <motion.div 
            className="w-24 h-24 rounded-full bg-gradient-to-br from-green-500/40 to-green-500/20 flex items-center justify-center"
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          >
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", delay: 0.4, stiffness: 200 }}
            >
              <CheckCircle2 className="w-12 h-12 text-green-500" />
            </motion.div>
          </motion.div>
        </motion.div>
        
        {/* Floating stars around the badge */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ 
              scale: [0, 1.2, 1],
              opacity: [0, 1, 0.8],
              x: Math.cos((i * Math.PI * 2) / 6) * 70,
              y: Math.sin((i * Math.PI * 2) / 6) * 70
            }}
            transition={{ 
              duration: 0.6, 
              delay: 0.7 + i * 0.1,
              repeat: Infinity,
              repeatType: "reverse",
              repeatDelay: 2
            }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          >
            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
          </motion.div>
        ))}

        {/* Sparkle particles */}
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={`spark-${i}`}
            initial={{ scale: 0, x: 0, y: 0, opacity: 0 }}
            animate={{ 
              scale: [0, 1, 0],
              x: Math.cos((i * Math.PI * 2) / 12) * (80 + Math.random() * 20),
              y: Math.sin((i * Math.PI * 2) / 12) * (80 + Math.random() * 20),
              opacity: [0, 1, 0]
            }}
            transition={{ 
              duration: 1.2, 
              delay: 0.5 + i * 0.08,
              ease: "easeOut"
            }}
            className="absolute top-1/2 left-1/2 w-2 h-2 rounded-full"
            style={{
              background: i % 3 === 0 ? '#22C55E' : i % 3 === 1 ? '#D4AF37' : '#6366F1'
            }}
          />
        ))}
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, type: "spring" }}
        className="text-2xl font-bold text-foreground mb-3 z-10"
      >
        🎉 Identité confirmée !
      </motion.h2>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="text-muted-foreground mb-4 max-w-xs z-10"
      >
        Votre visage correspond à vos photos de profil. Vous obtiendrez le badge vérifié.
      </motion.p>

      {faceMatchResult && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.65, type: "spring" }}
          className="mb-6 px-5 py-3 rounded-full bg-gradient-to-r from-green-500/20 to-green-600/20 border border-green-500/30 backdrop-blur-sm z-10"
        >
          <p className="text-sm font-medium text-green-600 dark:text-green-400">
            ✨ Similarité : {Math.round(faceMatchResult.similarity * 100)}%
          </p>
        </motion.div>
      )}

      {/* Verified badge preview with animation */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.7, type: "spring" }}
        className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-gradient-to-r from-primary/15 to-primary/5 border border-primary/25 mb-8 z-10"
      >
        <motion.div
          animate={{ 
            rotate: [0, 10, -10, 0],
            scale: [1, 1.1, 1]
          }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
        >
          <CheckCircle2 className="w-6 h-6 text-primary" />
        </motion.div>
        <span className="text-base font-semibold text-primary">Profil Vérifié</span>
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <Sparkles className="w-4 h-4 text-yellow-500" />
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
        className="w-full max-w-xs z-10"
      >
        <Button
          onClick={onNext}
          className="w-full h-14 text-lg font-semibold rounded-2xl bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 shadow-lg shadow-green-500/30 transition-all hover:shadow-green-500/40 hover:scale-[1.02]"
        >
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2"
          >
            Continuer
            <motion.span
              animate={{ x: [0, 4, 0] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              →
            </motion.span>
          </motion.span>
        </Button>
      </motion.div>
    </motion.div>
  );
};

// Preparing screen with countdown and instructions
const PreparingScreen = ({ onStart }: { onStart: () => void }) => {
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    if (countdown <= 0) {
      onStart();
      return;
    }

    const timer = setTimeout(() => {
      setCountdown(prev => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown, onStart]);

  return (
    <motion.div
      key="preparing"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="flex-1 flex flex-col items-center justify-center px-6"
    >
      {/* Instructions card */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="bg-muted/50 backdrop-blur-sm rounded-3xl p-6 mb-8 max-w-sm w-full"
      >
        <h3 className="text-lg font-semibold text-foreground mb-4 text-center">
          Préparez-vous
        </h3>
        
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-primary">1</span>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Regardez la caméra</p>
              <p className="text-xs text-muted-foreground">Centrez votre visage dans le cercle</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-primary">2</span>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Tournez lentement la tête</p>
              <p className="text-xs text-muted-foreground">Gauche puis droite quand demandé</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-primary">3</span>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Maintenez chaque position</p>
              <p className="text-xs text-muted-foreground">Jusqu'à ce que le cercle soit rempli</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Countdown */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", delay: 0.3 }}
        className="relative"
      >
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
          className="w-32 h-32 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center backdrop-blur-sm border border-primary/20"
        >
          <motion.div
            key={countdown}
            initial={{ scale: 1.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            {countdown > 0 ? (
              <span className="text-5xl font-bold text-primary">{countdown}</span>
            ) : (
              <Camera className="w-12 h-12 text-primary" />
            )}
          </motion.div>
        </motion.div>
        
        {/* Pulsing ring */}
        <motion.div
          animate={{ scale: [1, 1.3], opacity: [0.5, 0] }}
          transition={{ duration: 1, repeat: Infinity }}
          className="absolute inset-0 rounded-full border-2 border-primary/40"
        />
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-6 text-sm text-muted-foreground"
      >
        {countdown > 0 ? "La vérification démarre dans..." : "Démarrage..."}
      </motion.p>
    </motion.div>
  );
};

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
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [isCapturingPhoto, setIsCapturingPhoto] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const holdStartTimeRef = useRef<number | null>(null);
  const comparisonAttemptedRef = useRef(false);
  const cameraStartedRef = useRef(false);

  const isVerificationActive = currentStep !== "intro" && currentStep !== "preparing" && currentStep !== "complete" && currentStep !== "comparing" && currentStep !== "failed";
  
  // Use preloaded face recognition context (models + descriptors already loaded in PhotosStep)
  const { 
    isModelsLoaded: isComparisonModelsLoaded, 
    isModelsLoading: isComparisonLoading,
    modelsError: comparisonError,
    photoDescriptors,
    hasDescriptors: hasPhotoDescriptors,
  } = useFaceRecognitionPreload();

  // Fast face comparison using preloaded descriptors - now uses canvas capture for reliability
  const compareFaceWithPreloaded = useCallback(async (videoElement: HTMLVideoElement) => {
    console.log('[FaceVerification] Starting face comparison...');
    console.log(`[FaceVerification] Models loaded: ${isComparisonModelsLoaded}, Descriptors: ${photoDescriptors.length}`);
    
    if (!isComparisonModelsLoaded || photoDescriptors.length === 0) {
      return { isMatch: false, similarity: 0, error: 'Modèles non chargés ou descripteurs manquants', noFaceDetected: false };
    }

    try {
      // Capture frame to canvas for more reliable detection on mobile
      const canvas = captureVideoFrame(videoElement);
      if (!canvas) {
        console.warn('[FaceVerification] Failed to capture video frame');
        return { isMatch: false, similarity: 0, error: null, noFaceDetected: true };
      }

      console.log('[FaceVerification] Detecting face in captured frame...');
      const detection = await faceapi
        .detectSingleFace(canvas)
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        console.log('[FaceVerification] No face detected in video frame');
        return { isMatch: false, similarity: 0, error: null, noFaceDetected: true };
      }

      console.log('[FaceVerification] Face detected! Computing similarity...');
      const videoDescriptor = detection.descriptor;
      let bestMatch = { index: -1, distance: Infinity };

      for (let i = 0; i < photoDescriptors.length; i++) {
        const distance = faceapi.euclideanDistance(videoDescriptor, photoDescriptors[i]);
        console.log(`[FaceVerification] Distance to photo ${i}: ${distance.toFixed(4)}`);
        if (distance < bestMatch.distance) {
          bestMatch = { index: i, distance };
        }
      }

      const similarity = Math.max(0, 1 - bestMatch.distance);
      const isMatch = similarity >= FACE_MATCH_THRESHOLD;

      console.log(`[FaceVerification] Best match: photo ${bestMatch.index}, distance: ${bestMatch.distance.toFixed(4)}, similarity: ${(similarity * 100).toFixed(1)}%, threshold: ${(FACE_MATCH_THRESHOLD * 100).toFixed(0)}%, match: ${isMatch}`);

      return { isMatch, similarity, error: null, noFaceDetected: false };
    } catch (err: any) {
      console.error('[FaceVerification] Comparison error:', err);
      return { isMatch: false, similarity: 0, error: err?.message || 'Erreur de comparaison', noFaceDetected: false };
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
      await withTimeout(new Promise<void>((resolve) => setTimeout(resolve, 800)), 2000, "Délai de préparation de la caméra");

      const results: { similarity: number; isMatch: boolean; noFaceDetected: boolean }[] = [];
      const overallStart = Date.now();
      const OVERALL_TIMEOUT_MS = 20000;
      let noFaceCount = 0;

      console.log('[FaceVerification] Starting comparison loop (5 attempts)...');

      for (let i = 0; i < 5; i++) {
        const remaining = OVERALL_TIMEOUT_MS - (Date.now() - overallStart);
        if (remaining <= 0) throw new Error("La comparaison prend trop de temps");

        console.log(`[FaceVerification] Attempt ${i + 1}/5...`);
        setDetectionStatus(`Analyse en cours... (${i + 1}/5)`);

        const result = await withTimeout(
          compareFaceWithPreloaded(videoRef.current!),
          Math.min(6000, remaining),
          "Délai de comparaison (essayez de réessayer)"
        );

        if (result.error) {
          throw new Error(result.error);
        }

        if (result.noFaceDetected) {
          noFaceCount++;
          console.log(`[FaceVerification] No face detected (${noFaceCount} times)`);
        }

        results.push({ similarity: result.similarity, isMatch: result.isMatch, noFaceDetected: result.noFaceDetected || false });
        
        // Wait longer between attempts for better frame diversity
        await withTimeout(new Promise<void>((resolve) => setTimeout(resolve, 500)), 1500, "Délai interne");
      }

      // Filter results that actually detected a face
      const validResults = results.filter(r => !r.noFaceDetected);
      console.log(`[FaceVerification] Valid results: ${validResults.length}/${results.length}`);

      // Always set a result for display, even if no face was detected
      let bestResult: { similarity: number; isMatch: boolean };
      
      if (validResults.length === 0) {
        // No face was ever detected in video - show 0% similarity
        console.log('[FaceVerification] No face detected in any attempt');
        bestResult = { similarity: 0, isMatch: false };
        setCameraError("Aucun visage détecté dans la vidéo. Assurez-vous d'être bien éclairé et face à la caméra.");
      } else {
        bestResult = validResults.reduce((best, curr) => (curr.similarity > best.similarity ? curr : best), validResults[0]);
        console.log(`[FaceVerification] Best result: similarity ${(bestResult.similarity * 100).toFixed(1)}%`);
      }
      
      // Always set the match result so the user can see the similarity percentage
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
      // Set a 0% result so user sees something
      setFaceMatchResult({ similarity: 0, isMatch: false });
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
      
      // For native Capacitor apps, request camera permission via Capacitor first
      // This ensures the native permission dialog is shown on Android/iOS
      if (isNative) {
        try {
          console.log("[FaceVerification] Requesting native camera permission via Capacitor...");
          const { Camera } = await import('@capacitor/camera');
          const permissionStatus = await Camera.requestPermissions({ permissions: ['camera'] });
          console.log("[FaceVerification] Camera permission status:", permissionStatus);
          
          if (permissionStatus.camera === 'denied') {
            // Show the permission tutorial instead of just an error message
            console.log("[FaceVerification] Camera permission denied, showing tutorial");
            setCameraError("Accès caméra refusé");
            setCurrentStep("permission_tutorial");
            setIsAILoading(false);
            return;
          }
          
          // Important: On Android, wait a moment after granting permission before getUserMedia
          // This allows the system to fully register the permission change
          if (permissionStatus.camera === 'granted') {
            console.log("[FaceVerification] Permission granted, waiting for system to sync...");
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        } catch (permError: any) {
          console.error("[FaceVerification] Native permission request failed:", permError);
          // Continue anyway - getUserMedia will also prompt for permission
        }
      }
      
      // Check if getUserMedia is available
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("getUserMedia n'est pas disponible sur cet appareil");
      }

      // Use simplified constraints for Android to avoid hardware compatibility issues
      const isAndroidDevice = isNative && (window as any).Capacitor?.getPlatform?.() === 'android';
      
      // Android needs simpler constraints - many devices struggle with specific dimensions
      const constraints: MediaStreamConstraints = isAndroidDevice 
        ? { video: { facingMode: "user" } }
        : { 
            video: { 
              facingMode: "user", 
              width: { ideal: 640, max: 1280 }, 
              height: { ideal: 640, max: 1280 } 
            }
          };

      console.log("[FaceVerification] Requesting camera with constraints:", constraints, "isAndroid:", isAndroidDevice);
      
      // Try to get camera stream with retry logic and fallback to minimal constraints
      let stream: MediaStream | null = null;
      let lastError: any = null;
      
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          console.log(`[FaceVerification] getUserMedia attempt ${attempt + 1}/3`);
          
          // On second attempt, use even simpler constraints
          const attemptConstraints = attempt >= 1 
            ? { video: true } // Minimal fallback
            : constraints;
            
          stream = await navigator.mediaDevices.getUserMedia(attemptConstraints);
          console.log("[FaceVerification] Camera stream obtained successfully");
          break; // Success, exit loop
        } catch (err: any) {
          lastError = err;
          console.warn(`[FaceVerification] Attempt ${attempt + 1} failed:`, err.name, err.message);
          
          // If it's a permission error, don't retry - show tutorial
          if (err.name === "NotAllowedError") {
            throw err;
          }
          
          // Wait before retry (increasing delay)
          if (attempt < 2) {
            const delay = 500 * (attempt + 1);
            console.log(`[FaceVerification] Waiting ${delay}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
      
      if (!stream) {
        throw lastError || new Error("Impossible d'obtenir le flux caméra");
      }

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
      
      const isAndroidDevice = isNative && (window as any).Capacitor?.getPlatform?.() === 'android';
      let errorMessage = "Impossible d'accéder à la caméra.";
      let isPermissionDenied = false;
      let shouldOfferCameraFallback = false;
      
      if (error.name === "NotAllowedError") {
        errorMessage = "Accès caméra refusé";
        isPermissionDenied = true;
      } else if (error.name === "NotFoundError") {
        errorMessage = "Aucune caméra détectée sur cet appareil.";
      } else if (error.name === "NotReadableError") {
        errorMessage = "La caméra est utilisée par une autre application.";
        // On Android, this often means WebView camera access issues
        if (isAndroidDevice) {
          shouldOfferCameraFallback = true;
        }
      } else if (error.name === "OverconstrainedError") {
        errorMessage = "Configuration caméra non supportée.";
        if (isAndroidDevice) {
          shouldOfferCameraFallback = true;
        }
      } else if (error.message) {
        errorMessage = error.message;
        // Generic errors on Android often mean WebView camera issues
        if (isAndroidDevice) {
          shouldOfferCameraFallback = true;
        }
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
      
      // On Android, if WebView camera fails, offer Capacitor Camera fallback
      if (shouldOfferCameraFallback) {
        console.log("[FaceVerification] Android WebView camera failed, offering photo capture fallback");
        setCurrentStep("android_camera_fallback");
        return;
      }
      
      // Show permission tutorial for permission denied errors on native
      if (isPermissionDenied && isNative) {
        console.log("[FaceVerification] Permission denied, showing tutorial");
        setCurrentStep("permission_tutorial");
      }
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
    const shouldHaveCamera = currentStep !== "intro" && currentStep !== "preparing" && currentStep !== "complete" && currentStep !== "failed" && currentStep !== "permission_tutorial" && currentStep !== "android_camera_fallback" && currentStep !== "identity_upload";
    
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

  // Handler for retrying camera from permission tutorial
  const handleRetryFromTutorial = useCallback(() => {
    console.log("[FaceVerification] Retrying camera access from tutorial");
    setCameraError(null);
    cameraStartedRef.current = false;
    setCurrentStep("preparing");
  }, []);

  // Handler for opening settings (placeholder - actual implementation is in the tutorial component)
  const handleOpenSettings = useCallback(() => {
    console.log("[FaceVerification] Open settings requested");
  }, []);

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
    setCurrentStep("preparing");
    setProgress(0);
    setCompletedSteps([]);
    setDetectionStatus("");
    comparisonAttemptedRef.current = false;
    setFaceMatchResult(null);
  };

  const startActualVerification = () => {
    setCurrentStep("center");
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
    
    // After 3 failed attempts, show identity upload option
    if (newRetryCount >= 3) {
      setShowSkipOption(true);
    }
    
    resetVerification();
    setTimeout(() => startVerification(), 200);
  };

  const handleIdentityUpload = () => {
    // Switch to identity upload mode after 3 failures
    stopCamera();
    setCurrentStep("identity_upload");
  };

  const handleIdentityUploadComplete = () => {
    // User submitted identity for manual verification
    // They can continue but with limited access
    updateData({ faceVerified: false });
    onNext();
  };

  const handleBackToFaceVerification = () => {
    resetVerification();
  };

  const handleSkipVerification = () => {
    // Allow user to skip after multiple failures
    stopCamera();
    updateData({ faceVerified: false });
    onNext();
  };

  // Capacitor Camera fallback for Android WebView camera issues
  const capturePhotoWithCapacitor = useCallback(async () => {
    setIsCapturingPhoto(true);
    setCameraError(null);
    
    try {
      const { Camera, CameraResultType, CameraSource, CameraDirection } = await import('@capacitor/camera');
      
      console.log("[FaceVerification] Capturing photo with Capacitor Camera...");
      
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
        direction: CameraDirection.Front,
        width: 640,
        height: 640,
        correctOrientation: true,
      });
      
      if (!image.dataUrl) {
        throw new Error("Aucune image capturée");
      }
      
      console.log("[FaceVerification] Photo captured successfully");
      setCapturedPhoto(image.dataUrl);
      
      // Now compare the captured photo with profile photos
      await compareCapturedPhoto(image.dataUrl);
      
    } catch (error: any) {
      console.error("[FaceVerification] Capacitor Camera error:", error);
      
      let errorMessage = "Impossible de prendre la photo.";
      if (error.message?.includes("User cancelled")) {
        errorMessage = "Capture annulée.";
      } else if (error.message?.includes("denied")) {
        errorMessage = "Permission caméra refusée.";
      }
      
      setCameraError(errorMessage);
    } finally {
      setIsCapturingPhoto(false);
    }
  }, []);

  // Compare a captured photo (from Capacitor Camera) with profile photos
  const compareCapturedPhoto = useCallback(async (photoDataUrl: string) => {
    if (!isComparisonModelsLoaded || photoDescriptors.length === 0) {
      setCameraError("La reconnaissance faciale n'est pas prête. Réessayez.");
      return;
    }

    setCurrentStep("comparing");
    setDetectionStatus("Comparaison avec vos photos...");

    try {
      // Create an image element from the captured photo
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Impossible de charger l'image"));
        img.src = photoDataUrl;
      });

      // Detect face in the captured photo
      const detection = await faceapi
        .detectSingleFace(img)
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        throw new Error("Aucun visage détecté dans la photo. Réessayez en vous positionnant mieux.");
      }

      const capturedDescriptor = detection.descriptor;
      let bestMatch = { index: -1, distance: Infinity };

      for (let i = 0; i < photoDescriptors.length; i++) {
        const distance = faceapi.euclideanDistance(capturedDescriptor, photoDescriptors[i]);
        if (distance < bestMatch.distance) {
          bestMatch = { index: i, distance };
        }
      }

      const similarity = Math.max(0, 1 - bestMatch.distance);
      const isMatch = similarity >= FACE_MATCH_THRESHOLD;

      console.log(`[FaceVerification] Photo comparison - Match: ${isMatch}, similarity: ${(similarity * 100).toFixed(1)}%`);

      setFaceMatchResult({ isMatch, similarity });

      if (isMatch) {
        setCurrentStep("complete");
        updateData({ faceVerified: true });
      } else {
        setCurrentStep("failed");
      }
    } catch (error: any) {
      console.error("[FaceVerification] Photo comparison failed:", error);
      setCameraError(error.message || "Erreur pendant la comparaison");
      setCurrentStep("android_camera_fallback");
    }
  }, [isComparisonModelsLoaded, photoDescriptors, updateData]);

  const handleAndroidCameraFallbackRetry = useCallback(() => {
    setCameraError(null);
    setCapturedPhoto(null);
    cameraStartedRef.current = false;
    setCurrentStep("preparing");
  }, []);

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

            {/* AI Preload Status Indicator */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
              className="w-full max-w-xs mb-6 p-4 rounded-2xl bg-card/80 border border-border"
            >
              <div className="space-y-3">
                {/* Models Loading Status */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isComparisonLoading ? (
                      <Loader2 className="w-4 h-4 text-primary animate-spin" />
                    ) : isComparisonModelsLoaded ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : comparisonError ? (
                      <XCircle className="w-4 h-4 text-destructive" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border-2 border-muted" />
                    )}
                    <span className="text-sm text-muted-foreground">Modèles IA</span>
                  </div>
                  <span className={`text-xs font-medium ${
                    isComparisonLoading ? 'text-primary' : 
                    isComparisonModelsLoaded ? 'text-green-500' : 
                    comparisonError ? 'text-destructive' : 'text-muted-foreground'
                  }`}>
                    {isComparisonLoading ? 'Chargement...' : 
                     isComparisonModelsLoaded ? 'Prêt' : 
                     comparisonError ? 'Erreur' : 'En attente'}
                  </span>
                </div>

                {/* Photo Descriptors Status */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isComparisonModelsLoaded && !hasPhotoDescriptors && photoDescriptors.length === 0 ? (
                      <Loader2 className="w-4 h-4 text-primary animate-spin" />
                    ) : hasPhotoDescriptors ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border-2 border-muted" />
                    )}
                    <span className="text-sm text-muted-foreground">Analyse photos</span>
                  </div>
                  <span className={`text-xs font-medium ${
                    hasPhotoDescriptors ? 'text-green-500' : 
                    isComparisonModelsLoaded && !hasPhotoDescriptors ? 'text-primary' : 'text-muted-foreground'
                  }`}>
                    {hasPhotoDescriptors ? `${photoDescriptors.length} visage${photoDescriptors.length > 1 ? 's' : ''} détecté${photoDescriptors.length > 1 ? 's' : ''}` : 
                     isComparisonModelsLoaded && !hasPhotoDescriptors ? 'Extraction...' : 'En attente'}
                  </span>
                </div>

                {/* Overall Progress Bar */}
                <div className="pt-2">
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <motion.div
                      initial={{ width: '0%' }}
                      animate={{ 
                        width: isComparisonModelsLoaded && hasPhotoDescriptors ? '100%' : 
                               isComparisonModelsLoaded ? '50%' : 
                               isComparisonLoading ? '25%' : '0%' 
                      }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                      className={`h-full rounded-full ${
                        isComparisonModelsLoaded && hasPhotoDescriptors 
                          ? 'bg-green-500' 
                          : 'bg-primary'
                      }`}
                    />
                  </div>
                  <p className="text-xs text-center text-muted-foreground mt-2">
                    {isComparisonModelsLoaded && hasPhotoDescriptors 
                      ? '✓ Prêt pour la vérification instantanée'
                      : 'Préparation de la reconnaissance faciale...'}
                  </p>
                </div>
              </div>
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

        {currentStep === "preparing" && (
          <PreparingScreen onStart={startActualVerification} />
        )}

        {(currentStep !== "intro" && currentStep !== "preparing" && currentStep !== "complete" && currentStep !== "failed" && currentStep !== "identity_upload") && (
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
              {cameraError || "Nous n'avons pas pu confirmer que vous êtes la même personne que sur vos photos de profil."}
            </motion.p>

            {/* Always show similarity result for debugging */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.65 }}
              className="mb-4 px-4 py-2 rounded-full bg-destructive/10 border border-destructive/20"
            >
              <p className="text-xs text-muted-foreground">
                Similarité détectée : {faceMatchResult ? Math.round(faceMatchResult.similarity * 100) : 0}%
                {faceMatchResult && faceMatchResult.similarity === 0 && " (aucun visage détecté)"}
              </p>
            </motion.div>

            {/* Show threshold info for debugging */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="text-xs text-muted-foreground/60 mb-6"
            >
              Seuil requis : {Math.round(FACE_MATCH_THRESHOLD * 100)}%
            </motion.p>

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
                  onClick={handleIdentityUpload}
                  variant="outline"
                  className="w-full h-12 border-orange-500/50 text-orange-600 hover:bg-orange-500/10"
                >
                  Vérification manuelle (pièce d'identité)
                </Button>
              )}
            </motion.div>
          </motion.div>
        )}

        {currentStep === "android_camera_fallback" && (
          <motion.div
            key="android_camera_fallback"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 200, damping: 25 }}
            className="flex-1 flex flex-col items-center justify-center text-center px-6"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.1 }}
              className="relative mb-8"
            >
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-orange-500/20 to-orange-500/5 flex items-center justify-center">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-orange-500/30 to-orange-500/10 flex items-center justify-center">
                  <Camera className="w-12 h-12 text-orange-500" />
                </div>
              </div>
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-2xl font-bold text-foreground mb-3"
            >
              Caméra alternative
            </motion.h2>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-muted-foreground mb-6 max-w-xs"
            >
              {cameraError 
                ? cameraError 
                : "La caméra en direct n'est pas disponible sur votre appareil. Utilisez la capture photo native à la place."
              }
            </motion.p>

            {capturedPhoto && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mb-6 w-32 h-32 rounded-full overflow-hidden border-4 border-primary/50"
              >
                <img 
                  src={capturedPhoto} 
                  alt="Photo capturée" 
                  className="w-full h-full object-cover"
                />
              </motion.div>
            )}

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="w-full max-w-xs space-y-3"
            >
              <Button
                onClick={capturePhotoWithCapacitor}
                disabled={isCapturingPhoto || isComparisonLoading}
                className="w-full h-14 text-lg font-semibold rounded-2xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/25"
              >
                {isCapturingPhoto ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Ouverture caméra...
                  </>
                ) : (
                  <>
                    <ImageIcon className="w-5 h-5 mr-2" />
                    Prendre un selfie
                  </>
                )}
              </Button>
              
              <Button
                onClick={handleAndroidCameraFallbackRetry}
                variant="outline"
                className="w-full h-12"
                disabled={isCapturingPhoto}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Réessayer la caméra en direct
              </Button>
              
              <Button
                onClick={handleIdentityUpload}
                variant="ghost"
                className="w-full h-12 text-muted-foreground"
                disabled={isCapturingPhoto}
              >
                Vérification manuelle (pièce d'identité)
              </Button>
            </motion.div>

            {isComparisonLoading && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-4 text-xs text-muted-foreground"
              >
                Chargement de la reconnaissance faciale...
              </motion.p>
            )}
          </motion.div>
        )}

        {currentStep === "identity_upload" && (
          <IdentityUploadScreen
            onComplete={handleIdentityUploadComplete}
            onBack={handleBackToFaceVerification}
          />
        )}

        {currentStep === "permission_tutorial" && (
          <CameraPermissionTutorial
            onRetry={handleRetryFromTutorial}
            onOpenSettings={handleOpenSettings}
          />
        )}

        {currentStep === "complete" && (
          <SuccessScreen 
            faceMatchResult={faceMatchResult} 
            onNext={onNext}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
