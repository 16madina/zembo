import { useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { OnboardingData } from "../OnboardingSteps";

interface BirthdayStepProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
  onNext: () => void;
}

const BirthdayStep = ({ data, updateData, onNext }: BirthdayStepProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleDateSelect = (date: Date | undefined) => {
    updateData({ birthday: date || null });
    setIsOpen(false);
    // Auto-advance to next step after selection
    if (date) {
      setTimeout(() => onNext(), 300);
    }
  };

  // Calculate age from birthday
  const calculateAge = (birthday: Date) => {
    const today = new Date();
    let age = today.getFullYear() - birthday.getFullYear();
    const monthDiff = today.getMonth() - birthday.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthday.getDate())) {
      age--;
    }
    return age;
  };

  // Disable dates: must be at least 18 years old
  const maxDate = new Date();
  maxDate.setFullYear(maxDate.getFullYear() - 18);
  
  const minDate = new Date("1920-01-01");

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm mb-6">
        Quelle est votre date de naissance ? Vous devez avoir au moins 18 ans.
      </p>

      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full h-14 glass border-0 rounded-2xl text-base justify-start text-left font-normal",
              !data.birthday && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-3 h-5 w-5" />
            {data.birthday ? (
              format(data.birthday, "dd MMMM yyyy", { locale: fr })
            ) : (
              <span>Sélectionnez votre date de naissance</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 glass border-border" align="center">
          <Calendar
            mode="single"
            selected={data.birthday || undefined}
            onSelect={handleDateSelect}
            disabled={(date) => date > maxDate || date < minDate}
            initialFocus
            className={cn("p-3 pointer-events-auto")}
            defaultMonth={data.birthday || maxDate}
            captionLayout="dropdown-buttons"
            fromYear={1920}
            toYear={maxDate.getFullYear()}
          />
        </PopoverContent>
      </Popover>

      {data.birthday && (
        <div className="glass rounded-2xl p-4 text-center">
          <p className="text-3xl font-bold text-primary">
            {calculateAge(data.birthday)} ans
          </p>
          <p className="text-muted-foreground text-sm mt-1">
            Votre âge sera affiché sur votre profil
          </p>
        </div>
      )}
    </div>
  );
};

export default BirthdayStep;
