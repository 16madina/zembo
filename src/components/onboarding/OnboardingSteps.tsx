import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { isValidPhoneLength } from "@/data/countries";
import NameStep from "./steps/NameStep";
import CountryStep from "./steps/CountryStep";
import PhoneStep from "./steps/PhoneStep";
import EmailStep from "./steps/EmailStep";
import BirthdayStep from "./steps/BirthdayStep";
import GenderStep from "./steps/GenderStep";
import LookingForStep from "./steps/LookingForStep";
import InterestsStep from "./steps/InterestsStep";

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
}

interface OnboardingStepsProps {
  onComplete: (data: OnboardingData) => void;
  onBack: () => void;
}

const steps = [
  { id: "name", title: "Votre identité" },
  { id: "country", title: "Votre pays" },
  { id: "phone", title: "Téléphone" },
  { id: "email", title: "Email & mot de passe" },
  { id: "birthday", title: "Votre âge" },
  { id: "gender", title: "Je suis" },
  { id: "lookingFor", title: "Je recherche" },
  { id: "interests", title: "Centres d'intérêt" },
];

const OnboardingSteps = ({ onComplete, onBack }: OnboardingStepsProps) => {
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
      case "gender":
        return data.gender.length > 0;
      case "lookingFor":
        return data.lookingFor.length > 0;
      case "interests":
        return data.interests.length >= 3;
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
      case "gender":
        return <GenderStep data={data} updateData={updateData} onNext={handleNext} />;
      case "lookingFor":
        return <LookingForStep data={data} updateData={updateData} />;
      case "interests":
        return <InterestsStep data={data} updateData={updateData} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col px-6 py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
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
        className="text-2xl font-bold text-foreground mb-6"
      >
        {steps[currentStep].title}
      </motion.h1>

      {/* Step Content */}
      <div className="flex-1">
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

      {/* Next Button */}
      <div className="pt-6">
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
  );
};

export default OnboardingSteps;
