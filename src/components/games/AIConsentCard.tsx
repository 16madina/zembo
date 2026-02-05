 import { useState } from "react";
 import { motion } from "framer-motion";
 import { Brain, Shield, CheckCircle, XCircle, Loader2 } from "lucide-react";
 import { Button } from "@/components/ui/button";
 import { Checkbox } from "@/components/ui/checkbox";
 import { useAIDataConsent } from "@/hooks/useAIDataConsent";
 import { useLanguage } from "@/contexts/LanguageContext";
 
 const AIConsentCard = () => {
   const { hasConsented, isLoading, grantConsent, revokeConsent } = useAIDataConsent();
   const { language } = useLanguage();
   const [acceptedTerms, setAcceptedTerms] = useState(false);
   const [isSubmitting, setIsSubmitting] = useState(false);
 
   const content = {
     fr: {
       title: "Consentement IA",
       description: "Les jeux IA utilisent tes données de profil pour des calculs de compatibilité et prédictions personnalisées.",
       statusGranted: "Consentement accordé",
       statusNotGranted: "Consentement requis",
       acceptTerms: "J'accepte le partage de mes données pour les fonctionnalités IA",
       grantButton: "Accepter",
       revokeButton: "Révoquer",
       privacyNote: "Tes données sont chiffrées et ne sont pas stockées par les fournisseurs IA.",
     },
     en: {
       title: "AI Consent",
       description: "AI games use your profile data for compatibility calculations and personalized predictions.",
       statusGranted: "Consent granted",
       statusNotGranted: "Consent required",
       acceptTerms: "I accept sharing my data for AI features",
       grantButton: "Accept",
       revokeButton: "Revoke",
       privacyNote: "Your data is encrypted and not stored by AI providers.",
     },
   };
 
   const t = content[language];
 
   const handleGrant = async () => {
     if (!acceptedTerms) return;
     setIsSubmitting(true);
     await grantConsent({
       accepted_at: new Date().toISOString(),
       features: ["compatibility", "oracle", "speedDating"],
     });
     setIsSubmitting(false);
     setAcceptedTerms(false);
   };
 
   const handleRevoke = async () => {
     setIsSubmitting(true);
     await revokeConsent();
     setIsSubmitting(false);
   };
 
   if (isLoading) {
     return (
       <div className="w-full p-4 rounded-2xl bg-muted/50 flex items-center justify-center">
         <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
       </div>
     );
   }
 
   return (
     <motion.div
       initial={{ opacity: 0, y: -10 }}
       animate={{ opacity: 1, y: 0 }}
       className={`w-full p-4 rounded-2xl border ${
         hasConsented
           ? "bg-primary/10 border-primary/30"
           : "bg-muted/50 border-muted-foreground/20"
       }`}
     >
       {/* Header */}
       <div className="flex items-center gap-3 mb-3">
         <div
           className={`w-10 h-10 rounded-full flex items-center justify-center ${
             hasConsented ? "bg-primary/20" : "bg-muted"
           }`}
         >
           <Brain className={`w-5 h-5 ${hasConsented ? "text-primary" : "text-muted-foreground"}`} />
         </div>
         <div className="flex-1">
           <h3 className="font-semibold text-sm">{t.title}</h3>
           <div className="flex items-center gap-1.5 mt-0.5">
             {hasConsented ? (
               <>
                 <CheckCircle className="w-3.5 h-3.5 text-primary" />
                 <span className="text-xs text-primary">{t.statusGranted}</span>
               </>
             ) : (
               <>
                 <XCircle className="w-3.5 h-3.5 text-destructive" />
                 <span className="text-xs text-destructive">{t.statusNotGranted}</span>
               </>
             )}
           </div>
         </div>
       </div>
 
       {/* Description */}
       <p className="text-xs text-muted-foreground mb-3">{t.description}</p>
 
       {/* Privacy note */}
       <div className="flex items-start gap-2 mb-3 p-2 rounded-lg bg-background/50">
         <Shield className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
         <span className="text-xs text-muted-foreground">{t.privacyNote}</span>
       </div>
 
       {/* Action area */}
       {hasConsented ? (
         <Button
           variant="outline"
           size="sm"
           onClick={handleRevoke}
           disabled={isSubmitting}
           className="w-full text-xs"
         >
           {isSubmitting ? (
             <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
           ) : null}
           {t.revokeButton}
         </Button>
       ) : (
         <div className="space-y-3">
           <div className="flex items-start gap-2.5">
             <Checkbox
               id="consent-checkbox"
               checked={acceptedTerms}
               onCheckedChange={(checked) => setAcceptedTerms(checked as boolean)}
               className="mt-0.5"
             />
             <label
               htmlFor="consent-checkbox"
               className="text-xs text-foreground cursor-pointer leading-relaxed"
             >
               {t.acceptTerms}
             </label>
           </div>
           <Button
             onClick={handleGrant}
             disabled={!acceptedTerms || isSubmitting}
             size="sm"
             className="w-full btn-gold text-xs"
           >
             {isSubmitting ? (
               <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
             ) : (
               <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
             )}
             {t.grantButton}
           </Button>
         </div>
       )}
     </motion.div>
   );
 };
 
 export default AIConsentCard;