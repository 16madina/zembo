import { useState } from "react";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { OnboardingData } from "../OnboardingSteps";

interface EmailStepProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
}

const EmailStep = ({ data, updateData }: EmailStepProps) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm mb-6">
        Créez vos identifiants de connexion
      </p>

      <div className="relative">
        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          type="email"
          placeholder="Adresse email"
          value={data.email}
          onChange={(e) => updateData({ email: e.target.value })}
          className="pl-12 h-14 glass border-0 rounded-2xl text-base"
          autoFocus
        />
      </div>

      <div className="relative">
        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          type={showPassword ? "text" : "password"}
          placeholder="Mot de passe (min. 6 caractères)"
          value={data.password}
          onChange={(e) => updateData({ password: e.target.value })}
          className="pl-12 pr-12 h-14 glass border-0 rounded-2xl text-base"
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground"
        >
          {showPassword ? (
            <EyeOff className="w-5 h-5" />
          ) : (
            <Eye className="w-5 h-5" />
          )}
        </button>
      </div>

      <p className="text-xs text-muted-foreground">
        Le mot de passe doit contenir au moins 6 caractères
      </p>
    </div>
  );
};

export default EmailStep;
