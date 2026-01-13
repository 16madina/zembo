import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Plus, X, Loader2, ImageIcon, GripVertical } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
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
import { Camera as CapCamera, CameraResultType, CameraSource } from "@capacitor/camera";
import { Capacitor } from "@capacitor/core";

interface PhotoGalleryProps {
  userId: string;
  photos: string[];
  onPhotosChange: (photos: string[]) => void;
  onAvatarChange: (url: string) => void;
}

interface SortablePhotoProps {
  photo: string;
  index: number;
  onSetAsMain: (index: number) => void;
  onDelete: (index: number) => void;
}

const SortablePhoto = ({ photo, index, onSetAsMain, onDelete }: SortablePhotoProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: photo });

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
      layout
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className={`relative aspect-[3/4] group ${isDragging ? "scale-105" : ""}`}
    >
      <img
        src={photo}
        alt={`Photo ${index + 1}`}
        className="w-full h-full object-cover rounded-2xl shadow-lg"
      />

      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-2 right-2 p-1.5 bg-black/50 rounded-lg cursor-grab active:cursor-grabbing touch-none"
      >
        <GripVertical className="w-4 h-4 text-white" />
      </div>

      {/* Main photo badge */}
      {index === 0 && (
        <div className="absolute top-2 left-2 px-3 py-1 bg-primary text-primary-foreground text-xs font-bold rounded-full shadow-lg">
          Principale
        </div>
      )}

      {/* Actions overlay */}
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex items-end justify-center pb-3 gap-2">
        {index !== 0 && (
          <motion.button
            onClick={(e) => {
              e.stopPropagation();
              onSetAsMain(index);
            }}
            className="p-2.5 bg-primary rounded-full shadow-lg"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <Camera className="w-4 h-4 text-primary-foreground" />
          </motion.button>
        )}
        <motion.button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(index);
          }}
          className="p-2.5 bg-destructive rounded-full shadow-lg"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <X className="w-4 h-4 text-destructive-foreground" />
        </motion.button>
      </div>
    </motion.div>
  );
};

const PhotoGallery = ({ userId, photos, onPhotosChange, onAvatarChange }: PhotoGalleryProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const maxPhotos = 8;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 10,
        delay: 150,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = photos.indexOf(active.id as string);
      const newIndex = photos.indexOf(over.id as string);

      const newPhotos = arrayMove(photos, oldIndex, newIndex);
      onPhotosChange(newPhotos);

      // If first photo changed, update avatar
      if (newIndex === 0 || oldIndex === 0) {
        await updateAvatar(newPhotos[0]);
        toast.success("Photo principale mise à jour");
      }
    }
  };

  const uploadPhoto = async (file: File, index: number): Promise<string | null> => {
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${userId}/${Date.now()}-${index}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("profile-photos")
        .upload(fileName, file);

      if (uploadError) {
        console.error("Upload error:", uploadError);
        return null;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("profile-photos").getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error("Error uploading photo:", error);
      return null;
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = maxPhotos - photos.length;
    if (remainingSlots <= 0) {
      toast.error("Vous avez atteint le maximum de 8 photos");
      return;
    }

    setIsUploading(true);
    const filesToUpload = Array.from(files).slice(0, remainingSlots);
    const newPhotos: string[] = [];

    for (let i = 0; i < filesToUpload.length; i++) {
      setUploadingIndex(photos.length + i);
      const url = await uploadPhoto(filesToUpload[i], photos.length + i);
      if (url) {
        newPhotos.push(url);
      }
    }

    if (newPhotos.length > 0) {
      const updatedPhotos = [...photos, ...newPhotos];
      onPhotosChange(updatedPhotos);

      // Set first photo as avatar if no avatar exists
      if (photos.length === 0 && newPhotos[0]) {
        await updateAvatar(newPhotos[0]);
      }

      toast.success(`${newPhotos.length} photo(s) ajoutée(s)`);
    }

    setIsUploading(false);
    setUploadingIndex(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const updateAvatar = async (url: string) => {
    const { error } = await supabase
      .from("profiles")
      .update({ avatar_url: url })
      .eq("user_id", userId);

    if (!error) {
      onAvatarChange(url);
    }
  };

  const handleSetAsMain = async (index: number) => {
    const newPhotos = arrayMove(photos, index, 0);
    onPhotosChange(newPhotos);
    await updateAvatar(newPhotos[0]);
    toast.success("Photo principale mise à jour");
  };

  const handleDeletePhoto = async (index: number) => {
    const photoToDelete = photos[index];

    // Extract file path from URL
    try {
      const urlParts = photoToDelete.split("/profile-photos/");
      if (urlParts[1]) {
        await supabase.storage.from("profile-photos").remove([urlParts[1]]);
      }
    } catch (error) {
      console.error("Error deleting from storage:", error);
    }

    const updatedPhotos = photos.filter((_, i) => i !== index);
    onPhotosChange(updatedPhotos);

    // If deleted photo was avatar, set first remaining as avatar
    if (updatedPhotos.length > 0 && index === 0) {
      await updateAvatar(updatedPhotos[0]);
    } else if (updatedPhotos.length === 0) {
      await supabase.from("profiles").update({ avatar_url: null }).eq("user_id", userId);
      onAvatarChange("");
    }

    toast.success("Photo supprimée");
  };

  const openFilePicker = async (e?: React.MouseEvent | React.TouchEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    
    console.log("openFilePicker triggered, isNative:", Capacitor.isNativePlatform());

    // Use Capacitor Camera on native platforms
    if (Capacitor.isNativePlatform()) {
      try {
        console.log("Calling Capacitor Camera...");
        const image = await CapCamera.getPhoto({
          quality: 90,
          allowEditing: false,
          resultType: CameraResultType.Base64,
          source: CameraSource.Prompt, // Let user choose camera or gallery
        });

        console.log("Camera returned image:", !!image.base64String);

        if (image.base64String) {
          setIsUploading(true);
          setUploadingIndex(photos.length);

          // Convert base64 to blob
          const byteCharacters = atob(image.base64String);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: `image/${image.format || 'jpeg'}` });
          const file = new File([blob], `photo-${Date.now()}.${image.format || 'jpeg'}`, { type: `image/${image.format || 'jpeg'}` });

          const url = await uploadPhoto(file, photos.length);
          if (url) {
            const updatedPhotos = [...photos, url];
            onPhotosChange(updatedPhotos);

            if (photos.length === 0) {
              await updateAvatar(url);
            }

            toast.success("Photo ajoutée");
          }

          setIsUploading(false);
          setUploadingIndex(null);
        }
      } catch (error: any) {
        console.error("Camera error:", error);
        if (!error.message?.includes("cancelled")) {
          toast.error("Erreur lors de la sélection de la photo");
        }
        setIsUploading(false);
        setUploadingIndex(null);
      }
    } else {
      // Web fallback
      setTimeout(() => {
        fileInputRef.current?.click();
      }, 50);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    openFilePicker();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <ImageIcon className="w-5 h-5 text-primary" />
          Mes Photos ({photos.length}/{maxPhotos})
        </h3>
        {photos.length < maxPhotos && (
          <motion.button
            onClick={openFilePicker}
            disabled={isUploading}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-full text-sm font-medium"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Ajouter
          </motion.button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Photos sortables dans DndContext */}
      {photos.length > 0 && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={photos} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-3 gap-3">
              <AnimatePresence mode="popLayout">
                {photos.map((photo, index) => (
                  <SortablePhoto
                    key={photo}
                    photo={photo}
                    index={index}
                    onSetAsMain={handleSetAsMain}
                    onDelete={handleDeletePhoto}
                  />
                ))}
              </AnimatePresence>
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Empty slots - OUTSIDE DndContext to prevent touch interception */}
      {photos.length < maxPhotos && (
        <div className={`grid grid-cols-3 gap-3 ${photos.length > 0 ? 'mt-3' : ''}`}>
          {Array.from({ length: Math.min(photos.length === 0 ? 3 : (3 - (photos.length % 3)) % 3 || 3, maxPhotos - photos.length) }).map(
            (_, index) => (
              <motion.button
                key={`empty-${index}`}
                onClick={openFilePicker}
                onTouchEnd={handleTouchEnd}
                disabled={isUploading}
                className="aspect-[3/4] rounded-2xl border-2 border-dashed border-muted-foreground/30 flex items-center justify-center hover:border-primary/50 active:border-primary active:bg-primary/5 transition-colors touch-manipulation"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {isUploading && uploadingIndex === photos.length + index ? (
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                ) : (
                  <Plus className="w-8 h-8 text-muted-foreground" />
                )}
              </motion.button>
            )
          )}
        </div>
      )}

      <p className="text-xs text-muted-foreground text-center">
        Glissez pour réorganiser • Touchez pour définir comme principale ou supprimer
      </p>
    </div>
  );
};

export default PhotoGallery;
