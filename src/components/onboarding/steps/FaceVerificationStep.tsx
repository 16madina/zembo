import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, CheckCircle2, RotateCcw, Sparkles, Shield, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isNative, takePhoto } from "@/lib/capacitor";

interface FaceVerificationStepProps {
  onNext: () => void;
  onBack: () => void;
  data: { faceVerified?: boolean };
  updateData: (data: { faceVerified: boolean }) => void;
}

type VerificationStep = "intro" | "center" | "left" | "right" | "complete";

const verificationSteps: { id: VerificationStep; instruction: string; subtext: string }[] = [
  { id: "center", instruction: "Regardez la caméra", subtext: "Gardez votre visage au centre du cadre" },
  { id: "left", instruction: "Tournez la tête à gauche", subtext: "Lentement, jusqu'à ce que le cercle soit rempli" },
  { id: "right", instruction: "Tournez la tête à droite", subtext: "Lentement, jusqu'à ce que le cercle soit rempli" },
];

export const FaceVerificationStep = ({ onNext, onBack, data, updateData }: FaceVerificationStepProps) => {
  const [currentStep, setCurrentStep] = useState<VerificationStep>("intro");
  const [progress, setProgress] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<VerificationStep[]>([]);
  const [isVerifying, setIsVerifying] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const startCamera = useCallback(async () => {
    try {
      setCameraError(null);
      
      if (isNative) {
        // For native, we'll use a different approach
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 720 }, height: { ideal: 720 } }
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (error) {
      console.error("Camera error:", error);
      setCameraError("Impossible d'accéder à la caméra. Veuillez autoriser l'accès.");
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }
  }, []);

  useEffect(() => {
    if (currentStep !== "intro" && currentStep !== "complete") {
      startCamera();
    }
    
    return () => {
      stopCamera();
    };
  }, [currentStep, startCamera, stopCamera]);

  const startVerification = () => {
    setCurrentStep("center");
    setProgress(0);
    setCompletedSteps([]);
  };

  const simulateVerification = useCallback(() => {
    if (isVerifying) return;
    
    setIsVerifying(true);
    setProgress(0);
    
    progressIntervalRef.current = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current);
          }
          
          // Move to next step
          setTimeout(() => {
            setCompletedSteps(prev => [...prev, currentStep as VerificationStep]);
            setIsVerifying(false);
            
            if (currentStep === "center") {
              setCurrentStep("left");
              setProgress(0);
            } else if (currentStep === "left") {
              setCurrentStep("right");
              setProgress(0);
            } else if (currentStep === "right") {
              setCurrentStep("complete");
              stopCamera();
              updateData({ faceVerified: true });
            }
          }, 500);
          
          return 100;
        }
        return prev + 2;
      });
    }, 50);
  }, [currentStep, isVerifying, stopCamera, updateData]);

  const resetVerification = () => {
    stopCamera();
    setCurrentStep("intro");
    setProgress(0);
    setCompletedSteps([]);
    setIsVerifying(false);
  };

  const currentStepIndex = verificationSteps.findIndex(s => s.id === currentStep);
  const currentInstruction = verificationSteps.find(s => s.id === currentStep);

  return (
    <div className="min-h-full flex flex-col">
      <AnimatePresence mode="wait">
        {currentStep === "intro" && (
          <motion.div
            key="intro"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
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
              Pour votre sécurité et celle de notre communauté, nous allons vérifier votre identité par reconnaissance faciale.
            </motion.p>

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

        {currentStep !== "intro" && currentStep !== "complete" && (
          <motion.div
            key="verification"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
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
                          ? "hsl(var(--primary))" 
                          : step.id === currentStep 
                            ? "hsl(var(--primary) / 0.5)" 
                            : "hsl(var(--muted))"
                      }}
                      className="w-3 h-3 rounded-full"
                    >
                      {completedSteps.includes(step.id) && (
                        <CheckCircle2 className="w-3 h-3 text-primary-foreground" />
                      )}
                    </motion.div>
                    {index < verificationSteps.length - 1 && (
                      <div className={`w-8 h-0.5 mx-1 ${
                        completedSteps.includes(step.id) ? "bg-primary" : "bg-muted"
                      }`} />
                    )}
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Étape {currentStepIndex + 1} sur {verificationSteps.length}
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
                    stroke="hsl(var(--primary))"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray={283}
                    strokeDashoffset={283 - (283 * progress) / 100}
                    initial={{ strokeDashoffset: 283 }}
                    animate={{ strokeDashoffset: 283 - (283 * progress) / 100 }}
                    transition={{ duration: 0.1 }}
                  />
                </svg>

                {/* Camera container */}
                <div className="absolute inset-4 rounded-full overflow-hidden bg-black/50 backdrop-blur-sm">
                  {cameraError ? (
                    <div className="w-full h-full flex flex-col items-center justify-center text-center p-4">
                      <AlertCircle className="w-8 h-8 text-destructive mb-2" />
                      <p className="text-xs text-muted-foreground">{cameraError}</p>
                    </div>
                  ) : (
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover scale-x-[-1]"
                    />
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

              {/* Instructions */}
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-8 text-center"
              >
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  {currentInstruction?.instruction}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {currentInstruction?.subtext}
                </p>
              </motion.div>

              {/* Action button */}
              <div className="mt-8 w-full max-w-xs">
                {!isVerifying ? (
                  <Button
                    onClick={simulateVerification}
                    className="w-full h-14 text-lg font-semibold rounded-2xl bg-gradient-to-r from-primary to-primary/80"
                    disabled={!!cameraError}
                  >
                    Capturer
                  </Button>
                ) : (
                  <div className="text-center">
                    <motion.div
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="text-primary font-medium"
                    >
                      Analyse en cours...
                    </motion.div>
                  </div>
                )}
              </div>
            </div>

            {/* Reset button */}
            <div className="px-6 py-4">
              <button
                onClick={resetVerification}
                className="flex items-center justify-center gap-2 w-full text-muted-foreground hover:text-foreground transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                <span className="text-sm">Recommencer</span>
              </button>
            </div>
          </motion.div>
        )}

        {currentStep === "complete" && (
          <motion.div
            key="complete"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
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
              Vérification réussie !
            </motion.h2>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-muted-foreground mb-8 max-w-xs"
            >
              Votre identité a été vérifiée avec succès. Vous obtiendrez le badge vérifié sur votre profil.
            </motion.p>

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
