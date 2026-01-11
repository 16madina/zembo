import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type Language = "fr" | "en";

// Complete translations for the entire app
export const translations = {
  fr: {
    // Navigation
    home: "Accueil",
    live: "Live",
    random: "Random",
    messages: "Messages",
    profile: "Profil",
    
    // Home page
    discover: "Découvrir",
    nearby: "À proximité",
    noProfilesFound: "Aucun profil trouvé",
    modifyFilters: "Modifiez vos critères de recherche pour voir plus de profils",
    reset: "Réinitialiser",
    modify: "Modifier",
    
    // Filters
    filters: "Filtres",
    age: "Âge",
    years: "ans",
    maxDistance: "Distance max",
    km: "km",
    lookingFor: "Je recherche",
    women: "Femmes",
    men: "Hommes",
    nonBinary: "Non-binaire",
    trans: "Trans",
    everyone: "Tout le monde",
    applyFilters: "Appliquer les filtres",
    
    // Profile
    myProfile: "Mon Profil",
    verifiedProfile: "Profil vérifié",
    unverifiedProfile: "Profil non vérifié",
    emailVerified: "Email vérifié",
    emailPending: "Email en attente",
    limitReached: "Limite atteinte",
    retryIn: "Réessayez dans",
    remainingSends: "envoi(s) restant(s)",
    verifyMyEmail: "Vérifier mon email",
    resendEmail: "Renvoyer l'email",
    sending: "Envoi...",
    photoGallery: "Galerie photos",
    addPhoto: "Ajouter une photo",
    aboutMe: "À propos de moi",
    addBio: "Ajouter une bio",
    add: "Ajouter",
    gender: "Genre",
    birthday: "Date de naissance",
    occupation: "Profession",
    education: "Études",
    originCity: "Ville d'origine",
    height: "Taille",
    interests: "Centres d'intérêt",
    female: "Femme",
    male: "Homme",
    lgbt: "LGBT+",
    
    // Settings
    settings: "Paramètres",
    notifications: "Notifications",
    pushNotifications: "Notifications push",
    pushDescription: "Recevoir des alertes pour les matchs, messages et activités",
    appearance: "Apparence",
    darkMode: "Mode sombre",
    lightMode: "Mode clair",
    systemMode: "Système",
    language: "Langue",
    french: "Français",
    english: "English",
    privacyAndSecurity: "Confidentialité et sécurité",
    privacyPolicy: "Politique de confidentialité",
    termsOfService: "Conditions d'utilisation",
    dataCollection: "Collecte des données",
    accountManagement: "Gestion du compte",
    deleteAccount: "Supprimer mon compte",
    deleteAccountWarning: "Cette action est irréversible",
    dataRetention: "Conservation des données",
    dataRetentionInfo: "Vos données sont supprimées 90 jours après la suppression du compte",
    storeGuidelines: "Directives des stores",
    confirmDelete: "Confirmer la suppression",
    deleteConfirmMessage: "Êtes-vous sûr de vouloir supprimer définitivement votre compte ? Toutes vos données seront supprimées après 90 jours conformément à notre politique de conservation.",
    cancel: "Annuler",
    delete: "Supprimer",
    saved: "Paramètres sauvegardés",
    communityGuidelines: "Règles de la communauté",
    safetyTips: "Conseils de sécurité",
    contentModeration: "Modération du contenu",
    userSafety: "Sécurité des utilisateurs",
    childSafety: "Protection des mineurs",
    contentPolicy: "Politique de contenu",
    userProtection: "Protection des utilisateurs",
    dataPrivacy: "Confidentialité des données",
    consequences: "Sanctions",
    reportingAndBlocking: "Signalement & blocage",
    exportData: "Exporter mes données",
    exportDataDescription: "Télécharger toutes vos données personnelles (RGPD)",
    exporting: "Export en cours...",
    exportSuccess: "Vos données ont été exportées avec succès",
    exportError: "Erreur lors de l'export des données",
    close: "Fermer",
    download: "Télécharger",
    deleting: "Suppression...",
    
    // Advanced Privacy Settings
    advancedPrivacy: "Paramètres de confidentialité avancés",
    profileVisibility: "Visibilité du profil",
    profileVisibilityDescription: "Contrôlez qui peut voir votre profil",
    visibleToAll: "Visible par tous",
    visibleToMatches: "Visible par mes matchs uniquement",
    invisible: "Mode invisible",
    whoCanContact: "Qui peut me contacter",
    whoCanContactDescription: "Contrôlez qui peut vous envoyer des messages",
    anyoneCanContact: "Tout le monde",
    matchesOnly: "Mes matchs uniquement",
    verifiedOnly: "Profils vérifiés uniquement",
    geographicBlocking: "Blocage géographique",
    geographicBlockingDescription: "Masquer votre profil dans certaines régions",
    blockMyCountry: "Masquer dans mon pays",
    blockNearby: "Masquer aux utilisateurs proches (-10 km)",
    noBlocking: "Aucun blocage",
    privacySettingsSaved: "Paramètres de confidentialité sauvegardés",
    
    // Match Modal
    itsAMatch: "C'est un match !",
    youAndMatch: "Vous et {name} vous êtes mutuellement likés",
    sendMessage: "Envoyer un message",
    keepSwiping: "Continuer à swiper",
    
    // Profile Modal
    bio: "Bio",
    noInfo: "Non renseigné",
    sendMessageTo: "Envoyer un message à",
    likeProfile: "Liker",
    superLikeProfile: "Super Like",
    
    // Toasts
    success: "Succès",
    error: "Erreur",
    profileUpdated: "Profil mis à jour",
    photoAdded: "Photo ajoutée",
    photoDeleted: "Photo supprimée",
    emailNotAvailable: "Email non disponible",
    verificationEmailSent: "Email de vérification envoyé ! ✉️",
    remainingEmailsToday: "Il vous reste {count} envoi(s) aujourd'hui.",
    lastSendOfDay: "C'était votre dernier envoi de la journée.",
    dailyLimitReached: "Limite journalière atteinte",
    errorSendingEmail: "Erreur lors de l'envoi de l'email",
    accountScheduledDeletion: "Votre compte a été programmé pour suppression. Vos données seront effacées sous 90 jours.",
    errorDeletingAccount: "Erreur lors de la suppression du compte",
  },
  en: {
    // Navigation
    home: "Home",
    live: "Live",
    random: "Random",
    messages: "Messages",
    profile: "Profile",
    
    // Home page
    discover: "Discover",
    nearby: "Nearby",
    noProfilesFound: "No profiles found",
    modifyFilters: "Modify your search criteria to see more profiles",
    reset: "Reset",
    modify: "Modify",
    
    // Filters
    filters: "Filters",
    age: "Age",
    years: "years",
    maxDistance: "Max distance",
    km: "km",
    lookingFor: "I'm looking for",
    women: "Women",
    men: "Men",
    nonBinary: "Non-binary",
    trans: "Trans",
    everyone: "Everyone",
    applyFilters: "Apply filters",
    
    // Profile
    myProfile: "My Profile",
    verifiedProfile: "Verified profile",
    unverifiedProfile: "Unverified profile",
    emailVerified: "Email verified",
    emailPending: "Email pending",
    limitReached: "Limit reached",
    retryIn: "Retry in",
    remainingSends: "send(s) remaining",
    verifyMyEmail: "Verify my email",
    resendEmail: "Resend email",
    sending: "Sending...",
    photoGallery: "Photo gallery",
    addPhoto: "Add a photo",
    aboutMe: "About me",
    addBio: "Add a bio",
    add: "Add",
    gender: "Gender",
    birthday: "Date of birth",
    occupation: "Occupation",
    education: "Education",
    originCity: "Origin city",
    height: "Height",
    interests: "Interests",
    female: "Female",
    male: "Male",
    lgbt: "LGBT+",
    
    // Settings
    settings: "Settings",
    notifications: "Notifications",
    pushNotifications: "Push notifications",
    pushDescription: "Receive alerts for matches, messages and activities",
    appearance: "Appearance",
    darkMode: "Dark mode",
    lightMode: "Light mode",
    systemMode: "System",
    language: "Language",
    french: "Français",
    english: "English",
    privacyAndSecurity: "Privacy & Security",
    privacyPolicy: "Privacy Policy",
    termsOfService: "Terms of Service",
    dataCollection: "Data Collection",
    accountManagement: "Account Management",
    deleteAccount: "Delete my account",
    deleteAccountWarning: "This action is irreversible",
    dataRetention: "Data Retention",
    dataRetentionInfo: "Your data is deleted 90 days after account deletion",
    storeGuidelines: "Store Guidelines",
    confirmDelete: "Confirm deletion",
    deleteConfirmMessage: "Are you sure you want to permanently delete your account? All your data will be deleted after 90 days according to our retention policy.",
    cancel: "Cancel",
    delete: "Delete",
    saved: "Settings saved",
    communityGuidelines: "Community Guidelines",
    safetyTips: "Safety Tips",
    contentModeration: "Content Moderation",
    userSafety: "User Safety",
    childSafety: "Child Safety",
    contentPolicy: "Content Policy",
    userProtection: "User Protection",
    dataPrivacy: "Data Privacy",
    consequences: "Consequences",
    reportingAndBlocking: "Reporting & Blocking",
    exportData: "Export my data",
    exportDataDescription: "Download all your personal data (GDPR)",
    exporting: "Exporting...",
    exportSuccess: "Your data has been exported successfully",
    exportError: "Error exporting data",
    close: "Close",
    download: "Download",
    deleting: "Deleting...",
    
    // Advanced Privacy Settings
    advancedPrivacy: "Advanced Privacy Settings",
    profileVisibility: "Profile Visibility",
    profileVisibilityDescription: "Control who can see your profile",
    visibleToAll: "Visible to all",
    visibleToMatches: "Visible to my matches only",
    invisible: "Invisible mode",
    whoCanContact: "Who can contact me",
    whoCanContactDescription: "Control who can send you messages",
    anyoneCanContact: "Anyone",
    matchesOnly: "My matches only",
    verifiedOnly: "Verified profiles only",
    geographicBlocking: "Geographic Blocking",
    geographicBlockingDescription: "Hide your profile in certain regions",
    blockMyCountry: "Hide in my country",
    blockNearby: "Hide from nearby users (-10 km)",
    noBlocking: "No blocking",
    privacySettingsSaved: "Privacy settings saved",
    
    // Match Modal
    itsAMatch: "It's a match!",
    youAndMatch: "You and {name} liked each other",
    sendMessage: "Send a message",
    keepSwiping: "Keep swiping",
    
    // Profile Modal
    bio: "Bio",
    noInfo: "Not specified",
    sendMessageTo: "Send a message to",
    likeProfile: "Like",
    superLikeProfile: "Super Like",
    
    // Toasts
    success: "Success",
    error: "Error",
    profileUpdated: "Profile updated",
    photoAdded: "Photo added",
    photoDeleted: "Photo deleted",
    emailNotAvailable: "Email not available",
    verificationEmailSent: "Verification email sent! ✉️",
    remainingEmailsToday: "You have {count} send(s) remaining today.",
    lastSendOfDay: "This was your last send of the day.",
    dailyLimitReached: "Daily limit reached",
    errorSendingEmail: "Error sending email",
    accountScheduledDeletion: "Your account has been scheduled for deletion. Your data will be erased within 90 days.",
    errorDeletingAccount: "Error deleting account",
  },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: typeof translations.fr;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<Language>("fr");

  useEffect(() => {
    const savedLang = localStorage.getItem("zembo-language") as Language;
    if (savedLang && (savedLang === "fr" || savedLang === "en")) {
      setLanguageState(savedLang);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("zembo-language", lang);
  };

  const t = translations[language];

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};

export default LanguageContext;
