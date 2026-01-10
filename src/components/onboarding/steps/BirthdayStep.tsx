import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Cake } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { OnboardingData } from "../OnboardingSteps";

interface BirthdayStepProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
  onNext: () => void;
}

const months = [
  { value: "0", label: "Janvier" },
  { value: "1", label: "Février" },
  { value: "2", label: "Mars" },
  { value: "3", label: "Avril" },
  { value: "4", label: "Mai" },
  { value: "5", label: "Juin" },
  { value: "6", label: "Juillet" },
  { value: "7", label: "Août" },
  { value: "8", label: "Septembre" },
  { value: "9", label: "Octobre" },
  { value: "10", label: "Novembre" },
  { value: "11", label: "Décembre" },
];

const BirthdayStep = ({ data, updateData, onNext }: BirthdayStepProps) => {
  const currentYear = new Date().getFullYear();
  const maxYear = currentYear - 18;
  const minYear = 1940;

  const initialDate = data.birthday || null;

  const [day, setDay] = useState<string>(initialDate ? String(initialDate.getDate()) : "");
  const [month, setMonth] = useState<string>(initialDate ? String(initialDate.getMonth()) : "");
  const [year, setYear] = useState<string>(initialDate ? String(initialDate.getFullYear()) : "");

  // Get days in the selected month
  const getDaysInMonth = (m: number, y: number) => {
    return new Date(y, m + 1, 0).getDate();
  };

  const selectedMonth = month ? parseInt(month) : 0;
  const selectedYear = year ? parseInt(year) : maxYear;
  const daysInMonth = getDaysInMonth(selectedMonth, selectedYear);

  // Generate arrays
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const years = Array.from({ length: maxYear - minYear + 1 }, (_, i) => maxYear - i);

  // Adjust day if it exceeds days in month
  useEffect(() => {
    if (day && parseInt(day) > daysInMonth) {
      setDay(String(daysInMonth));
    }
  }, [month, year, daysInMonth, day]);

  // Update the birthday when all values are selected
  useEffect(() => {
    if (day && month && year) {
      const selectedDate = new Date(parseInt(year), parseInt(month), parseInt(day));
      updateData({ birthday: selectedDate });
    }
  }, [day, month, year, updateData]);

  const isComplete = day && month && year;

  const calculateAge = () => {
    if (!isComplete) return 0;
    const today = new Date();
    const birthDate = new Date(parseInt(year), parseInt(month), parseInt(day));
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const handleConfirm = () => {
    if (isComplete) {
      onNext();
    }
  };

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground text-sm">
        Quelle est votre date de naissance ? Vous devez avoir au moins 18 ans.
      </p>

      {/* Date Selectors */}
      <div className="grid grid-cols-3 gap-3">
        {/* Day */}
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground uppercase tracking-wider">
            Jour
          </label>
          <Select value={day} onValueChange={setDay}>
            <SelectTrigger className="h-14 glass border-0 rounded-xl text-lg font-medium">
              <SelectValue placeholder="--" />
            </SelectTrigger>
            <SelectContent className="glass border-border max-h-60">
              {days.map((d) => (
                <SelectItem key={d} value={String(d)} className="text-lg">
                  {String(d).padStart(2, "0")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Month */}
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground uppercase tracking-wider">
            Mois
          </label>
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="h-14 glass border-0 rounded-xl text-lg font-medium">
              <SelectValue placeholder="--" />
            </SelectTrigger>
            <SelectContent className="glass border-border max-h-60">
              {months.map((m) => (
                <SelectItem key={m.value} value={m.value} className="text-base">
                  {m.label.substring(0, 3)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Year */}
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground uppercase tracking-wider">
            Année
          </label>
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="h-14 glass border-0 rounded-xl text-lg font-medium">
              <SelectValue placeholder="----" />
            </SelectTrigger>
            <SelectContent className="glass border-border max-h-60">
              {years.map((y) => (
                <SelectItem key={y} value={String(y)} className="text-lg">
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Age display */}
      {isComplete && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl p-5 text-center border border-primary/20"
        >
          <div className="flex items-center justify-center gap-3 mb-1">
            <Cake className="w-5 h-5 text-primary" />
            <p className="text-3xl font-bold text-primary">
              {calculateAge()} ans
            </p>
          </div>
          <p className="text-muted-foreground text-sm">
            {parseInt(day)} {months[parseInt(month)].label} {year}
          </p>
        </motion.div>
      )}

      {/* Confirm button */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleConfirm}
        disabled={!isComplete}
        className="w-full h-14 btn-gold rounded-2xl text-base font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Confirmer
      </motion.button>
    </div>
  );
};

export default BirthdayStep;
