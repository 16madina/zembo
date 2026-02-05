import { Globe } from "lucide-react";
import { motion } from "framer-motion";
import { useLanguage, type Language } from "@/contexts/LanguageContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface LanguageSelectorProps {
  variant?: "icon" | "compact" | "full";
  className?: string;
}

const LanguageSelector = ({ variant = "icon", className = "" }: LanguageSelectorProps) => {
  const { language, setLanguage, t } = useLanguage();

  const languages: { code: Language; label: string; flag: string }[] = [
    { code: "fr", label: "Français", flag: "🇫🇷" },
    { code: "en", label: "English", flag: "🇬🇧" },
  ];

  const currentLang = languages.find((l) => l.code === language);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`flex items-center gap-1.5 h-8 px-2 glass rounded-lg border-0 hover:bg-white/10 ${className}`}
        >
          {variant === "icon" ? (
            <Globe className="w-4 h-4 text-muted-foreground" />
          ) : (
            <>
              <span className="text-sm">{currentLang?.flag}</span>
              {variant === "full" && (
                <span className="text-xs text-muted-foreground">
                  {currentLang?.label}
                </span>
              )}
              {variant === "compact" && (
                <span className="text-xs font-medium text-foreground uppercase">
                  {language}
                </span>
              )}
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[140px]">
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => setLanguage(lang.code)}
            className={`flex items-center gap-2 cursor-pointer ${
              language === lang.code ? "bg-primary/10 text-primary" : ""
            }`}
          >
            <span>{lang.flag}</span>
            <span className="text-sm">{lang.label}</span>
            {language === lang.code && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="ml-auto text-primary"
              >
                ✓
              </motion.span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LanguageSelector;