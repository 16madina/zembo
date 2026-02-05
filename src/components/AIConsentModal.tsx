import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Shield, Globe, CheckCircle, X, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  const [showPrivacyPopup, setShowPrivacyPopup] = useState(false);

  const content = {
    fr: {
      title: "Consentement IA",
      subtitle: "Zembo utilise l'intelligence artificielle",
      introText: "Zembo utilise un service d'IA externe pour :",
      aiPurposes: [
        "Analyser la compatibilité",
        "Améliorer les recommandations",
        "Personnaliser votre expérience",
      ],
      dataSharedTitle: "Données partagées",
      dataSharedIntro: "Pour cela, nous pouvons partager :",
      dataItems: [
        "Votre photo",
        "Votre âge",
        "Vos préférences",
      ],
      providerTitle: "Fournisseur IA",
      providerText: "Lovable AI (modèles Google Gemini & OpenAI GPT)",
      securityText: "Ces données sont utilisées uniquement pour améliorer votre expérience sur Zembo et sont protégées conformément à notre politique de confidentialité.",
      acceptTerms: "J'accepte le partage de mes données pour les fonctionnalités IA",
      privacyLink: "Voir notre politique de confidentialité",
      acceptButton: "Accepter et continuer",
      declineButton: "Refuser",
      privacyTitle: "Politique de confidentialité",
      privacyBack: "Retour",
      privacySections: [
        { title: "Collecte des données", content: "Nous collectons les informations que vous nous fournissez directement : nom, email, date de naissance, photos de profil, localisation, préférences de rencontre et centres d'intérêt." },
        { title: "Fonctionnalités IA", content: "Pour les fonctionnalités IA (Test de Compatibilité, Zembo Oracle), nous partageons certaines données avec Google (Gemini) et OpenAI (GPT). Les données sont chiffrées en transit et ne sont pas stockées de manière permanente." },
        { title: "Sécurité", content: "Nous utilisons des mesures de sécurité techniques : chiffrement SSL/TLS, stockage sécurisé, contrôles d'accès stricts." },
        { title: "Vos droits (RGPD)", content: "Vous avez le droit d'accéder, rectifier, supprimer, exporter vos données. Vous pouvez révoquer votre consentement IA à tout moment." },
      ],
    },
    en: {
      title: "AI Consent",
      subtitle: "Zembo uses artificial intelligence",
      introText: "Zembo uses an external AI service to:",
      aiPurposes: [
        "Analyze compatibility",
        "Improve recommendations",
        "Personalize your experience",
      ],
      dataSharedTitle: "Data shared",
      dataSharedIntro: "For this, we may share:",
      dataItems: [
        "Your photo",
        "Your age",
        "Your preferences",
      ],
      providerTitle: "AI Provider",
      providerText: "Lovable AI (Google Gemini & OpenAI GPT models)",
      securityText: "This data is used solely to improve your experience on Zembo and is protected in accordance with our privacy policy.",
      acceptTerms: "I accept sharing my data for AI features",
      privacyLink: "View our privacy policy",
      acceptButton: "Accept and continue",
      declineButton: "Decline",
      privacyTitle: "Privacy Policy",
      privacyBack: "Back",
      privacySections: [
        { title: "Data Collection", content: "We collect information you provide directly: name, email, date of birth, profile photos, location, dating preferences and interests." },
        { title: "AI Features", content: "For AI features (Compatibility Test, Zembo Oracle), we share certain data with Google (Gemini) and OpenAI (GPT). Data is encrypted in transit and not permanently stored." },
        { title: "Security", content: "We use technical security measures: SSL/TLS encryption, secure storage, strict access controls." },
        { title: "Your Rights (GDPR)", content: "You have the right to access, rectify, delete, export your data. You can revoke your AI consent at any time." },
      ],
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
              {/* Intro - Why AI */}
              <div className="bg-primary/10 border border-primary/20 rounded-xl p-4">
                <p className="text-sm font-medium text-foreground mb-3">{t.introText}</p>
                <ul className="space-y-2">
                  {t.aiPurposes.map((item, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle className="w-3 h-3 text-primary flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Data shared */}
              <div className="bg-muted/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Globe className="w-4 h-4 text-primary" />
                  <h3 className="font-semibold text-sm">{t.dataSharedTitle}</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-3">{t.dataSharedIntro}</p>
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

              {/* Security */}
              <div className="bg-muted/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="w-4 h-4 text-primary" />
                  <h3 className="font-semibold text-sm">Protection des données</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{t.securityText}</p>
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
            <button
              onClick={() => setShowPrivacyPopup(true)}
              className="flex items-center justify-center gap-2 text-sm text-primary hover:underline mb-6"
            >
              <ExternalLink className="w-4 h-4" />
              {t.privacyLink}
            </button>

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

      {/* Privacy Policy Popup */}
      {showPrivacyPopup && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setShowPrivacyPopup(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-background rounded-3xl p-6 max-h-[85vh] flex flex-col"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-foreground">{t.privacyTitle}</h2>
              <button
                onClick={() => setShowPrivacyPopup(false)}
                className="w-8 h-8 rounded-full glass flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <ScrollArea className="flex-1 pr-2">
              <div className="space-y-4">
                {t.privacySections.map((section, index) => (
                  <div key={index} className="bg-muted/50 rounded-xl p-4">
                    <h3 className="font-semibold text-sm mb-2 text-foreground">{section.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{section.content}</p>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <Button
              onClick={() => setShowPrivacyPopup(false)}
              className="w-full mt-4"
              variant="outline"
            >
              {t.privacyBack}
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AIConsentModal;
