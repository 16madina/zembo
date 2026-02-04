import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Shield, Globe, CheckCircle, X, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useAIDataConsent } from "@/hooks/useAIDataConsent";
import { useLanguage } from "@/contexts/LanguageContext";

interface AIConsentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConsent: () => void;
}

const AIConsentModal = ({ isOpen, onClose, onConsent }: AIConsentModalProps) => {
  const { grantConsent } = useAIDataConsent();
  const { language } = useLanguage();
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const content = {
    fr: {
      title: "Fonctionnalités IA",
      subtitle: "Consentement pour l'utilisation des données",
      dataSharedTitle: "Données partagées avec l'IA",
      dataItems: [
        "Votre profil (nom, âge, intérêts)",
        "Vos réponses au test de compatibilité",
        "Vos préférences de rencontre",
      ],
      providerTitle: "Fournisseur IA",
      providerText: "Lovable AI (modèles Google Gemini & OpenAI GPT)",
      purposeTitle: "Objectif",
      purposeItems: [
        "Calculer votre compatibilité avec d'autres utilisateurs",
        "Générer des prédictions personnalisées (Zembo Oracle)",
        "Améliorer les suggestions de matchs",
      ],
      securityTitle: "Sécurité",
      securityItems: [
        "Vos données sont chiffrées en transit",
        "Aucune donnée n'est stockée par les fournisseurs IA",
        "Vous pouvez révoquer ce consentement à tout moment",
      ],
      acceptTerms: "J'accepte le partage de mes données pour les fonctionnalités IA",
      privacyLink: "Voir notre politique de confidentialité",
      acceptButton: "Accepter et continuer",
      declineButton: "Refuser",
    },
    en: {
      title: "AI Features",
      subtitle: "Consent for data usage",
      dataSharedTitle: "Data shared with AI",
      dataItems: [
        "Your profile (name, age, interests)",
        "Your compatibility test answers",
        "Your dating preferences",
      ],
      providerTitle: "AI Provider",
      providerText: "Lovable AI (Google Gemini & OpenAI GPT models)",
      purposeTitle: "Purpose",
      purposeItems: [
        "Calculate your compatibility with other users",
        "Generate personalized predictions (Zembo Oracle)",
        "Improve match suggestions",
      ],
      securityTitle: "Security",
      securityItems: [
        "Your data is encrypted in transit",
        "No data is stored by AI providers",
        "You can revoke this consent at any time",
      ],
      acceptTerms: "I accept sharing my data for AI features",
      privacyLink: "View our privacy policy",
      acceptButton: "Accept and continue",
      declineButton: "Decline",
    },
  };

  const t = content[language];

  const handleAccept = async () => {
    if (!acceptedTerms) return;
    
    setIsSubmitting(true);
    
    const success = await grantConsent({
      accepted_at: new Date().toISOString(),
      features: ["compatibility", "oracle", "suggestions"],
    });
    
    if (success) {
      onConsent();
      onClose();
    }
    
    setIsSubmitting(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-background rounded-3xl p-6 max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                  <Brain className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">{t.title}</h2>
                  <p className="text-sm text-muted-foreground">{t.subtitle}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full glass flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Data shared */}
            <div className="space-y-4 mb-6">
              <div className="bg-muted/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Globe className="w-4 h-4 text-primary" />
                  <h3 className="font-semibold text-sm">{t.dataSharedTitle}</h3>
                </div>
                <ul className="space-y-2">
                  {t.dataItems.map((item, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle className="w-3 h-3 text-primary flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Provider */}
              <div className="bg-muted/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Brain className="w-4 h-4 text-primary" />
                  <h3 className="font-semibold text-sm">{t.providerTitle}</h3>
                </div>
                <p className="text-sm text-muted-foreground">{t.providerText}</p>
              </div>

              {/* Purpose */}
              <div className="bg-muted/50 rounded-xl p-4">
                <h3 className="font-semibold text-sm mb-3">{t.purposeTitle}</h3>
                <ul className="space-y-2">
                  {t.purposeItems.map((item, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle className="w-3 h-3 text-primary flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Security */}
              <div className="bg-primary/10 border border-primary/20 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="w-4 h-4 text-primary" />
                  <h3 className="font-semibold text-sm">{t.securityTitle}</h3>
                </div>
                <ul className="space-y-2">
                  {t.securityItems.map((item, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle className="w-3 h-3 text-primary flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Accept checkbox */}
            <div className="flex items-start gap-3 mb-4 p-4 bg-muted/30 rounded-xl">
              <Checkbox
                id="accept-terms"
                checked={acceptedTerms}
                onCheckedChange={(checked) => setAcceptedTerms(checked as boolean)}
                className="mt-0.5"
              />
              <label
                htmlFor="accept-terms"
                className="text-sm text-foreground cursor-pointer leading-relaxed"
              >
                {t.acceptTerms}
              </label>
            </div>

            {/* Privacy link */}
            <a
              href="/privacy"
              target="_blank"
              className="flex items-center justify-center gap-2 text-sm text-primary hover:underline mb-6"
            >
              <ExternalLink className="w-4 h-4" />
              {t.privacyLink}
            </a>

            {/* Buttons */}
            <div className="space-y-3">
              <Button
                onClick={handleAccept}
                disabled={!acceptedTerms || isSubmitting}
                className="w-full btn-gold gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    ...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    {t.acceptButton}
                  </>
                )}
              </Button>
              
              <Button
                variant="ghost"
                onClick={onClose}
                disabled={isSubmitting}
                className="w-full"
              >
                {t.declineButton}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AIConsentModal;
