import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, RotateCcw, X, Sun, Contrast, Droplets, Thermometer, Focus, Palette } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { BeautySettings, BeautyPreset } from "@/hooks/useBeautyFilters";
 import { useLanguage } from "@/contexts/LanguageContext";

interface BeautyFilterPanelProps {
  isOpen: boolean;
  onClose: () => void;
  settings: BeautySettings;
  isEnabled: boolean;
  onUpdateSetting: (key: keyof BeautySettings, value: number) => void;
  onResetSettings: () => void;
  onToggleFilters: () => void;
  onApplyPreset: (preset: BeautyPreset) => void;
}

const BeautyFilterPanel = ({
  isOpen,
  onClose,
  settings,
  isEnabled,
  onUpdateSetting,
  onResetSettings,
  onToggleFilters,
  onApplyPreset,
}: BeautyFilterPanelProps) => {
   const { t } = useLanguage();
 
   const presets: { id: BeautyPreset; label: string; emoji: string }[] = [
     { id: "none", label: t.none, emoji: "🚫" },
     { id: "natural", label: t.natural, emoji: "🌿" },
     { id: "soft", label: t.soft, emoji: "☁️" },
     { id: "glamour", label: t.glamour, emoji: "✨" },
     { id: "vivid", label: t.vivid, emoji: "🎨" },
   ];
 
   const sliderSettings: {
     key: keyof BeautySettings;
     label: string;
     icon: React.ReactNode;
   }[] = [
     { key: "smoothness", label: t.smoothing, icon: <Droplets className="w-4 h-4" /> },
     { key: "brightness", label: t.brightness, icon: <Sun className="w-4 h-4" /> },
     { key: "contrast", label: t.contrast, icon: <Contrast className="w-4 h-4" /> },
     { key: "saturation", label: t.saturation, icon: <Palette className="w-4 h-4" /> },
     { key: "warmth", label: t.warmth, icon: <Thermometer className="w-4 h-4" /> },
     { key: "sharpness", label: t.sharpness, icon: <Focus className="w-4 h-4" /> },
   ];
 
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          />

          {/* Panel */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 bg-background rounded-t-3xl z-50 max-h-[80vh] overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
               <h2 className="font-semibold text-lg">{t.beautyFilters}</h2>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                   {isEnabled ? t.enabled : t.disabled}
                  </span>
                  <Switch checked={isEnabled} onCheckedChange={onToggleFilters} />
                </div>
                <Button size="icon" variant="ghost" onClick={onClose}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            <div className="p-4 space-y-6 overflow-y-auto max-h-[calc(80vh-80px)]">
              {/* Presets */}
              <div className="space-y-2">
               <h3 className="text-sm font-medium text-muted-foreground">{t.presets}</h3>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {presets.map((preset) => (
                    <motion.button
                      key={preset.id}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => onApplyPreset(preset.id)}
                      className={cn(
                        "flex flex-col items-center gap-1 px-4 py-2 rounded-xl border transition-all min-w-[70px]",
                        "bg-card hover:bg-accent"
                      )}
                    >
                      <span className="text-xl">{preset.emoji}</span>
                      <span className="text-xs font-medium">{preset.label}</span>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Sliders */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-muted-foreground">
                   {t.advancedSettings}
                  </h3>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={onResetSettings}
                    className="text-xs"
                  >
                    <RotateCcw className="w-3 h-3 mr-1" />
                   {t.reset}
                  </Button>
                </div>

                <div className="space-y-4">
                  {sliderSettings.map(({ key, label, icon }) => (
                    <div key={key} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-muted-foreground">{icon}</span>
                          <span>{label}</span>
                        </div>
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {settings[key]}%
                        </span>
                      </div>
                      <Slider
                        value={[settings[key]]}
                        onValueChange={([value]) => onUpdateSetting(key, value)}
                        max={100}
                        min={0}
                        step={1}
                        disabled={!isEnabled}
                        className={cn(!isEnabled && "opacity-50")}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default BeautyFilterPanel;
