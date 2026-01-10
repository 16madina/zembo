import { useRef } from "react";
import { motion } from "framer-motion";
import { Camera, Plus, X, Image } from "lucide-react";
import type { OnboardingData } from "../OnboardingSteps";

interface PhotosStepProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
}

const PhotosStep = ({ data, updateData }: PhotosStepProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newPhotos: string[] = [];
    const remainingSlots = 8 - data.photos.length;
    const filesToProcess = Math.min(files.length, remainingSlots);

    for (let i = 0; i < filesToProcess; i++) {
      const file = files[i];
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const result = event.target?.result as string;
          newPhotos.push(result);
          
          if (newPhotos.length === filesToProcess) {
            updateData({ photos: [...data.photos, ...newPhotos] });
          }
        };
        reader.readAsDataURL(file);
      }
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removePhoto = (index: number) => {
    const newPhotos = data.photos.filter((_, i) => i !== index);
    updateData({ photos: newPhotos });
  };

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">
        Ajoutez jusqu'à 8 photos pour votre profil. La première sera votre photo principale.
      </p>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Photo Grid */}
      <div className="grid grid-cols-4 gap-3">
        {/* Existing photos */}
        {data.photos.map((photo, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative aspect-square rounded-xl overflow-hidden"
          >
            <img
              src={photo}
              alt={`Photo ${index + 1}`}
              className="w-full h-full object-cover"
            />
            {/* Main photo badge */}
            {index === 0 && (
              <div className="absolute top-1 left-1 bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-full font-medium">
                Principal
              </div>
            )}
            {/* Remove button */}
            <button
              onClick={() => removePhoto(index)}
              className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center tap-highlight"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </motion.div>
        ))}

        {/* Add photo buttons */}
        {data.photos.length < 8 && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={openFilePicker}
            className="aspect-square rounded-xl glass border-2 border-dashed border-primary/30 flex flex-col items-center justify-center gap-1 tap-highlight hover:border-primary/60 transition-colors"
          >
            <Plus className="w-6 h-6 text-primary" />
            <span className="text-[10px] text-muted-foreground">Ajouter</span>
          </motion.button>
        )}

        {/* Empty slots */}
        {Array.from({ length: Math.max(0, 7 - data.photos.length) }).map((_, index) => (
          <div
            key={`empty-${index}`}
            className="aspect-square rounded-xl glass border-2 border-dashed border-border/30 flex items-center justify-center opacity-30"
          >
            <Image className="w-5 h-5 text-muted-foreground" />
          </div>
        ))}
      </div>

      {/* Photo count */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Camera className="w-4 h-4" />
          <span>{data.photos.length}/8 photos</span>
        </div>
        {data.photos.length === 0 && (
          <span className="text-xs text-amber-400">
            Ajoutez au moins 1 photo
          </span>
        )}
      </div>

      {/* Tips */}
      {data.photos.length > 0 && data.photos.length < 3 && (
        <div className="glass rounded-xl p-3 border border-primary/20">
          <p className="text-xs text-muted-foreground">
            💡 <span className="text-primary">Conseil :</span> Les profils avec 3+ photos reçoivent plus de matchs !
          </p>
        </div>
      )}
    </div>
  );
};

export default PhotosStep;
