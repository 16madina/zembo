import { motion } from "framer-motion";
import { Settings, Camera, ChevronRight, ToggleRight, ArrowRight, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isNative } from "@/lib/capacitor";

interface CameraPermissionTutorialProps {
  onRetry: () => void;
  onOpenSettings: () => void;
}

const steps = [
  {
    icon: Settings,
    title: "Ouvrir les Paramètres",
    description: "Appuyez sur le bouton ci-dessous ou allez dans Paramètres de votre téléphone",
    color: "from-blue-500 to-blue-600",
  },
  {
    icon: ChevronRight,
    title: "Applications → Zembo",
    description: "Trouvez l'application Zembo dans la liste des applications",
    color: "from-purple-500 to-purple-600",
  },
  {
    icon: Camera,
    title: "Autorisations",
    description: "Appuyez sur 'Autorisations' puis sur 'Caméra'",
    color: "from-primary to-primary/80",
  },
  {
    icon: ToggleRight,
    title: "Autoriser",
    description: "Sélectionnez 'Autoriser' ou 'Toujours autoriser'",
    color: "from-green-500 to-green-600",
  },
];

export const CameraPermissionTutorial = ({ onRetry, onOpenSettings }: CameraPermissionTutorialProps) => {
  const handleOpenSettings = async () => {
    if (isNative) {
      try {
        // Try to open app settings on native platforms
        const { App } = await import('@capacitor/app');
        // Note: This opens the app info page on Android
        // On iOS, it opens the app's settings page
        await (App as any).openUrl?.({ url: 'app-settings:' });
      } catch (error) {
        console.error("Failed to open settings:", error);
        // Fallback - just call the callback
        onOpenSettings();
      }
    } else {
      onOpenSettings();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex-1 flex flex-col px-6 py-8 overflow-y-auto"
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", delay: 0.2 }}
          className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-destructive/20 to-destructive/5 flex items-center justify-center"
        >
          <Camera className="w-10 h-10 text-destructive" />
        </motion.div>
        <h2 className="text-xl font-bold text-foreground mb-2">
          Accès caméra requis
        </h2>
        <p className="text-sm text-muted-foreground max-w-xs mx-auto">
          Pour vérifier votre identité, nous avons besoin d'accéder à votre caméra.
          Suivez ces étapes pour l'activer :
        </p>
      </motion.div>

      {/* Steps */}
      <div className="space-y-4 mb-8">
        {steps.map((step, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + index * 0.1 }}
            className="flex items-start gap-4 p-4 rounded-2xl bg-card border border-border"
          >
            {/* Step number and icon */}
            <div className="flex-shrink-0">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${step.color} flex items-center justify-center shadow-lg`}>
                <step.icon className="w-6 h-6 text-white" />
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                  Étape {index + 1}
                </span>
              </div>
              <h3 className="font-semibold text-foreground mb-0.5">
                {step.title}
              </h3>
              <p className="text-sm text-muted-foreground">
                {step.description}
              </p>
            </div>

            {/* Arrow indicator */}
            {index < steps.length - 1 && (
              <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 hidden">
                <ArrowRight className="w-4 h-4 text-muted-foreground rotate-90" />
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Visual guide - Android path */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="mb-8 p-4 rounded-2xl bg-muted/50 border border-border"
      >
        <p className="text-xs text-center text-muted-foreground mb-3">
          Chemin rapide dans les paramètres :
        </p>
        <div className="flex items-center justify-center gap-2 flex-wrap text-xs font-medium">
          <span className="px-2 py-1 rounded-lg bg-background border border-border">
            Paramètres
          </span>
          <ChevronRight className="w-3 h-3 text-muted-foreground" />
          <span className="px-2 py-1 rounded-lg bg-background border border-border">
            Applications
          </span>
          <ChevronRight className="w-3 h-3 text-muted-foreground" />
          <span className="px-2 py-1 rounded-lg bg-primary/10 border border-primary/30 text-primary">
            Zembo
          </span>
          <ChevronRight className="w-3 h-3 text-muted-foreground" />
          <span className="px-2 py-1 rounded-lg bg-background border border-border">
            Autorisations
          </span>
          <ChevronRight className="w-3 h-3 text-muted-foreground" />
          <span className="px-2 py-1 rounded-lg bg-green-500/10 border border-green-500/30 text-green-600">
            Caméra ✓
          </span>
        </div>
      </motion.div>

      {/* Action buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="space-y-3 mt-auto"
      >
        <Button
          onClick={handleOpenSettings}
          className="w-full h-14 text-lg font-semibold rounded-2xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/25"
        >
          <ExternalLink className="w-5 h-5 mr-2" />
          Ouvrir les Paramètres
        </Button>

        <Button
          onClick={onRetry}
          variant="outline"
          className="w-full h-12 rounded-xl"
        >
          <Camera className="w-4 h-4 mr-2" />
          J'ai activé la caméra, réessayer
        </Button>
      </motion.div>
    </motion.div>
  );
};
