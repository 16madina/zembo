import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Briefcase, GraduationCap, Ruler, ChevronDown, User, Calendar, Type, FileText, Heart } from "lucide-react";
import { toast } from "sonner";

type FieldType = "occupation" | "education" | "height" | "gender" | "age" | "display_name" | "bio" | "interests";

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  field: FieldType;
  currentValue?: string | number | string[] | null;
  onUpdate: (field: string, value: string | number | string[]) => void;
}

const educationOptions = [
  "Baccalauréat",
  "BTS / DUT",
  "Licence",
  "Master",
  "Doctorat",
  "École d'ingénieur",
  "École de commerce",
  "Formation professionnelle",
  "Autodidacte",
  "Autre",
];

const heightOptions = Array.from({ length: 61 }, (_, i) => `${140 + i} cm`);

const genderOptions = [
  { value: "male", label: "Homme" },
  { value: "female", label: "Femme" },
  { value: "lgbt", label: "LGBT+" },
];

const interestsList = [
  "Voyages", "Musique", "Sport", "Cinéma", "Lecture", "Cuisine",
  "Photographie", "Art", "Danse", "Jeux vidéo", "Nature", "Mode",
  "Technologie", "Fitness", "Yoga", "Méditation", "Animaux", "Randonnée",
  "Plage", "Montagne", "Festivals", "Théâtre", "Concerts", "Restaurants",
  "Café", "Vin", "Bière", "Cocktails", "Jardinage", "DIY"
];

const days = Array.from({ length: 31 }, (_, i) => i + 1);
const months = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];
const currentYear = new Date().getFullYear();
const years = Array.from({ length: 82 }, (_, i) => currentYear - 18 - i);

const fieldConfig: Record<FieldType, { icon: any; label: string; placeholder: string; type: string; options?: string[] }> = {
  occupation: {
    icon: Briefcase,
    label: "Profession",
    placeholder: "Ex: Développeur, Médecin, Étudiant...",
    type: "text",
  },
  education: {
    icon: GraduationCap,
    label: "Études",
    placeholder: "Sélectionnez votre niveau d'études",
    type: "select",
    options: educationOptions,
  },
  height: {
    icon: Ruler,
    label: "Taille",
    placeholder: "Sélectionnez votre taille",
    type: "select",
    options: heightOptions,
  },
  gender: {
    icon: User,
    label: "Genre",
    placeholder: "Sélectionnez votre genre",
    type: "gender",
  },
  age: {
    icon: Calendar,
    label: "Date de naissance",
    placeholder: "Sélectionnez votre date de naissance",
    type: "birthdate",
  },
  display_name: {
    icon: Type,
    label: "Nom d'affichage",
    placeholder: "Votre prénom ou pseudo...",
    type: "text",
  },
  bio: {
    icon: FileText,
    label: "Bio",
    placeholder: "Décrivez-vous en quelques mots...",
    type: "textarea",
  },
  interests: {
    icon: Heart,
    label: "Centres d'intérêt",
    placeholder: "Sélectionnez 3 à 10 centres d'intérêt",
    type: "interests",
  },
};

const EditProfileModal = ({
  isOpen,
  onClose,
  userId,
  field,
  currentValue,
  onUpdate,
}: EditProfileModalProps) => {
  const [value, setValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  
  // For birthdate
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [activePicker, setActivePicker] = useState<"day" | "month" | "year" | null>(null);

  const config = fieldConfig[field];
  const Icon = config.icon;

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      if (field === "interests" && Array.isArray(currentValue)) {
        setSelectedInterests(currentValue);
      } else {
        setValue(currentValue?.toString() || "");
      }
    }
  }, [isOpen, currentValue, field]);

  const handleSave = async () => {
    if (config.type === "birthdate") {
      if (!selectedDay || selectedMonth === null || !selectedYear) {
        toast.error("Veuillez sélectionner une date complète");
        return;
      }
      const age = currentYear - selectedYear;
      setIsLoading(true);
      try {
        onUpdate("age", age);
        toast.success("Date de naissance mise à jour");
        onClose();
      } catch (error) {
        toast.error("Erreur lors de la mise à jour");
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (config.type === "interests") {
      if (selectedInterests.length < 3) {
        toast.error("Sélectionnez au moins 3 centres d'intérêt");
        return;
      }
      setIsLoading(true);
      try {
        onUpdate("interests", selectedInterests);
        toast.success("Centres d'intérêt mis à jour");
        onClose();
      } catch (error) {
        toast.error("Erreur lors de la mise à jour");
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (!value.trim()) {
      toast.error("Veuillez entrer une valeur");
      return;
    }

    // Validation for display_name
    if (field === "display_name" && value.trim().length > 50) {
      toast.error("Le nom ne doit pas dépasser 50 caractères");
      return;
    }

    // Validation for bio
    if (field === "bio" && value.trim().length > 500) {
      toast.error("La bio ne doit pas dépasser 500 caractères");
      return;
    }

    setIsLoading(true);
    try {
      onUpdate(field, value.trim());
      toast.success(`${config.label} mis à jour`);
      onClose();
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Erreur lors de la mise à jour");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = (option: string) => {
    setValue(option);
    setIsDropdownOpen(false);
  };

  const handleGenderSelect = (genderValue: string) => {
    setValue(genderValue);
  };

  const toggleInterest = (interest: string) => {
    setSelectedInterests((prev) => {
      if (prev.includes(interest)) {
        return prev.filter((i) => i !== interest);
      }
      if (prev.length >= 10) {
        toast.error("Maximum 10 centres d'intérêt");
        return prev;
      }
      return [...prev, interest];
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 max-w-md mx-auto"
          >
            <div className="glass-strong rounded-3xl p-6 space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/20 rounded-full">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">
                    {config.label}
                  </h3>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-muted rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>

              {/* Input */}
              <div className="space-y-2">
                {config.type === "text" ? (
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder={config.placeholder}
                    maxLength={field === "display_name" ? 50 : 100}
                    className="w-full px-4 py-3 bg-muted/50 border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    autoFocus
                  />
                ) : config.type === "textarea" ? (
                  <div className="space-y-2">
                    <textarea
                      value={value}
                      onChange={(e) => setValue(e.target.value)}
                      placeholder={config.placeholder}
                      maxLength={500}
                      rows={4}
                      className="w-full px-4 py-3 bg-muted/50 border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                      autoFocus
                    />
                    <p className="text-xs text-muted-foreground text-right">{value.length}/500</p>
                  </div>
                ) : config.type === "interests" ? (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Sélectionnés: {selectedInterests.length}/10 (min. 3)
                    </p>
                    <div className="flex flex-wrap gap-2 max-h-64 overflow-y-auto">
                      {interestsList.map((interest) => (
                        <motion.button
                          key={interest}
                          type="button"
                          onClick={() => toggleInterest(interest)}
                          className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                            selectedInterests.includes(interest)
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-muted/50 text-foreground border-border hover:border-primary/50"
                          }`}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          {interest}
                        </motion.button>
                      ))}
                    </div>
                  </div>
                ) : config.type === "gender" ? (
                  <div className="flex gap-2">
                    {genderOptions.map((option) => (
                      <motion.button
                        key={option.value}
                        type="button"
                        onClick={() => handleGenderSelect(option.value)}
                        className={`flex-1 py-3 rounded-xl font-medium transition-colors ${
                          value === option.value
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted/50 text-foreground border border-border"
                        }`}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {option.label}
                      </motion.button>
                    ))}
                  </div>
                ) : config.type === "birthdate" ? (
                  <div className="space-y-3">
                    {/* Day picker */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setActivePicker(activePicker === "day" ? null : "day")}
                        className="w-full px-4 py-3 bg-muted/50 border border-border rounded-xl text-left flex items-center justify-between"
                      >
                        <span className={selectedDay ? "text-foreground" : "text-muted-foreground"}>
                          {selectedDay || "Jour"}
                        </span>
                        <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${activePicker === "day" ? "rotate-180" : ""}`} />
                      </button>
                      <AnimatePresence>
                        {activePicker === "day" && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-lg z-60 max-h-48 overflow-y-auto"
                          >
                            {days.map((day) => (
                              <button
                                key={day}
                                type="button"
                                onClick={() => { setSelectedDay(day); setActivePicker(null); }}
                                className={`w-full px-4 py-2 text-left hover:bg-muted ${selectedDay === day ? "bg-primary/10 text-primary" : "text-foreground"}`}
                              >
                                {day}
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Month picker */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setActivePicker(activePicker === "month" ? null : "month")}
                        className="w-full px-4 py-3 bg-muted/50 border border-border rounded-xl text-left flex items-center justify-between"
                      >
                        <span className={selectedMonth !== null ? "text-foreground" : "text-muted-foreground"}>
                          {selectedMonth !== null ? months[selectedMonth] : "Mois"}
                        </span>
                        <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${activePicker === "month" ? "rotate-180" : ""}`} />
                      </button>
                      <AnimatePresence>
                        {activePicker === "month" && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-lg z-60 max-h-48 overflow-y-auto"
                          >
                            {months.map((month, index) => (
                              <button
                                key={month}
                                type="button"
                                onClick={() => { setSelectedMonth(index); setActivePicker(null); }}
                                className={`w-full px-4 py-2 text-left hover:bg-muted ${selectedMonth === index ? "bg-primary/10 text-primary" : "text-foreground"}`}
                              >
                                {month}
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Year picker */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setActivePicker(activePicker === "year" ? null : "year")}
                        className="w-full px-4 py-3 bg-muted/50 border border-border rounded-xl text-left flex items-center justify-between"
                      >
                        <span className={selectedYear ? "text-foreground" : "text-muted-foreground"}>
                          {selectedYear || "Année"}
                        </span>
                        <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${activePicker === "year" ? "rotate-180" : ""}`} />
                      </button>
                      <AnimatePresence>
                        {activePicker === "year" && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-lg z-60 max-h-48 overflow-y-auto"
                          >
                            {years.map((year) => (
                              <button
                                key={year}
                                type="button"
                                onClick={() => { setSelectedYear(year); setActivePicker(null); }}
                                className={`w-full px-4 py-2 text-left hover:bg-muted ${selectedYear === year ? "bg-primary/10 text-primary" : "text-foreground"}`}
                              >
                                {year}
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      className="w-full px-4 py-3 bg-muted/50 border border-border rounded-xl text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                      <span className={value ? "text-foreground" : "text-muted-foreground"}>
                        {value || config.placeholder}
                      </span>
                      <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${isDropdownOpen ? "rotate-180" : ""}`} />
                    </button>

                    <AnimatePresence>
                      {isDropdownOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-lg z-60 max-h-60 overflow-y-auto"
                        >
                          {config.options?.map((option: string) => (
                            <button
                              key={option}
                              type="button"
                              onClick={() => handleSelect(option)}
                              className={`w-full px-4 py-3 text-left hover:bg-muted transition-colors first:rounded-t-xl last:rounded-b-xl ${
                                value === option ? "bg-primary/10 text-primary" : "text-foreground"
                              }`}
                            >
                              {option}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <motion.button
                  onClick={onClose}
                  className="flex-1 py-3 bg-muted text-foreground rounded-xl font-medium"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Annuler
                </motion.button>
                <motion.button
                  onClick={handleSave}
                  disabled={isLoading}
                  className="flex-1 py-3 bg-primary text-primary-foreground rounded-xl font-medium disabled:opacity-50"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {isLoading ? "Enregistrement..." : "Enregistrer"}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default EditProfileModal;
