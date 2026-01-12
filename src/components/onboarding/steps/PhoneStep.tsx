import { useState, useEffect, useCallback } from "react";
import { Phone, AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { countries, isValidPhoneLength, getExpectedPhoneLength } from "@/data/countries";
import { isPhoneTaken } from "@/lib/uniqueCheck";
import FlagIcon from "@/components/FlagIcon";
import type { OnboardingData } from "../OnboardingSteps";

interface PhoneStepProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
}

const PhoneStep = ({ data, updateData }: PhoneStepProps) => {
  const expectedLength = getExpectedPhoneLength(data.countryCode);
  const isValidLength = isValidPhoneLength(data.phone, data.countryCode);
  const hasInput = data.phone.length > 0;
  
  const [isChecking, setIsChecking] = useState(false);
  const [isTaken, setIsTaken] = useState(false);
  const [lastCheckedPhone, setLastCheckedPhone] = useState("");

  // Debounced uniqueness check
  const checkPhoneUniqueness = useCallback(async (phone: string, dialCode: string) => {
    if (!phone || !dialCode || !isValidPhoneLength(phone, data.countryCode)) {
      setIsTaken(false);
      return;
    }

    const fullPhone = `${dialCode}${phone}`;
    if (fullPhone === lastCheckedPhone) return;

    setIsChecking(true);
    try {
      const taken = await isPhoneTaken(phone, dialCode);
      setIsTaken(taken);
      setLastCheckedPhone(fullPhone);
    } catch (error) {
      console.error("Error checking phone:", error);
      setIsTaken(false);
    } finally {
      setIsChecking(false);
    }
  }, [data.countryCode, lastCheckedPhone]);

  // Check uniqueness when phone is valid
  useEffect(() => {
    if (isValidLength && data.phone && data.dialCode) {
      const timeoutId = setTimeout(() => {
        checkPhoneUniqueness(data.phone, data.dialCode);
      }, 500);
      return () => clearTimeout(timeoutId);
    } else {
      setIsTaken(false);
    }
  }, [data.phone, data.dialCode, isValidLength, checkPhoneUniqueness]);

  const isValid = isValidLength && !isTaken;

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm mb-6">
        Entrez votre numéro de téléphone
      </p>

      <div className="flex gap-3">
        {/* Country code (auto-filled) */}
        <div className="w-28 h-14 glass rounded-2xl flex items-center justify-center gap-2 text-foreground font-medium">
          <FlagIcon countryCode={data.countryCode || ""} className="w-6 h-4" />
          <span>{data.dialCode || "+--"}</span>
        </div>

        {/* Phone number input */}
        <div className="relative flex-1">
          <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="tel"
            placeholder="Numéro de téléphone"
            value={data.phone}
            onChange={(e) => {
              // Only allow numbers
              const value = e.target.value.replace(/\D/g, "");
              updateData({ phone: value });
              // Reset taken state when typing
              if (isTaken) setIsTaken(false);
            }}
            className={`pl-12 pr-12 h-14 glass border-2 rounded-2xl text-base ${
              hasInput
                ? isTaken
                  ? "border-red-500/50 focus:border-red-500"
                  : isValidLength
                    ? "border-green-500/50 focus:border-green-500"
                    : "border-red-500/50 focus:border-red-500"
                : "border-transparent"
            }`}
            autoFocus
          />
          {hasInput && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              {isChecking ? (
                <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
              ) : isTaken ? (
                <AlertCircle className="w-5 h-5 text-red-500" />
              ) : isValidLength ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-500" />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Validation feedback */}
      <div className="flex items-center justify-between text-xs">
        <p className="text-muted-foreground">
          Nous vous enverrons un code de vérification par SMS
        </p>
        <p className={`font-medium ${hasInput && !isValidLength ? "text-red-400" : "text-muted-foreground"}`}>
          {data.phone.length}/{expectedLength} chiffres
        </p>
      </div>

      {hasInput && !isValidLength && (
        <div className="glass rounded-xl p-3 border border-red-500/30 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
          <p className="text-sm text-red-400">
            Le numéro de téléphone pour {data.country || "ce pays"} doit contenir {expectedLength} chiffres
          </p>
        </div>
      )}

      {isTaken && (
        <div className="glass rounded-xl p-3 border border-red-500/30 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
          <p className="text-sm text-red-400">
            Ce numéro de téléphone est déjà associé à un compte. Veuillez vous connecter ou utiliser un autre numéro.
          </p>
        </div>
      )}
    </div>
  );
};

export default PhoneStep;
