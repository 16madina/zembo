import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Upload, Shield, AlertCircle, Loader2, CheckCircle2, FileImage, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface IdentityUploadScreenProps {
  onComplete: () => void;
  onBack: () => void;
}

type UploadStep = "intro" | "id_photo" | "selfie" | "uploading" | "complete";

export const IdentityUploadScreen = ({ onComplete, onBack }: IdentityUploadScreenProps) => {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState<UploadStep>("intro");
  const [idPhoto, setIdPhoto] = useState<File | null>(null);
  const [idPhotoPreview, setIdPhotoPreview] = useState<string | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const idInputRef = useRef<HTMLInputElement>(null);
  const selfieInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File, type: "id" | "selfie") => {
    if (!file.type.startsWith("image/")) {
      toast.error("Veuillez sélectionner une image");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("L'image est trop volumineuse (max 10 Mo)");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const preview = e.target?.result as string;
      if (type === "id") {
        setIdPhoto(file);
        setIdPhotoPreview(preview);
      } else {
        setSelfie(file);
        setSelfiePreview(preview);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleIdPhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file, "id");
      setCurrentStep("selfie");
    }
  };

  const handleSelfieSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file, "selfie");
    }
  };

  const uploadToStorage = async (file: File, path: string): Promise<string> => {
    const { data, error } = await supabase.storage
      .from("identity-documents")
      .upload(path, file, { upsert: true });

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from("identity-documents")
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  };

  const handleSubmit = async () => {
    if (!user || !idPhoto || !selfie) {
      toast.error("Veuillez fournir tous les documents requis");
      return;
    }

    setIsUploading(true);
    setCurrentStep("uploading");
    setError(null);

    try {
      const timestamp = Date.now();
      const idPath = `${user.id}/id_${timestamp}.${idPhoto.name.split(".").pop()}`;
      const selfiePath = `${user.id}/selfie_${timestamp}.${selfie.name.split(".").pop()}`;

      const [idUrl, selfieUrl] = await Promise.all([
        uploadToStorage(idPhoto, idPath),
        uploadToStorage(selfie, selfiePath),
      ]);

      // Create identity verification request
      const { error: insertError } = await supabase
        .from("identity_verifications")
        .upsert({
          user_id: user.id,
          id_photo_url: idUrl,
          selfie_url: selfieUrl,
          status: "pending",
        }, { onConflict: "user_id" });

      if (insertError) throw insertError;

      // Update profile to mark pending manual verification
      await supabase
        .from("profiles")
        .update({ identity_verification_status: "pending" })
        .eq("user_id", user.id);

      setCurrentStep("complete");
      toast.success("Demande envoyée avec succès");
    } catch (err: any) {
      console.error("Upload error:", err);
      setError(err.message || "Erreur lors de l'envoi");
      setCurrentStep("selfie"); // Go back to allow retry
      toast.error("Erreur lors de l'envoi des documents");
    } finally {
      setIsUploading(false);
    }
  };

  const smoothEase = { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const };

  return (
    <div className="min-h-full flex flex-col">
      <AnimatePresence mode="wait">
        {currentStep === "intro" && (
          <motion.div
            key="intro"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={smoothEase}
            className="flex-1 flex flex-col items-center justify-center text-center px-6"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.2 }}
              className="relative mb-8"
            >
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-orange-500/20 to-orange-500/5 flex items-center justify-center">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-orange-500/30 to-orange-500/10 flex items-center justify-center">
                  <Shield className="w-12 h-12 text-orange-500" />
                </div>
              </div>
            </motion.div>

            <motion.h2
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-2xl font-bold text-foreground mb-3"
            >
              Vérification manuelle requise
            </motion.h2>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-muted-foreground mb-6 max-w-xs"
            >
              La vérification automatique n'a pas fonctionné. Un administrateur vérifiera manuellement votre identité.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
              className="w-full max-w-xs mb-8 p-4 rounded-2xl bg-card/80 border border-border"
            >
              <h3 className="text-sm font-semibold mb-3 text-foreground">Documents requis :</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <FileImage className="w-4 h-4 text-primary" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-foreground">Pièce d'identité (recto)</p>
                    <p className="text-xs text-muted-foreground">CNI, passeport ou permis</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <UserCircle className="w-4 h-4 text-primary" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-foreground">Selfie de vérification</p>
                    <p className="text-xs text-muted-foreground">Photo claire de votre visage</p>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="w-full max-w-xs p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 mb-8"
            >
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-muted-foreground">
                  Vous pourrez accéder à votre profil mais les interactions (messages, likes) seront désactivées jusqu'à la validation de votre identité.
                </p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="w-full max-w-xs space-y-3"
            >
              <Button
                onClick={() => setCurrentStep("id_photo")}
                className="w-full h-14 text-lg font-semibold rounded-2xl bg-gradient-to-r from-primary to-primary/80"
              >
                <Upload className="w-5 h-5 mr-2" />
                Commencer
              </Button>
              <Button
                onClick={onBack}
                variant="ghost"
                className="w-full h-12 text-muted-foreground"
              >
                Réessayer la vérification faciale
              </Button>
            </motion.div>
          </motion.div>
        )}

        {currentStep === "id_photo" && (
          <motion.div
            key="id_photo"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={smoothEase}
            className="flex-1 flex flex-col items-center justify-center text-center px-6"
          >
            <div className="flex items-center gap-2 mb-8">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">1</div>
              <div className="w-8 h-0.5 bg-muted" />
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-bold text-sm">2</div>
            </div>

            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-64 h-40 rounded-2xl border-2 border-dashed border-primary/50 bg-card/50 flex flex-col items-center justify-center mb-6 cursor-pointer hover:bg-card/80 transition-colors"
              onClick={() => idInputRef.current?.click()}
            >
              {idPhotoPreview ? (
                <img src={idPhotoPreview} alt="ID Preview" className="w-full h-full object-cover rounded-2xl" />
              ) : (
                <>
                  <FileImage className="w-12 h-12 text-primary/60 mb-3" />
                  <p className="text-sm text-muted-foreground">Cliquez pour ajouter</p>
                </>
              )}
            </motion.div>

            <input
              ref={idInputRef}
              type="file"
              accept="image/*"
              onChange={handleIdPhotoSelect}
              className="hidden"
              capture="environment"
            />

            <h3 className="text-xl font-semibold text-foreground mb-2">
              Pièce d'identité (recto)
            </h3>
            <p className="text-sm text-muted-foreground mb-8 max-w-xs">
              Photographiez le recto de votre pièce d'identité officielle (CNI, passeport, permis de conduire)
            </p>

            <Button
              onClick={() => idInputRef.current?.click()}
              className="w-full max-w-xs h-14 text-lg font-semibold rounded-2xl"
            >
              <Camera className="w-5 h-5 mr-2" />
              Prendre une photo
            </Button>
          </motion.div>
        )}

        {currentStep === "selfie" && (
          <motion.div
            key="selfie"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={smoothEase}
            className="flex-1 flex flex-col items-center justify-center text-center px-6"
          >
            <div className="flex items-center gap-2 mb-8">
              <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-white" />
              </div>
              <div className="w-8 h-0.5 bg-green-500" />
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">2</div>
            </div>

            {/* ID Preview thumbnail */}
            {idPhotoPreview && (
              <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-full bg-green-500/10 border border-green-500/20">
                <img src={idPhotoPreview} alt="ID" className="w-8 h-8 rounded object-cover" />
                <span className="text-xs text-green-600">Pièce d'identité ✓</span>
              </div>
            )}

            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-48 h-48 rounded-full border-2 border-dashed border-primary/50 bg-card/50 flex flex-col items-center justify-center mb-6 cursor-pointer hover:bg-card/80 transition-colors overflow-hidden"
              onClick={() => selfieInputRef.current?.click()}
            >
              {selfiePreview ? (
                <img src={selfiePreview} alt="Selfie Preview" className="w-full h-full object-cover" />
              ) : (
                <>
                  <UserCircle className="w-16 h-16 text-primary/60 mb-2" />
                  <p className="text-xs text-muted-foreground">Cliquez pour ajouter</p>
                </>
              )}
            </motion.div>

            <input
              ref={selfieInputRef}
              type="file"
              accept="image/*"
              onChange={handleSelfieSelect}
              className="hidden"
              capture="user"
            />

            <h3 className="text-xl font-semibold text-foreground mb-2">
              Selfie de vérification
            </h3>
            <p className="text-sm text-muted-foreground mb-8 max-w-xs">
              Prenez une photo claire de votre visage dans un endroit bien éclairé
            </p>

            {error && (
              <div className="mb-4 px-4 py-2 rounded-lg bg-destructive/10 border border-destructive/20">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <div className="w-full max-w-xs space-y-3">
              {selfie ? (
                <Button
                  onClick={handleSubmit}
                  disabled={isUploading}
                  className="w-full h-14 text-lg font-semibold rounded-2xl bg-gradient-to-r from-green-500 to-green-600"
                >
                  Envoyer pour vérification
                </Button>
              ) : (
                <Button
                  onClick={() => selfieInputRef.current?.click()}
                  className="w-full h-14 text-lg font-semibold rounded-2xl"
                >
                  <Camera className="w-5 h-5 mr-2" />
                  Prendre un selfie
                </Button>
              )}
              <Button
                onClick={() => setCurrentStep("id_photo")}
                variant="ghost"
                className="w-full text-muted-foreground"
              >
                Retour
              </Button>
            </div>
          </motion.div>
        )}

        {currentStep === "uploading" && (
          <motion.div
            key="uploading"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={smoothEase}
            className="flex-1 flex flex-col items-center justify-center text-center px-6"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="mb-8"
            >
              <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center">
                <Loader2 className="w-12 h-12 text-primary" />
              </div>
            </motion.div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Envoi en cours...
            </h3>
            <p className="text-sm text-muted-foreground">
              Veuillez patienter pendant l'envoi de vos documents
            </p>
          </motion.div>
        )}

        {currentStep === "complete" && (
          <motion.div
            key="complete"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 200, damping: 25 }}
            className="flex-1 flex flex-col items-center justify-center text-center px-6"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.2 }}
              className="relative mb-8"
            >
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-green-500/20 to-green-500/5 flex items-center justify-center">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green-500/30 to-green-500/10 flex items-center justify-center">
                  <CheckCircle2 className="w-12 h-12 text-green-500" />
                </div>
              </div>
            </motion.div>

            <motion.h2
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-2xl font-bold text-foreground mb-3"
            >
              Demande envoyée !
            </motion.h2>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-muted-foreground mb-4 max-w-xs"
            >
              Un administrateur examinera vos documents dans les plus brefs délais.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="w-full max-w-xs p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 mb-8"
            >
              <p className="text-sm text-muted-foreground">
                En attendant, vous pouvez explorer votre profil mais les interactions avec les autres utilisateurs seront limitées.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="w-full max-w-xs"
            >
              <Button
                onClick={onComplete}
                className="w-full h-14 text-lg font-semibold rounded-2xl bg-gradient-to-r from-primary to-primary/80"
              >
                Continuer
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
