import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Clock, Users, Gift, TrendingUp, Heart, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import confetti from "canvas-confetti";

interface LiveEndedScreenProps {
  liveId: string;
  streamerId: string;
  streamerName: string | null;
  streamerAvatar: string | null;
  startedAt: string | null;
  endedAt: string | null;
  maxViewers: number;
  isStreamer: boolean;
  onClose?: () => void;
}

interface LiveStats {
  duration: string;
  maxViewers: number;
  totalGifts: number;
  totalCoins: number;
  uniqueGifters: number;
}

const LiveEndedScreen = ({
  liveId,
  streamerId,
  streamerName,
  streamerAvatar,
  startedAt,
  endedAt,
  maxViewers,
  isStreamer,
  onClose,
}: LiveEndedScreenProps) => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<LiveStats>({
    duration: "0:00",
    maxViewers: maxViewers,
    totalGifts: 0,
    totalCoins: 0,
    uniqueGifters: 0,
  });
  const [showStats, setShowStats] = useState(false);
  const [countdown, setCountdown] = useState(10);

  // Calculate duration
  useEffect(() => {
    if (startedAt) {
      const start = new Date(startedAt);
      const end = endedAt ? new Date(endedAt) : new Date();
      const diffMs = end.getTime() - start.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const remainingMins = diffMins % 60;
      
      const durationStr = diffHours > 0 
        ? `${diffHours}h ${remainingMins}min`
        : `${remainingMins} min`;
      
      setStats(prev => ({ ...prev, duration: durationStr }));
    }
  }, [startedAt, endedAt]);

  // Fetch gift stats
  useEffect(() => {
    const fetchGiftStats = async () => {
      const { data: gifts, error } = await supabase
        .from("gift_transactions")
        .select("sender_id, coin_amount")
        .eq("live_id", liveId);

      if (!error && gifts) {
        const totalCoins = gifts.reduce((sum, g) => sum + g.coin_amount, 0);
        const uniqueGifters = new Set(gifts.map(g => g.sender_id)).size;
        
        setStats(prev => ({
          ...prev,
          totalGifts: gifts.length,
          totalCoins,
          uniqueGifters,
        }));
      }
    };

    fetchGiftStats();
  }, [liveId]);

  // Trigger animations
  useEffect(() => {
    // Show stats after a delay
    const timer1 = setTimeout(() => setShowStats(true), 500);

    // Confetti for streamers
    if (isStreamer) {
      const timer2 = setTimeout(() => {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#FFD700', '#FFA500', '#FF6B6B', '#9B59B6'],
        });
      }, 800);
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    }

    return () => clearTimeout(timer1);
  }, [isStreamer]);

  // Countdown for auto-redirect
  useEffect(() => {
    if (countdown <= 0) {
      navigate("/live");
      return;
    }

    const timer = setInterval(() => {
      setCountdown(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown, navigate]);

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      navigate("/live");
    }
  };

  const defaultAvatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${streamerId}`;

  const statItems = [
    {
      icon: Clock,
      label: "Durée",
      value: stats.duration,
      color: "text-blue-400",
      bgColor: "bg-blue-500/20",
    },
    {
      icon: Users,
      label: "Spectateurs max",
      value: stats.maxViewers.toString(),
      color: "text-green-400",
      bgColor: "bg-green-500/20",
    },
    {
      icon: Gift,
      label: "Cadeaux reçus",
      value: stats.totalGifts.toString(),
      color: "text-pink-400",
      bgColor: "bg-pink-500/20",
    },
    {
      icon: TrendingUp,
      label: "Coins gagnés",
      value: stats.totalCoins.toLocaleString(),
      color: "text-yellow-400",
      bgColor: "bg-yellow-500/20",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] bg-gradient-to-b from-black via-gray-900 to-black flex flex-col items-center justify-center p-6"
    >
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ 
              opacity: 0,
              y: Math.random() * 100 - 50,
              x: Math.random() * window.innerWidth,
            }}
            animate={{ 
              opacity: [0, 0.5, 0],
              y: [-20, -200],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
            className="absolute"
          >
            {i % 3 === 0 ? (
              <Heart className="w-4 h-4 text-pink-500/30" />
            ) : i % 3 === 1 ? (
              <Star className="w-4 h-4 text-yellow-500/30" />
            ) : (
              <Gift className="w-4 h-4 text-purple-500/30" />
            )}
          </motion.div>
        ))}
      </div>

      {/* Main content */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, type: "spring", stiffness: 100 }}
        className="flex flex-col items-center max-w-md w-full"
      >
        {/* "LIVE TERMINÉ" badge */}
        <motion.div
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mb-6"
        >
          <div className="relative">
            <motion.div
              animate={{ 
                boxShadow: [
                  "0 0 20px rgba(239, 68, 68, 0.3)",
                  "0 0 40px rgba(239, 68, 68, 0.5)",
                  "0 0 20px rgba(239, 68, 68, 0.3)",
                ]
              }}
              transition={{ duration: 2, repeat: Infinity }}
              className="px-6 py-2 bg-gradient-to-r from-red-600 to-orange-500 rounded-full"
            >
              <span className="text-white font-bold text-lg tracking-wider">
                LIVE TERMINÉ
              </span>
            </motion.div>
          </div>
        </motion.div>

        {/* Streamer avatar with glow */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
          className="relative mb-4"
        >
          <motion.div
            animate={{ 
              scale: [1, 1.1, 1],
              opacity: [0.5, 0.8, 0.5],
            }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute inset-0 bg-gradient-to-r from-primary to-pink-500 rounded-full blur-xl"
          />
          <Avatar className="w-28 h-28 border-4 border-primary relative">
            <AvatarImage src={streamerAvatar || defaultAvatar} />
            <AvatarFallback className="text-3xl bg-primary">
              {streamerName?.[0] || "?"}
            </AvatarFallback>
          </Avatar>
        </motion.div>

        {/* Streamer name */}
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-2xl font-bold text-white mb-2"
        >
          {streamerName || "Streamer"}
        </motion.h2>

        {/* Thank you message */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-white/70 text-center mb-8"
        >
          {isStreamer 
            ? "Merci d'avoir partagé ce moment avec ta communauté ! 🎉"
            : "Merci d'avoir regardé ce live ! 💜"
          }
        </motion.p>

        {/* Stats grid */}
        <AnimatePresence>
          {showStats && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="grid grid-cols-2 gap-4 w-full mb-8"
            >
              {statItems.map((item, index) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 * index }}
                  className={`${item.bgColor} rounded-2xl p-4 flex flex-col items-center`}
                >
                  <item.icon className={`w-6 h-6 ${item.color} mb-2`} />
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 + 0.1 * index }}
                    className="text-2xl font-bold text-white"
                  >
                    {item.value}
                  </motion.span>
                  <span className="text-xs text-white/60">{item.label}</span>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Unique gifters badge (for streamers) */}
        {isStreamer && stats.uniqueGifters > 0 && showStats && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl px-6 py-3 mb-6 flex items-center gap-3"
          >
            <Heart className="w-5 h-5 text-pink-400" />
            <span className="text-white">
              <span className="font-bold">{stats.uniqueGifters}</span> supporter{stats.uniqueGifters > 1 ? "s" : ""} t'ont envoyé des cadeaux
            </span>
          </motion.div>
        )}

        {/* Action button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <Button
            onClick={handleClose}
            size="lg"
            className="bg-gradient-to-r from-primary to-pink-500 hover:from-primary/90 hover:to-pink-500/90 text-white px-8 py-6 rounded-full text-lg shadow-lg"
          >
            {isStreamer ? "Voir les autres lives" : "Découvrir d'autres lives"}
          </Button>

          {/* Countdown */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="text-white/50 text-sm"
          >
            Redirection automatique dans {countdown}s
          </motion.p>
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

export default LiveEndedScreen;
