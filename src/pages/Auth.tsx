import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import WelcomeScreen from "@/components/onboarding/WelcomeScreen";
import OnboardingSteps, { type OnboardingData } from "@/components/onboarding/OnboardingSteps";
import LoginForm from "@/components/onboarding/LoginForm";
import { supabase } from "@/integrations/supabase/client";
import { formatPhoneForStorage } from "@/lib/uniqueCheck";

type AuthView = "welcome" | "signup" | "login";

const Auth = () => {
  const navigate = useNavigate();
  const { signIn, signUp } = useAuth();
  const [view, setView] = useState<AuthView>("welcome");
  const [loading, setLoading] = useState(false);

  // Helper function to upload photos to storage
  const uploadPhotos = async (userId: string, photos: string[]): Promise<string | null> => {
    if (photos.length === 0) return null;

    try {
      const uploadedUrls: string[] = [];

      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        
        // Convert base64 to blob
        const base64Response = await fetch(photo);
        const blob = await base64Response.blob();
        
        // Generate unique filename
        const fileName = `${userId}/${Date.now()}-${i}.jpg`;
        
        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from("profile-photos")
          .upload(fileName, blob, {
            contentType: "image/jpeg",
            upsert: true
          });

        if (uploadError) {
          console.error("Upload error:", uploadError);
          continue;
        }

        // Get public URL
        const { data: publicUrlData } = supabase.storage
          .from("profile-photos")
          .getPublicUrl(fileName);

        if (publicUrlData) {
          uploadedUrls.push(publicUrlData.publicUrl);
        }
      }

      // Return the first photo as avatar
      return uploadedUrls.length > 0 ? uploadedUrls[0] : null;
    } catch (err) {
      console.error("Error uploading photos:", err);
      return null;
    }
  };

  const handleSignUpComplete = async (data: OnboardingData) => {
    setLoading(true);
    try {
      // Create user account
      const displayName = `${data.firstName} ${data.lastName}`;
      const { error } = await signUp(data.email, data.password, displayName);
      
      if (error) {
        toast.error(error.message);
        setLoading(false);
        return;
      }

      // Calculate age from birthday
      const calculateAge = (birthday: Date) => {
        const today = new Date();
        let age = today.getFullYear() - birthday.getFullYear();
        const monthDiff = today.getMonth() - birthday.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthday.getDate())) {
          age--;
        }
        return age;
      };

      // Update profile with additional data
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Upload photos to storage
        const avatarUrl = await uploadPhotos(user.id, data.photos);

        // Format phone for storage
        const fullPhone = data.phone && data.dialCode 
          ? formatPhoneForStorage(data.phone, data.dialCode) 
          : null;

        await supabase.from("profiles").update({
          display_name: displayName,
          email: data.email.trim().toLowerCase(),
          phone: fullPhone,
          age: data.birthday ? calculateAge(data.birthday) : null,
          gender: data.gender,
          looking_for: data.lookingFor,
          interests: data.interests,
          location: data.country,
          avatar_url: avatarUrl,
          is_verified: data.faceVerified || false,
        }).eq("user_id", user.id);
      }

      toast.success("Compte créé avec succès ! Bienvenue sur Zembo 💫");
      navigate("/");
    } catch (err) {
      toast.error("Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { error } = await signIn(email, password);
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Connexion réussie !");
        navigate("/");
      }
    } catch (err) {
      toast.error("Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  if (view === "welcome") {
    return (
      <WelcomeScreen
        onSignUp={() => setView("signup")}
        onLogin={() => setView("login")}
      />
    );
  }

  if (view === "login") {
    return (
      <LoginForm
        onSubmit={handleLogin}
        onBack={() => setView("welcome")}
        loading={loading}
      />
    );
  }

  return (
    <OnboardingSteps
      onComplete={handleSignUpComplete}
      onBack={() => setView("welcome")}
    />
  );
};

export default Auth;
