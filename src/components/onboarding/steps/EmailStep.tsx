import { useState, useEffect } from "react";
import { Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { validateEmail } from "@/lib/validation";
import type { OnboardingData } from "../OnboardingSteps";

interface EmailStepProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
}

const EmailStep = ({ data, updateData }: EmailStepProps) => {
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailTouched, setEmailTouched] = useState(false);

  // Validate email on blur or when data changes (after touch)
  useEffect(() => {
    if (emailTouched && data.email.trim().length > 0) {
      const result = validateEmail(data.email);
      setEmailError(result.error);
    }
  }, [data.email, emailTouched]);

  const handleEmailChange = (value: string) => {
    updateData({ email: value });
    // Clear error while typing if email becomes valid
    if (emailError && value.trim().length > 0) {
      const result = validateEmail(value);
      if (result.isValid) setEmailError(null);
    }
  };

  const handleEmailBlur = () => {
    setEmailTouched(true);
    if (data.email.trim().length > 0) {
      const result = validateEmail(data.email.trim().toLowerCase());
      setEmailError(result.error);
      // Normalize email to lowercase
      updateData({ email: data.email.trim().toLowerCase() });
    }
  };

  const emailValid = emailTouched && !emailError && data.email.includes("@");
  const passwordValid = data.password.length >= 6;

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm mb-6">
        Créez vos identifiants de connexion
      </p>

      <div className="space-y-1">
        <div className="relative">
          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="email"
            placeholder="Adresse email"
            value={data.email}
            onChange={(e) => handleEmailChange(e.target.value)}
            onBlur={handleEmailBlur}
            className={`pl-12 pr-12 h-14 glass border-0 rounded-2xl text-base ${
              emailError ? "ring-2 ring-destructive" : emailValid ? "ring-2 ring-green-500" : ""
            }`}
            autoFocus
          />
          {emailValid && (
            <CheckCircle className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />
          )}
          {emailError && (
            <AlertCircle className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-destructive" />
          )}
        </div>
        {emailError && (
          <p className="text-xs text-destructive px-2 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {emailError}
          </p>
        )}
      </div>

      <div className="relative">
        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          type={showPassword ? "text" : "password"}
          placeholder="Mot de passe (min. 6 caractères)"
          value={data.password}
          onChange={(e) => updateData({ password: e.target.value })}
          className={`pl-12 pr-12 h-14 glass border-0 rounded-2xl text-base ${
            passwordValid ? "ring-2 ring-green-500" : ""
          }`}
        />
        {passwordValid && (
          <CheckCircle className="absolute right-10 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />
        )}
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
      
      <p className="text-xs text-amber-500/80 flex items-center gap-1 mt-2">
        <AlertCircle className="w-3 h-3" />
        Les emails temporaires (yopmail, tempmail...) ne sont pas acceptés
      </p>
    </div>
  );
};

export default EmailStep;
