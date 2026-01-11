import { useState } from "react";
import { Radio, Crown } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import ZemboLogo from "@/components/ZemboLogo";
import BottomNavigation from "@/components/BottomNavigation";
import LiveCard from "@/components/live/LiveCard";
import CreateLiveModal from "@/components/live/CreateLiveModal";
import PremiumRequired from "@/components/live/PremiumRequired";
import { useLives } from "@/hooks/useLives";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

const Live = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { lives, loading, canGoLive, createLive } = useLives();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [isCreatingLive, setIsCreatingLive] = useState(false);

  const handleGoLive = () => {
    if (!user) {
      toast.error("Connectez-vous pour lancer un live");
      navigate("/auth");
      return;
    }

    if (canGoLive) {
      setShowCreateModal(true);
    } else {
      setShowPremiumModal(true);
    }
  };

  const handleCreateLive = async (
    title: string,
    description?: string,
    tags?: string[],
    thumbnailUrl?: string
  ) => {
    setIsCreatingLive(true);
    const { data, error } = await createLive(title, description, tags, thumbnailUrl);
    setIsCreatingLive(false);

    if (error) {
      toast.error("Erreur lors de la création du live");
      return;
    }

    if (data) {
      setShowCreateModal(false);
      toast.success("Live lancé avec succès !");
      navigate(`/live/${data.id}`);
    }
  };

  const handleJoinLive = (liveId: string) => {
    navigate(`/live/${liveId}`);
  };

  return (
    <div className="min-h-screen pb-28">
      {/* Header */}
      <motion.header
        className="flex items-center justify-center px-6 py-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <ZemboLogo />
      </motion.header>

      {/* Go Live Button */}
      <motion.div
        className="px-6 mb-6"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <motion.button
          className="w-full py-4 btn-gold rounded-2xl font-semibold flex items-center justify-center gap-3"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleGoLive}
        >
          <div className="relative">
            <Radio className="w-5 h-5 text-primary-foreground" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-destructive rounded-full animate-pulse" />
          </div>
          <span className="text-primary-foreground">Go Live</span>
          {!canGoLive && user && (
            <Crown className="w-4 h-4 text-primary-foreground ml-1" />
          )}
        </motion.button>
      </motion.div>

      {/* Section Title */}
      <motion.div
        className="px-6 mb-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <h2 className="text-xl font-bold text-foreground">Lives en cours</h2>
        <p className="text-sm text-muted-foreground">Rejoignez une diffusion</p>
      </motion.div>

      {/* Live Streams Grid */}
      {loading ? (
        <div className="px-4 grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="aspect-[4/5] rounded-2xl" />
          ))}
        </div>
      ) : lives.length === 0 ? (
        <motion.div
          className="px-6 py-12 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
            <Radio className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Aucun live en cours
          </h3>
          <p className="text-sm text-muted-foreground">
            Soyez le premier à lancer un live !
          </p>
        </motion.div>
      ) : (
        <motion.div
          className="px-4 grid grid-cols-2 gap-3"
          variants={container}
          initial="hidden"
          animate="show"
        >
          {lives.map((live) => (
            <motion.div key={live.id} variants={item}>
              <LiveCard live={live} onClick={() => handleJoinLive(live.id)} />
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Premium Required Modal */}
      {showPremiumModal && (
        <motion.div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={() => setShowPremiumModal(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
          >
            <PremiumRequired
              onUpgrade={() => {
                setShowPremiumModal(false);
                toast.info("Fonctionnalité bientôt disponible !");
              }}
            />
          </motion.div>
        </motion.div>
      )}

      {/* Create Live Modal */}
      <CreateLiveModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreateLive={handleCreateLive}
        isLoading={isCreatingLive}
      />

      <BottomNavigation />
    </div>
  );
};

export default Live;
