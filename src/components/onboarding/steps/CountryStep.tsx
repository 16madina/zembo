import { useState } from "react";
import { Search, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { countries } from "@/data/countries";
import FlagIcon from "@/components/FlagIcon";
import type { OnboardingData } from "../OnboardingSteps";

interface CountryStepProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
  onNext: () => void;
}

const CountryStep = ({ data, updateData, onNext }: CountryStepProps) => {
  const [search, setSearch] = useState("");

  const filteredCountries = countries.filter((country) =>
    country.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (country: typeof countries[0]) => {
    updateData({
      country: country.name,
      countryCode: country.code,
      dialCode: country.dialCode,
    });
    // Auto-advance to next step after selection
    setTimeout(() => onNext(), 300);
  };

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm mb-4">
        Sélectionnez votre pays de résidence
      </p>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Rechercher un pays..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-12 h-14 glass border-0 rounded-2xl text-base"
        />
      </div>

      <ScrollArea className="h-[400px] rounded-2xl glass p-2">
        <div className="space-y-1">
          {filteredCountries.map((country) => (
            <button
              key={country.code}
              onClick={() => handleSelect(country)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all tap-highlight ${
                data.countryCode === country.code
                  ? "bg-primary/20 border border-primary/30"
                  : "hover:bg-secondary/50"
              }`}
            >
              <FlagIcon countryCode={country.code} className="w-6 h-4" />
              <span className="flex-1 text-left text-foreground">
                {country.name}
              </span>
              <span className="text-muted-foreground text-sm">
                {country.dialCode}
              </span>
              {data.countryCode === country.code && (
                <Check className="w-5 h-5 text-primary" />
              )}
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default CountryStep;
