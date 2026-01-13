import { useState } from "react";
import { Radio } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import ZemboLogo from "@/components/ZemboLogo";
import BottomNavigation from "@/components/BottomNavigation";
import LiveCard from "@/components/live/LiveCard";
import CreateLiveModal from "@/components/live/CreateLiveModal";
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
  const { lives, loading, createLive } = useLives();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreatingLive, setIsCreatingLive] = useState(false);

  const handleGoLive = () => {
    if (!user) {
      toast.error("Connectez-vous pour lancer un live");
      navigate("/auth");
      return;
    }

    // All authenticated users can now create lives
    setShowCreateModal(true);
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
    <div className="fixed inset-0 flex flex-col overflow-hidden pt-[env(safe-area-inset-top)] pb-[calc(88px+env(safe-area-inset-bottom))]">
      {/* Fixed Header */}
      <motion.header
        className="flex items-center justify-center px-6 md:px-8 py-4 flex-shrink-0"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <ZemboLogo />
      </motion.header>

      {/* Fixed Go Live Button */}
      <motion.div
        className="px-6 md:px-8 mb-6 flex-shrink-0 max-w-md md:max-w-lg lg:max-w-xl mx-auto w-full"
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
        </motion.button>
      </motion.div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain">
        {/* Section Title */}
        <motion.div
          className="px-6 md:px-8 mb-4 max-w-6xl mx-auto w-full"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-xl font-bold text-foreground">Lives en cours</h2>
          <p className="text-sm text-muted-foreground">Rejoignez une diffusion</p>
        </motion.div>

        {/* Live Streams Grid */}
        {loading ? (
          <div className="px-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 pb-4 max-w-6xl mx-auto">
            {[1, 2, 3, 4, 5, 6].map((i) => (
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
            className="px-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 pb-4 max-w-6xl mx-auto"
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
      </div>

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
