import { User } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { OnboardingData } from "../OnboardingSteps";

interface NameStepProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
}

const NameStep = ({ data, updateData }: NameStepProps) => {
  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm mb-6">
        Comment souhaitez-vous être appelé(e) ?
      </p>

      <div className="relative">
        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Prénom"
          value={data.firstName}
          onChange={(e) => updateData({ firstName: e.target.value })}
          className="pl-12 h-14 glass border-0 rounded-2xl text-base"
          autoFocus
        />
      </div>

      <div className="relative">
        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Nom"
          value={data.lastName}
          onChange={(e) => updateData({ lastName: e.target.value })}
          className="pl-12 h-14 glass border-0 rounded-2xl text-base"
        />
      </div>
    </div>
  );
};

export default NameStep;
