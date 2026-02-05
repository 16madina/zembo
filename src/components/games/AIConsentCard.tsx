 import { useState } from "react";
 import { CheckCircle, ExternalLink } from "lucide-react";
 import AIConsentModal from "@/components/AIConsentModal";
 import { useAIDataConsent } from "@/hooks/useAIDataConsent";
 import { useLanguage } from "@/contexts/LanguageContext";
 
 const AIConsentCard = () => {
   const { hasConsented, isLoading } = useAIDataConsent();
   const { language } = useLanguage();
   const [showModal, setShowModal] = useState(false);
 
   const content = {
     fr: {
       notConsented: "Acceptez l'utilisation avant de commencer",
       consented: "Utilisation IA · Déjà accepté",
     },
     en: {
       notConsented: "Accept usage before starting",
       consented: "AI usage · Already accepted",
     },
   };
 
   const t = content[language];
 
   if (isLoading) {
     return null;
   }
 
   return (
     <>
       <button
         onClick={() => setShowModal(true)}
         className="flex items-center justify-center gap-1.5 text-xs text-primary hover:underline"
       >
         {hasConsented ? (
           <>
             <CheckCircle className="w-3.5 h-3.5" />
             {t.consented}
           </>
         ) : (
           <>
             <ExternalLink className="w-3.5 h-3.5" />
             {t.notConsented}
           </>
         )}
       </button>
 
       <AIConsentModal
         isOpen={showModal}
         onClose={() => setShowModal(false)}
         onConsent={() => setShowModal(false)}
       />
     </>
   );
 };
 
 export default AIConsentCard;