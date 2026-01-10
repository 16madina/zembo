import { Phone } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { OnboardingData } from "../OnboardingSteps";

interface PhoneStepProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
}

const PhoneStep = ({ data, updateData }: PhoneStepProps) => {
  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm mb-6">
        Entrez votre numéro de téléphone
      </p>

      <div className="flex gap-3">
        {/* Country code (auto-filled) */}
        <div className="w-24 h-14 glass rounded-2xl flex items-center justify-center gap-2 text-foreground font-medium">
          <span className="text-lg">
            {data.countryCode
              ? countries.find((c) => c.code === data.countryCode)?.flag
              : "🌍"}
          </span>
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
            className="pl-12 h-14 glass border-0 rounded-2xl text-base"
            autoFocus
          />
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Nous vous enverrons un code de vérification par SMS
      </p>
    </div>
  );
};

// Import countries for flag display
import { countries } from "@/data/countries";

export default PhoneStep;
