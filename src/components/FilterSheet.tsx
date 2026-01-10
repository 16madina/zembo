import { useState } from "react";
import { motion } from "framer-motion";
import { X, RotateCcw } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";

export interface FilterValues {
  ageMin: number;
  ageMax: number;
  distance: number;
  genders: string[];
}

interface FilterSheetProps {
  isOpen: boolean;
  onClose: () => void;
  filters: FilterValues;
  onApply: (filters: FilterValues) => void;
}

const genderOptions = [
  { id: "women", label: "Femmes", emoji: "👩" },
  { id: "men", label: "Hommes", emoji: "👨" },
  { id: "nonbinary", label: "Non-binaire", emoji: "🌈" },
  { id: "trans", label: "Trans", emoji: "⚧️" },
  { id: "all", label: "Tout le monde", emoji: "💫" },
];

const FilterSheet = ({ isOpen, onClose, filters, onApply }: FilterSheetProps) => {
  const [localFilters, setLocalFilters] = useState<FilterValues>(filters);

  const handleAgeChange = (values: number[]) => {
    setLocalFilters((prev) => ({
      ...prev,
      ageMin: values[0],
      ageMax: values[1],
    }));
  };

  const handleDistanceChange = (values: number[]) => {
    setLocalFilters((prev) => ({
      ...prev,
      distance: values[0],
    }));
  };

  const toggleGender = (genderId: string) => {
    if (genderId === "all") {
      // If "all" is selected, toggle between all and none
      if (localFilters.genders.includes("all")) {
        setLocalFilters((prev) => ({ ...prev, genders: [] }));
      } else {
        setLocalFilters((prev) => ({ ...prev, genders: ["all"] }));
      }
    } else {
      // Remove "all" if individual options are selected
      const newGenders = localFilters.genders.filter((g) => g !== "all");
      if (newGenders.includes(genderId)) {
        setLocalFilters((prev) => ({
          ...prev,
          genders: newGenders.filter((g) => g !== genderId),
        }));
      } else {
        setLocalFilters((prev) => ({
          ...prev,
          genders: [...newGenders, genderId],
        }));
      }
    }
  };

  const handleReset = () => {
    setLocalFilters({
      ageMin: 18,
      ageMax: 50,
      distance: 50,
      genders: ["all"],
    });
  };

  const handleApply = () => {
    onApply(localFilters);
    onClose();
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent 
        side="bottom" 
        className="rounded-t-3xl glass-strong border-t-0 px-4 pb-6 pt-2"
      >
        {/* Drag handle */}
        <div className="flex justify-center mb-3">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        <SheetHeader className="mb-4">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-lg font-bold">Filtres</SheetTitle>
            <motion.button
              onClick={handleReset}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              Réinitialiser
            </motion.button>
          </div>
        </SheetHeader>

        <div className="space-y-5">
          {/* Age Range */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-foreground">Âge</span>
              <span className="text-xs text-primary font-semibold">
                {localFilters.ageMin} - {localFilters.ageMax} ans
              </span>
            </div>
            <Slider
              value={[localFilters.ageMin, localFilters.ageMax]}
              onValueChange={handleAgeChange}
              min={18}
              max={70}
              step={1}
              className="w-full"
            />
          </div>

          {/* Distance */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-foreground">Distance max</span>
              <span className="text-xs text-primary font-semibold">
                {localFilters.distance} km
              </span>
            </div>
            <Slider
              value={[localFilters.distance]}
              onValueChange={handleDistanceChange}
              min={1}
              max={100}
              step={1}
              className="w-full"
            />
          </div>

          {/* Gender Selection */}
          <div className="space-y-2">
            <span className="text-xs font-medium text-foreground">Je recherche</span>
            <div className="flex flex-wrap gap-1.5">
              {genderOptions.map((gender) => {
                const isSelected = localFilters.genders.includes(gender.id);
                return (
                  <motion.button
                    key={gender.id}
                    onClick={() => toggleGender(gender.id)}
                    whileTap={{ scale: 0.97 }}
                    className={`relative flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-medium text-xs transition-all duration-200 ${
                      isSelected
                        ? "text-primary-foreground"
                        : "text-foreground glass hover:bg-muted/50"
                    }`}
                  >
                    {isSelected && (
                      <motion.div
                        layoutId="selectedGender"
                        className="absolute inset-0 btn-gold rounded-lg"
                        transition={{ type: "spring", stiffness: 500, damping: 35 }}
                      />
                    )}
                    <span className="relative z-10 text-sm">{gender.emoji}</span>
                    <span className="relative z-10">{gender.label}</span>
                  </motion.button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Apply Button */}
        <motion.div className="mt-5">
          <Button
            onClick={handleApply}
            className="w-full btn-gold py-4 text-sm font-semibold rounded-xl"
          >
            Appliquer les filtres
          </Button>
        </motion.div>
      </SheetContent>
    </Sheet>
  );
};

export default FilterSheet;