import { useMemo } from "react";
import { motion } from "framer-motion";

interface ProfileCompletionRingProps {
  profile: {
    display_name: string | null;
    avatar_url: string | null;
    bio: string | null;
    age: number | null;
    gender: string | null;
    location: string | null;
    occupation: string | null;
    education: string | null;
    height: string | null;
    interests: string[] | null;
    is_verified: boolean | null;
    email_verified: boolean | null;
  } | null;
  photos: string[];
  avatarUrl: string;
  displayName: string;
  children?: React.ReactNode;
}

interface CompletionItem {
  label: string;
  completed: boolean;
  weight: number;
}

const ProfileCompletionRing = ({
  profile,
  photos,
  avatarUrl,
  displayName,
  children,
}: ProfileCompletionRingProps) => {
  const { percentage, items, completedCount, totalCount } = useMemo(() => {
    const completionItems: CompletionItem[] = [
      // Photos (important)
      { label: "Photo de profil", completed: photos.length > 0, weight: 15 },
      // Basic info
      { label: "Nom d'affichage", completed: !!profile?.display_name, weight: 10 },
      { label: "Bio", completed: !!profile?.bio && profile.bio.length > 10, weight: 10 },
      { label: "Genre", completed: !!profile?.gender, weight: 8 },
      { label: "Âge", completed: !!profile?.age, weight: 8 },
      { label: "Localisation", completed: !!profile?.location, weight: 5 },
      // Extended info
      { label: "Profession", completed: !!profile?.occupation, weight: 5 },
      { label: "Études", completed: !!profile?.education, weight: 5 },
      { label: "Taille", completed: !!profile?.height, weight: 4 },
      { label: "Centres d'intérêt", completed: (profile?.interests?.length || 0) >= 3, weight: 10 },
      // Verifications (very important)
      { label: "Vérification faciale", completed: !!profile?.is_verified, weight: 10 },
      { label: "Email vérifié", completed: !!profile?.email_verified, weight: 10 },
    ];

    const totalWeight = completionItems.reduce((sum, item) => sum + item.weight, 0);
    const completedWeight = completionItems
      .filter((item) => item.completed)
      .reduce((sum, item) => sum + item.weight, 0);
    
    const pct = Math.round((completedWeight / totalWeight) * 100);
    const completed = completionItems.filter((item) => item.completed).length;
    const total = completionItems.length;

    return { percentage: pct, items: completionItems, completedCount: completed, totalCount: total };
  }, [profile, photos]);

  // SVG circle properties
  const size = 176; // w-44 h-44 = 176px (slightly larger than avatar for ring)
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  // Determine ring color based on percentage
  const getRingColor = () => {
    if (percentage === 100) return "hsl(142, 76%, 36%)"; // Green - success
    if (percentage >= 75) return "hsl(45, 93%, 47%)"; // Yellow/gold
    if (percentage >= 50) return "hsl(25, 95%, 53%)"; // Orange
    return "hsl(0, 84%, 60%)"; // Red
  };

  const ringColor = getRingColor();

  return (
    <div className="relative">
      {/* SVG Progress Ring */}
      <svg
        width={size}
        height={size}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--muted) / 0.3)"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={ringColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
        />
      </svg>

      {/* Avatar container */}
      <div className="w-40 h-40 rounded-full p-1 bg-gradient-to-b from-primary/20 to-primary/5 relative">
        <img
          src={avatarUrl}
          alt={displayName}
          className="w-full h-full rounded-full object-cover border-4 border-background"
        />
      </div>

      {/* Percentage badge */}
      <motion.div
        className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold shadow-lg"
        style={{
          backgroundColor: ringColor,
          color: percentage >= 75 ? "hsl(0, 0%, 10%)" : "white",
        }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        {percentage}%
      </motion.div>

      {/* Camera button passed as children */}
      {children}
    </div>
  );
};

export default ProfileCompletionRing;
