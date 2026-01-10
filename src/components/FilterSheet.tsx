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
        className="rounded-t-3xl glass-strong border-t-0 px-4 pb-8 pt-2 max-h-[85vh] overflow-y-auto"
      >
        {/* Drag handle */}
        <div className="flex justify-center mb-4">
          <div className="w-12 h-1.5 rounded-full bg-muted-foreground/30" />
        </div>

        <SheetHeader className="mb-6">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-xl font-bold">Filtres</SheetTitle>
            <motion.button
              onClick={handleReset}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Réinitialiser
            </motion.button>
          </div>
        </SheetHeader>

        <div className="space-y-8">
          {/* Age Range */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">Âge</span>
              <span className="text-sm text-primary font-semibold">
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
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>18 ans</span>
              <span>70 ans</span>
            </div>
          </div>

          {/* Distance */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">Distance maximale</span>
              <span className="text-sm text-primary font-semibold">
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
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>1 km</span>
              <span>100 km</span>
            </div>
          </div>

          {/* Gender Selection */}
          <div className="space-y-4">
            <span className="text-sm font-medium text-foreground">Je recherche</span>
            <div className="grid grid-cols-2 gap-2">
              {genderOptions.map((gender) => {
                const isSelected = localFilters.genders.includes(gender.id);
                return (
                  <motion.button
                    key={gender.id}
                    onClick={() => toggleGender(gender.id)}
                    whileTap={{ scale: 0.97 }}
                    className={`relative flex items-center gap-2 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 ${
                      isSelected
                        ? "text-primary-foreground"
                        : "text-foreground glass hover:bg-muted/50"
                    }`}
                  >
                    {isSelected && (
                      <motion.div
                        layoutId="selectedGender"
                        className="absolute inset-0 btn-gold rounded-xl"
                        transition={{ type: "spring", stiffness: 500, damping: 35 }}
                      />
                    )}
                    <span className="relative z-10 text-lg">{gender.emoji}</span>
                    <span className="relative z-10">{gender.label}</span>
                  </motion.button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Apply Button */}
        <motion.div className="mt-8">
          <Button
            onClick={handleApply}
            className="w-full btn-gold py-6 text-base font-semibold rounded-2xl"
          >
            Appliquer les filtres
          </Button>
        </motion.div>
      </SheetContent>
    </Sheet>
  );
};

export default FilterSheet;