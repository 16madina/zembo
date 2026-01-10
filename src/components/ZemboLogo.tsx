import { Crown } from "lucide-react";

const ZemboLogo = () => {
  return (
    <div className="flex flex-col items-center gap-1">
      <Crown className="w-8 h-8 text-primary" />
      <h1 className="text-2xl font-bold tracking-wider text-gradient-gold">
        ZEMBO
      </h1>
    </div>
  );
};

export default ZemboLogo;
