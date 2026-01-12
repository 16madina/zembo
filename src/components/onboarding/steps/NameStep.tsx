import { useState, useEffect } from "react";
import { User, AlertCircle, CheckCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { validateName, formatName } from "@/lib/validation";
import type { OnboardingData } from "../OnboardingSteps";

interface NameStepProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
}

const NameStep = ({ data, updateData }: NameStepProps) => {
  const [firstNameError, setFirstNameError] = useState<string | null>(null);
  const [lastNameError, setLastNameError] = useState<string | null>(null);
  const [firstNameTouched, setFirstNameTouched] = useState(false);
  const [lastNameTouched, setLastNameTouched] = useState(false);

  // Validate on blur or when data changes (after touch)
  useEffect(() => {
    if (firstNameTouched && data.firstName.trim().length > 0) {
      const result = validateName(data.firstName);
      setFirstNameError(result.error);
    }
  }, [data.firstName, firstNameTouched]);

  useEffect(() => {
    if (lastNameTouched && data.lastName.trim().length > 0) {
      const result = validateName(data.lastName);
      setLastNameError(result.error);
    }
  }, [data.lastName, lastNameTouched]);

  const handleFirstNameChange = (value: string) => {
    updateData({ firstName: value });
    // Clear error while typing
    if (firstNameError && value.trim().length > 0) {
      const result = validateName(value);
      if (result.isValid) setFirstNameError(null);
    }
  };

  const handleLastNameChange = (value: string) => {
    updateData({ lastName: value });
    // Clear error while typing
    if (lastNameError && value.trim().length > 0) {
      const result = validateName(value);
      if (result.isValid) setLastNameError(null);
    }
  };

  const handleFirstNameBlur = () => {
    setFirstNameTouched(true);
    if (data.firstName.trim().length > 0) {
      // Format and validate
      const formatted = formatName(data.firstName);
      updateData({ firstName: formatted });
      const result = validateName(formatted);
      setFirstNameError(result.error);
    }
  };

  const handleLastNameBlur = () => {
    setLastNameTouched(true);
    if (data.lastName.trim().length > 0) {
      // Format and validate
      const formatted = formatName(data.lastName);
      updateData({ lastName: formatted });
      const result = validateName(formatted);
      setLastNameError(result.error);
    }
  };

  const firstNameValid = firstNameTouched && !firstNameError && data.firstName.trim().length >= 2;
  const lastNameValid = lastNameTouched && !lastNameError && data.lastName.trim().length >= 2;

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm mb-6">
        Comment souhaitez-vous être appelé(e) ?
      </p>

      <div className="space-y-1">
        <div className="relative">
          <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Prénom"
            value={data.firstName}
            onChange={(e) => handleFirstNameChange(e.target.value)}
            onBlur={handleFirstNameBlur}
            className={`pl-12 pr-12 h-14 glass border-0 rounded-2xl text-base ${
              firstNameError ? "ring-2 ring-destructive" : firstNameValid ? "ring-2 ring-green-500" : ""
            }`}
            autoFocus
          />
          {firstNameValid && (
            <CheckCircle className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />
          )}
          {firstNameError && (
            <AlertCircle className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-destructive" />
          )}
        </div>
        {firstNameError && (
          <p className="text-xs text-destructive px-2 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {firstNameError}
          </p>
        )}
      </div>

      <div className="space-y-1">
        <div className="relative">
          <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Nom"
            value={data.lastName}
            onChange={(e) => handleLastNameChange(e.target.value)}
            onBlur={handleLastNameBlur}
            className={`pl-12 pr-12 h-14 glass border-0 rounded-2xl text-base ${
              lastNameError ? "ring-2 ring-destructive" : lastNameValid ? "ring-2 ring-green-500" : ""
            }`}
          />
          {lastNameValid && (
            <CheckCircle className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />
          )}
          {lastNameError && (
            <AlertCircle className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-destructive" />
          )}
        </div>
        {lastNameError && (
          <p className="text-xs text-destructive px-2 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {lastNameError}
          </p>
        )}
      </div>

      <p className="text-xs text-muted-foreground mt-4">
        Utilisez votre vrai nom pour que les autres puissent vous reconnaître
      </p>
    </div>
  );
};

export default NameStep;
