import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Sparkles, 
  RotateCcw, 
  X, 
  Sun, 
  Contrast, 
  Palette, 
  Thermometer, 
  Focus,
  Droplets,
  Eye,
  User,
  Image,
  Smile,
  Wand2,
  Layers
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { 
  SnapchatFilterState, 
  ColorPreset, 
  FacePreset, 
  OverlayType,
  ColorFilterSettings,
  FaceFilterSettings,
  BackgroundSettings
} from "@/hooks/useSnapchatFilters";
import { 
  COLOR_PRESET_DATA, 
  FACE_PRESET_DATA, 
  OVERLAY_DATA 
} from "@/hooks/useSnapchatFilters";

interface SnapchatFilterPanelProps {
  isOpen: boolean;
  onClose: () => void;
  state: SnapchatFilterState;
  onUpdateColorFilter: (key: keyof ColorFilterSettings, value: number) => void;
  onUpdateFaceFilter: (key: keyof FaceFilterSettings, value: number) => void;
  onUpdateBackground: (key: keyof BackgroundSettings, value: number | boolean) => void;
  onApplyColorPreset: (preset: ColorPreset) => void;
  onApplyFacePreset: (preset: FacePreset) => void;
  onSetOverlay: (overlay: OverlayType | null) => void;
  onToggleFilters: () => void;
  onReset: () => void;
}

const colorSliders: { key: keyof ColorFilterSettings; label: string; icon: React.ReactNode }[] = [
  { key: "brightness", label: "Luminosité", icon: <Sun className="w-4 h-4" /> },
  { key: "contrast", label: "Contraste", icon: <Contrast className="w-4 h-4" /> },
  { key: "saturation", label: "Saturation", icon: <Palette className="w-4 h-4" /> },
  { key: "warmth", label: "Chaleur", icon: <Thermometer className="w-4 h-4" /> },
  { key: "exposure", label: "Exposition", icon: <Sun className="w-4 h-4" /> },
  { key: "shadows", label: "Ombres", icon: <Layers className="w-4 h-4" /> },
  { key: "highlights", label: "Hautes lumières", icon: <Focus className="w-4 h-4" /> },
  { key: "vignette", label: "Vignette", icon: <Focus className="w-4 h-4" /> },
  { key: "grain", label: "Grain", icon: <Droplets className="w-4 h-4" /> },
];

const faceSliders: { key: keyof FaceFilterSettings; label: string; icon: React.ReactNode }[] = [
  { key: "smoothness", label: "Lissage peau", icon: <Droplets className="w-4 h-4" /> },
  { key: "eyeSize", label: "Taille yeux", icon: <Eye className="w-4 h-4" /> },
  { key: "faceSlim", label: "Affiner visage", icon: <User className="w-4 h-4" /> },
  { key: "jawline", label: "Mâchoire", icon: <User className="w-4 h-4" /> },
  { key: "lipColor", label: "Couleur lèvres", icon: <Smile className="w-4 h-4" /> },
  { key: "blush", label: "Blush", icon: <Smile className="w-4 h-4" /> },
  { key: "eyeBright", label: "Éclat yeux", icon: <Eye className="w-4 h-4" /> },
];

const SnapchatFilterPanel = ({
  isOpen,
  onClose,
  state,
  onUpdateColorFilter,
  onUpdateFaceFilter,
  onUpdateBackground,
  onApplyColorPreset,
  onApplyFacePreset,
  onSetOverlay,
  onToggleFilters,
  onReset,
}: SnapchatFilterPanelProps) => {
  const [activeTab, setActiveTab] = useState("color");

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
            className="fixed bottom-0 left-0 right-0 bg-background rounded-t-3xl z-50 max-h-[85vh] overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Wand2 className="w-5 h-5 text-primary" />
                <h2 className="font-semibold text-lg">Filtres Snapchat</h2>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onReset}
                  className="text-xs gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset
                </Button>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {state.isEnabled ? "ON" : "OFF"}
                  </span>
                  <Switch checked={state.isEnabled} onCheckedChange={onToggleFilters} />
                </div>
                <Button size="icon" variant="ghost" onClick={onClose}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="w-full grid grid-cols-4 p-1 mx-4 mt-2" style={{ width: 'calc(100% - 32px)' }}>
                <TabsTrigger value="color" className="text-xs gap-1">
                  <Palette className="w-3.5 h-3.5" />
                  Couleur
                </TabsTrigger>
                <TabsTrigger value="face" className="text-xs gap-1">
                  <Smile className="w-3.5 h-3.5" />
                  Visage
                </TabsTrigger>
                <TabsTrigger value="overlay" className="text-xs gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  Masques
                </TabsTrigger>
                <TabsTrigger value="bg" className="text-xs gap-1">
                  <Image className="w-3.5 h-3.5" />
                  Fond
                </TabsTrigger>
              </TabsList>

              <ScrollArea className="h-[calc(85vh-140px)]">
                {/* Color Filters Tab */}
                <TabsContent value="color" className="p-4 space-y-4 mt-0">
                  {/* Color Presets */}
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-muted-foreground">Préréglages couleur</h3>
                    <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
                      {COLOR_PRESET_DATA.map((preset) => (
                        <motion.button
                          key={preset.id}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => onApplyColorPreset(preset.id)}
                          className={cn(
                            "flex flex-col items-center gap-1 px-3 py-2 rounded-xl border transition-all min-w-[65px]",
                            state.activeColorPreset === preset.id
                              ? "border-primary bg-primary/10"
                              : "bg-card hover:bg-accent border-border"
                          )}
                        >
                          <div 
                            className="w-8 h-8 rounded-full flex items-center justify-center text-lg"
                            style={{ backgroundColor: preset.color + "30" }}
                          >
                            {preset.emoji}
                          </div>
                          <span className="text-[10px] font-medium">{preset.label}</span>
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  {/* Color Sliders */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-muted-foreground">Réglages avancés</h3>
                    {colorSliders.map(({ key, label, icon }) => (
                      <div key={key} className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-muted-foreground">{icon}</span>
                            <span className="text-xs">{label}</span>
                          </div>
                          <span className="text-[10px] text-muted-foreground tabular-nums w-8 text-right">
                            {state.colorFilters[key]}
                          </span>
                        </div>
                        <Slider
                          value={[state.colorFilters[key]]}
                          onValueChange={([value]) => onUpdateColorFilter(key, value)}
                          max={100}
                          min={0}
                          step={1}
                          disabled={!state.isEnabled}
                          className={cn(!state.isEnabled && "opacity-50", "h-5")}
                        />
                      </div>
                    ))}
                  </div>
                </TabsContent>

                {/* Face Filters Tab */}
                <TabsContent value="face" className="p-4 space-y-4 mt-0">
                  {/* Face Presets */}
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-muted-foreground">Préréglages visage</h3>
                    <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
                      {FACE_PRESET_DATA.map((preset) => (
                        <motion.button
                          key={preset.id}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => onApplyFacePreset(preset.id)}
                          className={cn(
                            "flex flex-col items-center gap-1 px-3 py-2 rounded-xl border transition-all min-w-[65px]",
                            state.activeFacePreset === preset.id
                              ? "border-primary bg-primary/10"
                              : "bg-card hover:bg-accent border-border"
                          )}
                        >
                          <span className="text-xl">{preset.emoji}</span>
                          <span className="text-[10px] font-medium">{preset.label}</span>
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  {/* Face Sliders */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-muted-foreground">Réglages visage</h3>
                    {faceSliders.map(({ key, label, icon }) => (
                      <div key={key} className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-muted-foreground">{icon}</span>
                            <span className="text-xs">{label}</span>
                          </div>
                          <span className="text-[10px] text-muted-foreground tabular-nums w-8 text-right">
                            {state.faceFilters[key]}
                          </span>
                        </div>
                        <Slider
                          value={[state.faceFilters[key]]}
                          onValueChange={([value]) => onUpdateFaceFilter(key, value)}
                          max={100}
                          min={0}
                          step={1}
                          disabled={!state.isEnabled}
                          className={cn(!state.isEnabled && "opacity-50", "h-5")}
                        />
                      </div>
                    ))}
                  </div>

                  {/* Info Banner */}
                  <div className="rounded-lg bg-primary/10 p-3 border border-primary/20">
                    <p className="text-xs text-muted-foreground">
                      💡 Le lissage peau et l'éclat des yeux utilisent des filtres CSS (luminosité, flou léger). Les effets de morphing avancés seront disponibles dans une future mise à jour.
                    </p>
                  </div>
                </TabsContent>

                {/* Overlays Tab */}
                <TabsContent value="overlay" className="p-4 space-y-4 mt-0">
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-muted-foreground">Masques AR</h3>
                    <div className="grid grid-cols-3 gap-2">
                      {/* None option */}
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => onSetOverlay(null)}
                        className={cn(
                          "flex flex-col items-center gap-2 p-3 rounded-xl border transition-all",
                          state.activeOverlay === null
                            ? "border-primary bg-primary/10"
                            : "bg-card hover:bg-accent border-border"
                        )}
                      >
                        <span className="text-2xl">🚫</span>
                        <span className="text-xs font-medium">Aucun</span>
                      </motion.button>

                      {OVERLAY_DATA.map((overlay) => (
                        <motion.button
                          key={overlay.id}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => onSetOverlay(overlay.id)}
                          className={cn(
                            "flex flex-col items-center gap-2 p-3 rounded-xl border transition-all",
                            state.activeOverlay === overlay.id
                              ? "border-primary bg-primary/10"
                              : "bg-card hover:bg-accent border-border"
                          )}
                        >
                          <span className="text-2xl">{overlay.emoji}</span>
                          <span className="text-xs font-medium">{overlay.label}</span>
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  {/* Info Banner */}
                  <div className="rounded-lg bg-green-500/10 p-3 border border-green-500/20">
                    <p className="text-xs text-green-600 dark:text-green-400">
                      ✅ Les masques AR suivent votre visage en temps réel grâce au tracking MediaPipe !
                    </p>
                  </div>
                </TabsContent>

                {/* Background Tab */}
                <TabsContent value="bg" className="p-4 space-y-4 mt-0">
                  <div className="space-y-4">
                    {/* Background Blur */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm">
                          <Focus className="w-4 h-4 text-muted-foreground" />
                          <span>Flou d'arrière-plan</span>
                        </div>
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {state.background.blur}%
                        </span>
                      </div>
                      <Slider
                        value={[state.background.blur]}
                        onValueChange={([value]) => onUpdateBackground("blur", value)}
                        max={100}
                        min={0}
                        step={1}
                        disabled={!state.isEnabled}
                        className={cn(!state.isEnabled && "opacity-50")}
                      />
                    </div>

                    {/* Background Darken */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm">
                          <Layers className="w-4 h-4 text-muted-foreground" />
                          <span>Assombrir le fond</span>
                        </div>
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {state.background.darken}%
                        </span>
                      </div>
                      <Slider
                        value={[state.background.darken]}
                        onValueChange={([value]) => onUpdateBackground("darken", value)}
                        max={100}
                        min={0}
                        step={1}
                        disabled={!state.isEnabled}
                        className={cn(!state.isEnabled && "opacity-50")}
                      />
                    </div>
                  </div>

                  {/* Info Banner */}
                  <div className="rounded-lg bg-blue-500/10 p-3 border border-blue-500/20">
                    <p className="text-xs text-blue-600 dark:text-blue-400">
                      🎨 Le remplacement d'arrière-plan virtuel avec détection de personne sera bientôt disponible.
                    </p>
                  </div>
                </TabsContent>
              </ScrollArea>
            </Tabs>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default SnapchatFilterPanel;
