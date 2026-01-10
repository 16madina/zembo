import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Plus, X, Loader2, ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PhotoGalleryProps {
  userId: string;
  photos: string[];
  onPhotosChange: (photos: string[]) => void;
  onAvatarChange: (url: string) => void;
}

const PhotoGallery = ({ userId, photos, onPhotosChange, onAvatarChange }: PhotoGalleryProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const maxPhotos = 8;

  const uploadPhoto = async (file: File, index: number): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}-${index}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('profile-photos')
        .upload(fileName, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        return null;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('profile-photos')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading photo:', error);
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
      fileInputRef.current.value = '';
    }
  };

  const updateAvatar = async (url: string) => {
    const { error } = await supabase
      .from('profiles')
      .update({ avatar_url: url })
      .eq('user_id', userId);

    if (!error) {
      onAvatarChange(url);
    }
  };

  const handleSetAsMain = async (index: number) => {
    const photoUrl = photos[index];
    await updateAvatar(photoUrl);
    toast.success("Photo principale mise à jour");
  };

  const handleDeletePhoto = async (index: number) => {
    const photoToDelete = photos[index];
    
    // Extract file path from URL
    try {
      const urlParts = photoToDelete.split('/profile-photos/');
      if (urlParts[1]) {
        await supabase.storage
          .from('profile-photos')
          .remove([urlParts[1]]);
      }
    } catch (error) {
      console.error('Error deleting from storage:', error);
    }

    const updatedPhotos = photos.filter((_, i) => i !== index);
    onPhotosChange(updatedPhotos);

    // If deleted photo was avatar, set first remaining as avatar
    if (updatedPhotos.length > 0 && index === 0) {
      await updateAvatar(updatedPhotos[0]);
    } else if (updatedPhotos.length === 0) {
      await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('user_id', userId);
      onAvatarChange('');
    }

    toast.success("Photo supprimée");
  };

  const openFilePicker = () => {
    fileInputRef.current?.click();
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
            {isUploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
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

      <div className="grid grid-cols-4 gap-2">
        <AnimatePresence mode="popLayout">
          {photos.map((photo, index) => (
            <motion.div
              key={photo}
              layout
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="relative aspect-square group"
            >
              <img
                src={photo}
                alt={`Photo ${index + 1}`}
                className="w-full h-full object-cover rounded-xl"
              />
              
              {/* Main photo badge */}
              {index === 0 && (
                <div className="absolute top-1 left-1 px-2 py-0.5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full">
                  Principale
                </div>
              )}

              {/* Actions overlay */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center gap-2">
                {index !== 0 && (
                  <motion.button
                    onClick={() => handleSetAsMain(index)}
                    className="p-2 bg-primary rounded-full"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <Camera className="w-4 h-4 text-primary-foreground" />
                  </motion.button>
                )}
                <motion.button
                  onClick={() => handleDeletePhoto(index)}
                  className="p-2 bg-destructive rounded-full"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <X className="w-4 h-4 text-destructive-foreground" />
                </motion.button>
              </div>
            </motion.div>
          ))}

          {/* Empty slots */}
          {Array.from({ length: Math.min(4 - photos.length, maxPhotos - photos.length) }).map((_, index) => (
            <motion.button
              key={`empty-${index}`}
              onClick={openFilePicker}
              disabled={isUploading}
              className="aspect-square rounded-xl border-2 border-dashed border-muted-foreground/30 flex items-center justify-center hover:border-primary/50 transition-colors"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {isUploading && uploadingIndex === photos.length + index ? (
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
              ) : (
                <Plus className="w-6 h-6 text-muted-foreground" />
              )}
            </motion.button>
          ))}
        </AnimatePresence>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Touchez une photo pour la définir comme principale ou la supprimer
      </p>
    </div>
  );
};

export default PhotoGallery;
