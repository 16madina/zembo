import { Shuffle } from "lucide-react";
import ZemboLogo from "@/components/ZemboLogo";
import BottomNavigation from "@/components/BottomNavigation";

const Random = () => {
  return (
    <div className="min-h-screen pb-24 flex flex-col">
      <header className="flex items-center justify-center px-6 py-4">
        <ZemboLogo />
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <div className="w-24 h-24 mb-6 rounded-full bg-primary/20 flex items-center justify-center">
          <Shuffle className="w-12 h-12 text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Rencontre Aléatoire</h1>
        <p className="text-muted-foreground mb-8 max-w-sm">
          Lancez une rencontre vidéo aléatoire avec quelqu'un qui partage vos centres d'intérêt
        </p>
        <button className="px-8 py-4 btn-gold rounded-2xl font-semibold text-primary-foreground transition-transform hover:scale-105">
          Lancer une rencontre
        </button>
      </div>

      <BottomNavigation />
    </div>
  );
};

export default Random;
