import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ChevronUp, ChevronDown, Cake } from "lucide-react";
import type { OnboardingData } from "../OnboardingSteps";

interface BirthdayStepProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
  onNext: () => void;
}

const months = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

const BirthdayStep = ({ data, updateData, onNext }: BirthdayStepProps) => {
  const currentYear = new Date().getFullYear();
  const maxYear = currentYear - 18;
  const minYear = 1920;

  // Initialize with selected date or default to 18 years ago
  const initialDate = data.birthday || new Date(maxYear, 0, 1);
  
  const [day, setDay] = useState(initialDate.getDate());
  const [month, setMonth] = useState(initialDate.getMonth());
  const [year, setYear] = useState(initialDate.getFullYear());
  const [isValid, setIsValid] = useState(false);

  // Get days in the selected month
  const getDaysInMonth = (m: number, y: number) => {
    return new Date(y, m + 1, 0).getDate();
  };

  const daysInMonth = getDaysInMonth(month, year);

  // Adjust day if it exceeds days in month
  useEffect(() => {
    if (day > daysInMonth) {
      setDay(daysInMonth);
    }
  }, [month, year, daysInMonth, day]);

  // Update the birthday when values change
  useEffect(() => {
    const selectedDate = new Date(year, month, day);
    const today = new Date();
    let age = today.getFullYear() - selectedDate.getFullYear();
    const monthDiff = today.getMonth() - selectedDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < selectedDate.getDate())) {
      age--;
    }

    const valid = age >= 18 && year >= minYear && year <= maxYear;
    setIsValid(valid);

    if (valid) {
      updateData({ birthday: selectedDate });
    }
  }, [day, month, year, updateData]);

  const calculateAge = () => {
    const today = new Date();
    const birthDate = new Date(year, month, day);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const handleConfirm = () => {
    if (isValid) {
      onNext();
    }
  };

  // Scroll wheel component
  const ScrollWheel = ({
    value,
    onChange,
    items,
    displayFn,
  }: {
    value: number;
    onChange: (val: number) => void;
    items: number[];
    displayFn: (val: number) => string;
  }) => {
    const currentIndex = items.indexOf(value);

    const handleUp = () => {
      const newIndex = Math.max(0, currentIndex - 1);
      onChange(items[newIndex]);
    };

    const handleDown = () => {
      const newIndex = Math.min(items.length - 1, currentIndex + 1);
      onChange(items[newIndex]);
    };

    return (
      <div className="flex flex-col items-center gap-2">
        <button
          onClick={handleUp}
          disabled={currentIndex === 0}
          className="w-12 h-12 rounded-full glass flex items-center justify-center tap-highlight disabled:opacity-30 transition-all hover:bg-primary/20"
        >
          <ChevronUp className="w-6 h-6 text-foreground" />
        </button>

        <div className="relative h-32 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-background pointer-events-none z-10" />
          
          <div className="flex flex-col items-center justify-center h-full">
            {/* Previous value */}
            <motion.div
              key={`prev-${value}`}
              className="text-muted-foreground/40 text-lg h-8 flex items-center"
            >
              {currentIndex > 0 ? displayFn(items[currentIndex - 1]) : ""}
            </motion.div>

            {/* Current value */}
            <motion.div
              key={value}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-3xl font-bold text-primary h-12 flex items-center"
            >
              {displayFn(value)}
            </motion.div>

            {/* Next value */}
            <motion.div
              key={`next-${value}`}
              className="text-muted-foreground/40 text-lg h-8 flex items-center"
            >
              {currentIndex < items.length - 1 ? displayFn(items[currentIndex + 1]) : ""}
            </motion.div>
          </div>
        </div>

        <button
          onClick={handleDown}
          disabled={currentIndex === items.length - 1}
          className="w-12 h-12 rounded-full glass flex items-center justify-center tap-highlight disabled:opacity-30 transition-all hover:bg-primary/20"
        >
          <ChevronDown className="w-6 h-6 text-foreground" />
        </button>
      </div>
    );
  };

  // Generate arrays
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const monthIndices = Array.from({ length: 12 }, (_, i) => i);
  const years = Array.from({ length: maxYear - minYear + 1 }, (_, i) => maxYear - i);

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground text-sm mb-4">
        Quelle est votre date de naissance ? Vous devez avoir au moins 18 ans.
      </p>

      {/* Premium Date Picker */}
      <div className="glass rounded-3xl p-6">
        <div className="flex justify-center gap-4 md:gap-8">
          {/* Day */}
          <div className="flex flex-col items-center">
            <span className="text-xs text-muted-foreground mb-2 uppercase tracking-wider">Jour</span>
            <ScrollWheel
              value={day}
              onChange={setDay}
              items={days}
              displayFn={(d) => String(d).padStart(2, "0")}
            />
          </div>

          {/* Separator */}
          <div className="flex items-center pt-6">
            <div className="w-px h-24 bg-border/50" />
          </div>

          {/* Month */}
          <div className="flex flex-col items-center">
            <span className="text-xs text-muted-foreground mb-2 uppercase tracking-wider">Mois</span>
            <ScrollWheel
              value={month}
              onChange={setMonth}
              items={monthIndices}
              displayFn={(m) => months[m].substring(0, 3)}
            />
          </div>

          {/* Separator */}
          <div className="flex items-center pt-6">
            <div className="w-px h-24 bg-border/50" />
          </div>

          {/* Year */}
          <div className="flex flex-col items-center">
            <span className="text-xs text-muted-foreground mb-2 uppercase tracking-wider">Année</span>
            <ScrollWheel
              value={year}
              onChange={setYear}
              items={years}
              displayFn={(y) => String(y)}
            />
          </div>
        </div>
      </div>

      {/* Age display */}
      {isValid && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl p-5 text-center border border-primary/20"
        >
          <div className="flex items-center justify-center gap-3 mb-2">
            <Cake className="w-6 h-6 text-primary" />
            <p className="text-4xl font-bold bg-gradient-to-r from-primary to-yellow-400 bg-clip-text text-transparent">
              {calculateAge()} ans
            </p>
          </div>
          <p className="text-muted-foreground text-sm">
            Né(e) le {day} {months[month]} {year}
          </p>
        </motion.div>
      )}

      {/* Confirm button */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleConfirm}
        disabled={!isValid}
        className="w-full h-14 btn-gold rounded-2xl text-base font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Confirmer ma date de naissance
      </motion.button>
    </div>
  );
};

export default BirthdayStep;
