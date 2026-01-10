import * as Flags from "country-flag-icons/react/3x2";

interface FlagIconProps {
  countryCode: string;
  className?: string;
}

const FlagIcon = ({ countryCode, className = "w-6 h-4" }: FlagIconProps) => {
  const FlagComponent = Flags[countryCode as keyof typeof Flags];
  
  if (!FlagComponent) {
    return <span className={className}>🌍</span>;
  }
  
  return <FlagComponent className={`${className} rounded-sm object-cover`} />;
};

export default FlagIcon;
