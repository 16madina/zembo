import { useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Camera, Plus, X, Image, GripVertical, Loader2, CheckCircle2 } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Capacitor } from "@capacitor/core";
import { toast } from "sonner";
import type { OnboardingData } from "../OnboardingSteps";
import { useFaceRecognitionPreload } from "@/contexts/FaceRecognitionPreloadContext";

interface PhotosStepProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
}

interface SortablePhotoProps {
  id: string;
  photo: string;
  index: number;
  onRemove: (index: number) => void;
}

const SortablePhoto = ({ id, photo, index, onRemove }: SortablePhotoProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`relative aspect-square rounded-xl overflow-hidden ${
        isDragging ? "ring-2 ring-primary shadow-xl" : ""
      }`}
    >
      <img
        src={photo}
        alt={`Photo ${index + 1}`}
        className="w-full h-full object-cover"
      />
      
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-1 left-1 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="w-3 h-3 text-white" />
      </div>

      {/* Main photo badge */}
      {index === 0 && (
        <div className="absolute bottom-1 left-1 bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-full font-medium">
          Principal
        </div>
      )}

      {/* Remove button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove(index);
        }}
        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center tap-highlight hover:bg-red-500/80 transition-colors"
      >
        <X className="w-4 h-4 text-white" />
      </button>
    </motion.div>
  );
};

const PhotosStep = ({ data, updateData }: PhotosStepProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoIds] = useState(() => 
    data.photos.map((_, i) => `photo-${i}-${Date.now()}`)
  );

  // Preload face recognition models and extract descriptors
  const { 
    isModelsLoaded, 
    isModelsLoading, 
    isExtractingDescriptors, 
    extractDescriptors, 
    hasDescriptors 
  } = useFaceRecognitionPreload();

  // Extract descriptors when photos change and models are loaded
  useEffect(() => {
    if (isModelsLoaded && data.photos.length > 0) {
      extractDescriptors(data.photos);
    }
  }, [isModelsLoaded, data.photos, extractDescriptors]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        delay: 150,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const remainingSlots = 8 - data.photos.length;
    const filesToProcess = Math.min(files.length, remainingSlots);
    let processedCount = 0;
    const newPhotos: string[] = [];

    for (let i = 0; i < filesToProcess; i++) {
      const file = files[i];
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const result = event.target?.result as string;
          newPhotos.push(result);
          processedCount++;
          
          if (processedCount === filesToProcess) {
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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = data.photos.findIndex((_, i) => `photo-${i}` === active.id);
      const newIndex = data.photos.findIndex((_, i) => `photo-${i}` === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newPhotos = arrayMove(data.photos, oldIndex, newIndex);
        updateData({ photos: newPhotos });
      }
    }
  };

  const openFilePicker = async (e?: React.MouseEvent | React.TouchEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    
    console.log("[Onboarding PhotosStep] openFilePicker, isNative:", Capacitor.isNativePlatform());
    
    if (Capacitor.isNativePlatform()) {
      try {
        const { Camera: CapCamera, CameraResultType, CameraSource } = await import("@capacitor/camera");
        const image = await CapCamera.getPhoto({
          quality: 90,
          allowEditing: false,
          resultType: CameraResultType.DataUrl,
          source: CameraSource.Prompt,
          correctOrientation: true,
        });
        
        if (image.dataUrl) {
          updateData({ photos: [...data.photos, image.dataUrl] });
        }
      } catch (error: any) {
        const errorMessage = error?.message || String(error);
        console.error("[Onboarding PhotosStep] Camera error details:", {
          message: errorMessage,
          code: error?.code,
          fullError: error,
        });
        
        // User cancelled - don't show error
        if (
          errorMessage.includes("cancelled") || 
          errorMessage.includes("canceled") ||
          errorMessage.includes("User cancelled") ||
          errorMessage.includes("No image picked")
        ) {
          console.log("[Onboarding PhotosStep] User cancelled photo selection");
          return;
        }
        
        // Permission denied
        if (
          errorMessage.includes("permission") || 
          errorMessage.includes("Permission") ||
          errorMessage.includes("denied")
        ) {
          toast.error("Permission caméra refusée. Allez dans Paramètres > Applications > Zembo > Permissions.");
          return;
        }
        
        // Generic error with actual message for debugging
        toast.error(`Erreur caméra: ${errorMessage.substring(0, 100)}`);
      }
    } else {
      fileInputRef.current?.click();
    }
  };

  const sortableIds = data.photos.map((_, i) => `photo-${i}`);

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">
        Ajoutez jusqu'à 8 photos. Glissez pour réorganiser. La première sera votre photo principale.
      </p>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Photo Grid with Drag & Drop */}
      <div className="grid grid-cols-4 gap-3">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={sortableIds} strategy={rectSortingStrategy}>
            {/* Existing photos */}
            {data.photos.map((photo, index) => (
              <SortablePhoto
                key={`photo-${index}`}
                id={`photo-${index}`}
                photo={photo}
                index={index}
                onRemove={removePhoto}
              />
            ))}
          </SortableContext>
        </DndContext>

        {/* Add photo button - OUTSIDE dnd context for reliable touch */}
        {data.photos.length < 8 && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={(e) => openFilePicker(e)}
            onTouchEnd={(e) => openFilePicker(e)}
            className="aspect-square rounded-xl glass border-2 border-dashed border-primary/30 flex flex-col items-center justify-center gap-1 tap-highlight hover:border-primary/60 transition-colors touch-manipulation"
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

      {/* Photo count and preload status */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Camera className="w-4 h-4" />
          <span>{data.photos.length}/8 photos</span>
        </div>
        {data.photos.length === 0 ? (
          <span className="text-xs text-amber-400">
            Ajoutez au moins 1 photo
          </span>
        ) : (
          <div className="flex items-center gap-1.5 text-xs">
            {isModelsLoading ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin text-primary" />
                <span className="text-muted-foreground">Préparation IA...</span>
              </>
            ) : isExtractingDescriptors ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin text-primary" />
                <span className="text-muted-foreground">Analyse visages...</span>
              </>
            ) : hasDescriptors ? (
              <>
                <CheckCircle2 className="w-3 h-3 text-green-500" />
                <span className="text-green-500">Prêt pour vérification</span>
              </>
            ) : isModelsLoaded && data.photos.length > 0 ? (
              <span className="text-amber-400">Aucun visage détecté</span>
            ) : null}
          </div>
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
