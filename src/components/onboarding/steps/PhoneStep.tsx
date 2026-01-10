import { Phone, AlertCircle, CheckCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { countries, isValidPhoneLength, getExpectedPhoneLength } from "@/data/countries";
import FlagIcon from "@/components/FlagIcon";
import type { OnboardingData } from "../OnboardingSteps";

interface PhoneStepProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
}

const PhoneStep = ({ data, updateData }: PhoneStepProps) => {
  const expectedLength = getExpectedPhoneLength(data.countryCode);
  const isValid = isValidPhoneLength(data.phone, data.countryCode);
  const hasInput = data.phone.length > 0;

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
            }}
            className={`pl-12 pr-12 h-14 glass border-2 rounded-2xl text-base ${
              hasInput
                ? isValid
                  ? "border-green-500/50 focus:border-green-500"
                  : "border-red-500/50 focus:border-red-500"
                : "border-transparent"
            }`}
            autoFocus
          />
          {hasInput && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              {isValid ? (
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
        <p className={`font-medium ${hasInput && !isValid ? "text-red-400" : "text-muted-foreground"}`}>
          {data.phone.length}/{expectedLength} chiffres
        </p>
      </div>

      {hasInput && !isValid && (
        <div className="glass rounded-xl p-3 border border-red-500/30 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
          <p className="text-sm text-red-400">
            Le numéro de téléphone pour {data.country || "ce pays"} doit contenir {expectedLength} chiffres
          </p>
        </div>
      )}
    </div>
  );
};

export default PhoneStep;
