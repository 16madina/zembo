import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { isValidPhoneLength } from "@/data/countries";
import { FaceRecognitionPreloadProvider } from "@/contexts/FaceRecognitionPreloadContext";
import NameStep from "./steps/NameStep";
import CountryStep from "./steps/CountryStep";
import PhoneStep from "./steps/PhoneStep";
import EmailStep from "./steps/EmailStep";
import BirthdayStep from "./steps/BirthdayStep";
import GenderAndPreferenceStep from "./steps/GenderAndPreferenceStep";
import InterestsStep from "./steps/InterestsStep";
import PhotosStep from "./steps/PhotosStep";
import { FaceVerificationStep } from "./steps/FaceVerificationStep";

// Background images
import bgIdentity from "@/assets/onboarding/bg-identity.jpg";
import bgCountry from "@/assets/onboarding/bg-country.jpg";
import bgPhone from "@/assets/onboarding/bg-phone.jpg";
import bgEmail from "@/assets/onboarding/bg-email.jpg";
import bgBirthday from "@/assets/onboarding/bg-birthday.jpg";
import bgGender from "@/assets/onboarding/bg-gender.jpg";
import bgInterests from "@/assets/onboarding/bg-interests.jpg";
import bgPhotos from "@/assets/onboarding/bg-photos.jpg";
import bgVerification from "@/assets/onboarding/bg-verification.jpg";

export interface OnboardingData {
  firstName: string;
  lastName: string;
  country: string;
  countryCode: string;
  dialCode: string;
  phone: string;
  email: string;
  password: string;
  birthday: Date | null;
  gender: string;
  lookingFor: string[];
  interests: string[];
  photos: string[];
  faceVerified: boolean;
}

interface OnboardingStepsProps {
  onComplete: (data: OnboardingData) => void;
  onBack: () => void;
}

const steps = [
  { id: "name", title: "Votre identité", bg: bgIdentity },
  { id: "country", title: "Votre pays", bg: bgCountry },
  { id: "phone", title: "Téléphone", bg: bgPhone },
  { id: "email", title: "Email & mot de passe", bg: bgEmail },
  { id: "birthday", title: "Votre âge", bg: bgBirthday },
  { id: "genderAndPreference", title: "Je suis & Je recherche", bg: bgGender },
  { id: "interests", title: "Centres d'intérêt", bg: bgInterests },
  { id: "photos", title: "Vos photos", bg: bgPhotos },
  { id: "faceVerification", title: "Vérification", bg: bgVerification, fullScreen: true },
];

const OnboardingStepsInner = ({ onComplete, onBack }: OnboardingStepsProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData] = useState<OnboardingData>({
    firstName: "",
    lastName: "",
    country: "",
    countryCode: "",
    dialCode: "",
    phone: "",
    email: "",
    password: "",
    birthday: null,
    gender: "",
    lookingFor: [],
    interests: [],
    photos: [],
    faceVerified: false,
  });

  const progress = ((currentStep + 1) / steps.length) * 100;

  const updateData = (updates: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      onComplete(data);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    } else {
      onBack();
    }
  };

  const isStepValid = () => {
    switch (steps[currentStep].id) {
      case "name":
        return data.firstName.trim().length >= 2 && data.lastName.trim().length >= 2;
      case "country":
        return data.country.length > 0;
      case "phone":
        return isValidPhoneLength(data.phone, data.countryCode);
      case "email":
        return data.email.includes("@") && data.password.length >= 6;
      case "birthday":
        return data.birthday !== null;
      case "genderAndPreference":
        return data.gender.length > 0 && data.lookingFor.length > 0;
      case "interests":
        return data.interests.length >= 3;
      case "photos":
        return data.photos.length >= 1;
      case "faceVerification":
        return data.faceVerified;
      default:
        return false;
    }
  };

  const renderStep = () => {
    switch (steps[currentStep].id) {
      case "name":
        return <NameStep data={data} updateData={updateData} />;
      case "country":
        return <CountryStep data={data} updateData={updateData} onNext={handleNext} />;
      case "phone":
        return <PhoneStep data={data} updateData={updateData} />;
      case "email":
        return <EmailStep data={data} updateData={updateData} />;
      case "birthday":
        return <BirthdayStep data={data} updateData={updateData} onNext={handleNext} />;
      case "genderAndPreference":
        return <GenderAndPreferenceStep data={data} updateData={updateData} />;
      case "interests":
        return <InterestsStep data={data} updateData={updateData} />;
      case "photos":
        return <PhotosStep data={data} updateData={updateData} />;
      case "faceVerification":
        return <FaceVerificationStep data={data} updateData={updateData} onNext={handleNext} onBack={handleBack} />;
      default:
        return null;
    }
  };

  const currentStepConfig = steps[currentStep];
  const isFullScreen = 'fullScreen' in currentStepConfig && currentStepConfig.fullScreen;

  // Full screen mode for face verification
  if (isFullScreen) {
    return (
      <div className="min-h-screen flex flex-col relative overflow-hidden bg-background">
        {/* Background Image with Animation */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0 z-0"
          >
            <img
              src={currentStepConfig.bg}
              alt=""
              className="w-full h-full object-cover"
            />
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/95 to-background/70" />
          </motion.div>
        </AnimatePresence>

        {/* Full Screen Content */}
        <div className="relative z-10 flex-1 flex flex-col safe-area-top safe-area-bottom">
          {renderStep()}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full fixed inset-0 flex flex-col relative overflow-hidden">
      {/* Background Image with Animation */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.5 }}
          className="absolute inset-0 z-0"
        >
          <img
            src={currentStepConfig.bg}
            alt=""
            className="w-full h-full object-cover"
          />
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/90 to-background/40" />
        </motion.div>
      </AnimatePresence>

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col px-6 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
        {/* Header - Fixed */}
        <div className="flex-shrink-0 flex items-center gap-4 py-6">
          <button
            onClick={handleBack}
            className="w-10 h-10 rounded-full glass flex items-center justify-center tap-highlight"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex-1">
            <Progress value={progress} className="h-2" />
          </div>
          <span className="text-sm text-muted-foreground font-medium">
            {currentStep + 1}/{steps.length}
          </span>
        </div>

        {/* Step Title */}
        <motion.h1
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex-shrink-0 text-2xl font-bold text-foreground mb-4"
        >
          {currentStepConfig.title}
        </motion.h1>

        {/* Step Content - Scrollable */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
            >
              {renderStep()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Next Button - Fixed at bottom */}
        <div className="flex-shrink-0 py-4 bg-gradient-to-t from-background via-background to-transparent">
          <Button
            onClick={handleNext}
            disabled={!isStepValid()}
            className="w-full h-14 btn-gold rounded-2xl text-base font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {currentStep === steps.length - 1 ? (
              <>
                Terminer
                <Check className="w-5 h-5" />
              </>
            ) : (
              <>
                Suivant
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

// Wrapper with FaceRecognitionPreloadProvider to preload models early
const OnboardingSteps = (props: OnboardingStepsProps) => {
  return (
    <FaceRecognitionPreloadProvider>
      <OnboardingStepsInner {...props} />
    </FaceRecognitionPreloadProvider>
  );
};

export default OnboardingSteps;
