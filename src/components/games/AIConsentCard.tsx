 import { useState } from "react";
 import { CheckCircle, ExternalLink } from "lucide-react";
 import { Checkbox } from "@/components/ui/checkbox";
 import AIConsentModal from "@/components/AIConsentModal";
 import { useAIDataConsent } from "@/hooks/useAIDataConsent";
 import { useLanguage } from "@/contexts/LanguageContext";
 
 const AIConsentCard = () => {
   const { hasConsented, isLoading } = useAIDataConsent();
   const { language } = useLanguage();
   const [showModal, setShowModal] = useState(false);
 
   const content = {
     fr: {
       label: "J'accepte l'utilisation de mes données pour les jeux IA",
       link: "Voir les détails",
     },
     en: {
       label: "I accept the use of my data for AI games",
       link: "View details",
     },
   };
 
   const t = content[language];
 
   const handleCheckboxClick = () => {
     if (!hasConsented) {
       setShowModal(true);
     }
   };
 
   if (isLoading) {
     return null;
   }
 
   return (
     <>
       <div className="flex items-center gap-2">
         <Checkbox
           id="ai-consent"
           checked={hasConsented}
           onCheckedChange={handleCheckboxClick}
           disabled={hasConsented}
         />
         <label
           htmlFor="ai-consent"
           className="text-xs text-muted-foreground cursor-pointer flex items-center gap-1.5"
         >
           {hasConsented && <CheckCircle className="w-3 h-3 text-primary" />}
           {t.label}
         </label>
         <button
           onClick={() => setShowModal(true)}
           className="text-xs text-primary hover:underline flex items-center gap-1"
         >
           <ExternalLink className="w-3 h-3" />
           {t.link}
         </button>
       </div>
 
       <AIConsentModal
         isOpen={showModal}
         onClose={() => setShowModal(false)}
         onConsent={() => setShowModal(false)}
       />
     </>
   );
 };
 
 export default AIConsentCard;