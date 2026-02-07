import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Shield, CheckCircle, X, Loader2, ExternalLink } from "lucide-react";
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
      subtitle: "Autorisation requise avant utilisation",
      warningTitle: "⚠️ Données partagées avec des tiers",
      warningText: "Cette fonctionnalité partage vos données avec des services d'intelligence artificielle tiers. Vous devez donner votre consentement explicite avant de continuer.",
      introText: "Zembo utilise un service d'IA externe pour :",
      aiPurposes: [
        "Analyser la compatibilité entre utilisateurs",
        "Générer des prédictions personnalisées (Zembo Oracle)",
        "Améliorer les recommandations de matchs",
      ],
      dataSharedTitle: "📋 Données envoyées aux fournisseurs IA",
      dataSharedIntro: "Les données suivantes seront transmises :",
      dataItems: [
        { label: "Prénom", detail: "Votre prénom uniquement" },
        { label: "Âge", detail: "Calculé à partir de votre date de naissance" },
        { label: "Centres d'intérêt", detail: "Liste de vos hobbies" },
        { label: "Préférences de connexion", detail: "Ce que vous recherchez" },
        { label: "Réponses aux questionnaires", detail: "Vos réponses aux tests de compatibilité" },
      ],
      notSharedTitle: "🔒 Données NON partagées",
      notSharedItems: [
        "Photos de profil",
        "Numéro de téléphone",
        "Email",
        "Localisation précise",
        "Historique de messages",
      ],
      providerTitle: "🏢 Destinataires des données",
      providers: [
        { name: "Google LLC", service: "API Gemini", location: "États-Unis" },
        { name: "OpenAI Inc.", service: "API GPT", location: "États-Unis" },
      ],
      securityTitle: "🛡️ Protection des données",
      securityItems: [
        "Chiffrement TLS 1.3 en transit",
        "Données non stockées de manière permanente par les fournisseurs",
        "Conformité SOC 2 et ISO 27001",
      ],
      acceptTerms: "Je comprends et j'accepte le partage de mes données avec les fournisseurs IA tiers listés ci-dessus",
      privacyLink: "Lire la politique de confidentialité complète",
      acceptButton: "Accepter et continuer",
      declineButton: "Refuser",
      privacyTitle: "Politique de confidentialité",
      privacyBack: "Retour",
      privacySections: [
        { title: "Collecte des données", content: "Nous collectons les informations que vous nous fournissez directement : nom, email, date de naissance, photos de profil, localisation, préférences de rencontre et centres d'intérêt." },
        { title: "Partage avec un tiers IA", content: "Nous partageons certaines données (prénom, âge, intérêts, préférences) avec des services d'IA tiers pour analyser la compatibilité et améliorer l'expérience utilisateur. Vos photos NE SONT PAS envoyées aux services IA." },
        { title: "Fournisseurs IA", content: "Pour les fonctionnalités IA (Test de Compatibilité, Zembo Oracle), nous utilisons les services de Google (Gemini) et OpenAI (GPT) basés aux États-Unis. Les données sont chiffrées en transit et ne sont pas stockées de manière permanente par ces fournisseurs." },
        { title: "Sécurité", content: "Nous utilisons des mesures de sécurité techniques : chiffrement SSL/TLS, stockage sécurisé, contrôles d'accès stricts." },
        { title: "Vos droits (RGPD)", content: "Vous avez le droit d'accéder, rectifier, supprimer, exporter vos données. Vous pouvez révoquer votre consentement IA à tout moment depuis les paramètres." },
      ],
    },
    en: {
      title: "AI Consent",
      subtitle: "Authorization required before use",
      warningTitle: "⚠️ Data shared with third parties",
      warningText: "This feature shares your data with third-party artificial intelligence services. You must give your explicit consent before continuing.",
      introText: "Zembo uses an external AI service to:",
      aiPurposes: [
        "Analyze compatibility between users",
        "Generate personalized predictions (Zembo Oracle)",
        "Improve match recommendations",
      ],
      dataSharedTitle: "📋 Data sent to AI providers",
      dataSharedIntro: "The following data will be transmitted:",
      dataItems: [
        { label: "First name", detail: "Your first name only" },
        { label: "Age", detail: "Calculated from your date of birth" },
        { label: "Interests", detail: "List of your hobbies" },
        { label: "Connection preferences", detail: "What you're looking for" },
        { label: "Questionnaire answers", detail: "Your compatibility test responses" },
      ],
      notSharedTitle: "🔒 Data NOT shared",
      notSharedItems: [
        "Profile photos",
        "Phone number",
        "Email",
        "Precise location",
        "Message history",
      ],
      providerTitle: "🏢 Data recipients",
      providers: [
        { name: "Google LLC", service: "Gemini API", location: "United States" },
        { name: "OpenAI Inc.", service: "GPT API", location: "United States" },
      ],
      securityTitle: "🛡️ Data protection",
      securityItems: [
        "TLS 1.3 encryption in transit",
        "Data not permanently stored by providers",
        "SOC 2 and ISO 27001 compliance",
      ],
      acceptTerms: "I understand and accept sharing my data with the third-party AI providers listed above",
      privacyLink: "Read the full privacy policy",
      acceptButton: "Accept and continue",
      declineButton: "Decline",
      privacyTitle: "Privacy Policy",
      privacyBack: "Back",
      privacySections: [
        { title: "Data Collection", content: "We collect information you provide directly: name, email, date of birth, profile photos, location, dating preferences and interests." },
        { title: "Third-Party AI Sharing", content: "We share certain data (first name, age, interests, preferences) with third-party AI services to analyze compatibility and improve user experience. Your photos are NOT sent to AI services." },
        { title: "AI Providers", content: "For AI features (Compatibility Test, Zembo Oracle), we use Google (Gemini) and OpenAI (GPT) services based in the United States. Data is encrypted in transit and not permanently stored by these providers." },
        { title: "Security", content: "We use technical security measures: SSL/TLS encryption, secure storage, strict access controls." },
        { title: "Your Rights (GDPR)", content: "You have the right to access, rectify, delete, export your data. You can revoke your AI consent at any time from settings." },
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
            <div className="flex items-center justify-between mb-4">
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

            {/* Warning Banner */}
            <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 mb-4">
              <h3 className="font-bold text-sm text-destructive mb-2">{t.warningTitle}</h3>
              <p className="text-xs text-muted-foreground">{t.warningText}</p>
            </div>

            {/* Data shared */}
            <div className="space-y-3 mb-4">
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

              {/* Data SHARED with AI */}
              <div className="bg-muted/50 rounded-xl p-4">
                <h3 className="font-semibold text-sm mb-3">{t.dataSharedTitle}</h3>
                <p className="text-xs text-muted-foreground mb-3">{t.dataSharedIntro}</p>
                <ul className="space-y-2">
                  {t.dataItems.map((item, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <CheckCircle className="w-3 h-3 text-primary flex-shrink-0 mt-1" />
                      <div>
                        <span className="font-medium text-foreground">{item.label}</span>
                        <span className="text-muted-foreground"> - {item.detail}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Data NOT shared */}
              <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
                <h3 className="font-semibold text-sm mb-3 text-green-600">{t.notSharedTitle}</h3>
                <ul className="grid grid-cols-2 gap-2">
                  {t.notSharedItems.map((item, index) => (
                    <li key={index} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Shield className="w-3 h-3 text-green-500 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* AI Providers */}
              <div className="bg-muted/50 rounded-xl p-4">
                <h3 className="font-semibold text-sm mb-3">{t.providerTitle}</h3>
                <div className="space-y-2">
                  {t.providers.map((provider, index) => (
                    <div key={index} className="flex items-center justify-between text-xs p-2 bg-background/50 rounded-lg">
                      <div>
                        <span className="font-medium text-foreground">{provider.name}</span>
                        <span className="text-muted-foreground"> ({provider.service})</span>
                      </div>
                      <span className="text-muted-foreground">{provider.location}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Security */}
              <div className="bg-muted/50 rounded-xl p-4">
                <h3 className="font-semibold text-sm mb-3">{t.securityTitle}</h3>
                <ul className="space-y-2">
                  {t.securityItems.map((item, index) => (
                    <li key={index} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Shield className="w-3 h-3 text-primary flex-shrink-0" />
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
