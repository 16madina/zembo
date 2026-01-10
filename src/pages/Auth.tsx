import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import WelcomeScreen from "@/components/onboarding/WelcomeScreen";
import OnboardingSteps, { type OnboardingData } from "@/components/onboarding/OnboardingSteps";
import LoginForm from "@/components/onboarding/LoginForm";
import { supabase } from "@/integrations/supabase/client";

type AuthView = "welcome" | "signup" | "login";

const Auth = () => {
  const navigate = useNavigate();
  const { signIn, signUp } = useAuth();
  const [view, setView] = useState<AuthView>("welcome");
  const [loading, setLoading] = useState(false);

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
        await supabase.from("profiles").update({
          display_name: displayName,
          age: data.birthday ? calculateAge(data.birthday) : null,
          gender: data.gender,
          looking_for: data.lookingFor,
          interests: data.interests,
          location: data.country,
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
