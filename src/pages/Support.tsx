import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Send, CheckCircle, Headphones } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Support = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { user } = useAuth();
  const [category, setCategory] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [userProfile, setUserProfile] = useState<{ email?: string; display_name?: string } | null>(null);

  const isFrench = language === "fr";

  // Fetch user profile
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.id) return;
      const { data } = await supabase
        .from("profiles")
        .select("email, display_name")
        .eq("user_id", user.id)
        .single();
      if (data) setUserProfile(data);
    };
    fetchProfile();
  }, [user?.id]);

  const categories = [
    { value: "bug", label: isFrench ? "Bug / Problème technique" : "Bug / Technical issue" },
    { value: "account", label: isFrench ? "Compte / Connexion" : "Account / Login" },
    { value: "payment", label: isFrench ? "Paiement / Abonnement" : "Payment / Subscription" },
    { value: "safety", label: isFrench ? "Signalement / Sécurité" : "Report / Safety" },
    { value: "feature", label: isFrench ? "Suggestion / Idée" : "Suggestion / Idea" },
    { value: "other", label: isFrench ? "Autre" : "Other" },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!category || !message.trim()) {
      toast.error(isFrench ? "Veuillez remplir tous les champs requis" : "Please fill all required fields");
      return;
    }

    setIsSubmitting(true);

    try {
      // Call edge function to send support email
      const { error } = await supabase.functions.invoke("send-support-request", {
        body: {
          category,
          subject: subject || categories.find(c => c.value === category)?.label,
          message,
          userEmail: userProfile?.email || user?.email,
          userName: userProfile?.display_name,
          userId: user?.id,
        },
      });

      if (error) throw error;

      setIsSubmitted(true);
      toast.success(isFrench ? "Votre demande a été envoyée !" : "Your request has been sent!");
    } catch (error) {
      console.error("Error sending support request:", error);
      toast.error(isFrench ? "Erreur lors de l'envoi. Veuillez réessayer." : "Error sending. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="fixed inset-0 flex flex-col overflow-hidden pt-[env(safe-area-inset-top)] pb-[calc(88px+env(safe-area-inset-bottom))] md:px-8 lg:px-16">
        <header className="flex items-center px-4 py-3 flex-shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="mr-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">
            {isFrench ? "Assistance" : "Support"}
          </h1>
        </header>

        <div className="flex-1 flex items-center justify-center px-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-4"
          >
            <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
              <CheckCircle className="h-10 w-10 text-green-500" />
            </div>
            <h2 className="text-xl font-semibold">
              {isFrench ? "Message envoyé !" : "Message sent!"}
            </h2>
            <p className="text-muted-foreground max-w-sm">
              {isFrench
                ? "Notre équipe vous répondra dans les plus brefs délais. Merci pour votre patience."
                : "Our team will respond as soon as possible. Thank you for your patience."}
            </p>
            <Button onClick={() => navigate(-1)} className="mt-4">
              {isFrench ? "Retour" : "Go back"}
            </Button>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden pt-[env(safe-area-inset-top)] pb-[calc(88px+env(safe-area-inset-bottom))] md:px-8 lg:px-16">
      {/* Header */}
      <header className="flex items-center px-4 py-3 flex-shrink-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="mr-2"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold">
          {isFrench ? "Assistance" : "Support"}
        </h1>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 max-w-2xl mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6 pb-6"
        >
          {/* Header Card */}
          <div className="bg-card/50 rounded-2xl p-4 border border-border/50">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                <Headphones className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold">
                  {isFrench ? "Comment pouvons-nous vous aider ?" : "How can we help you?"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {isFrench
                    ? "Décrivez votre problème et nous vous répondrons rapidement."
                    : "Describe your issue and we'll get back to you quickly."}
                </p>
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Category */}
            <div className="space-y-3">
              <Label className="text-base font-medium">
                {isFrench ? "Catégorie *" : "Category *"}
              </Label>
              <RadioGroup value={category} onValueChange={setCategory} className="space-y-2">
                {categories.map((cat) => (
                  <div
                    key={cat.value}
                    className={`flex items-center space-x-3 p-3 rounded-xl border transition-all ${
                      category === cat.value
                        ? "border-primary bg-primary/10"
                        : "border-border/50 bg-card/30"
                    }`}
                  >
                    <RadioGroupItem value={cat.value} id={cat.value} />
                    <Label htmlFor={cat.value} className="flex-1 cursor-pointer">
                      {cat.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {/* Subject */}
            <div className="space-y-2">
              <Label htmlFor="subject">
                {isFrench ? "Sujet (optionnel)" : "Subject (optional)"}
              </Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder={isFrench ? "Résumez votre problème..." : "Summarize your issue..."}
                className="bg-card/50 border-border/50"
              />
            </div>

            {/* Message */}
            <div className="space-y-2">
              <Label htmlFor="message">
                {isFrench ? "Description *" : "Description *"}
              </Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={
                  isFrench
                    ? "Décrivez votre problème en détail..."
                    : "Describe your issue in detail..."
                }
                className="min-h-[150px] bg-card/50 border-border/50"
                required
              />
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full h-12 text-base font-medium"
              disabled={isSubmitting || !category || !message.trim()}
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {isFrench ? "Envoi..." : "Sending..."}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Send className="h-4 w-4" />
                  {isFrench ? "Envoyer" : "Send"}
                </div>
              )}
            </Button>
          </form>
        </motion.div>
      </div>
    </div>
  );
};

export default Support;
