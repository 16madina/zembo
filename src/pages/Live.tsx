import { Video, Users, Radio } from "lucide-react";
import ZemboLogo from "@/components/ZemboLogo";
import BottomNavigation from "@/components/BottomNavigation";

interface LiveStream {
  id: string;
  streamer: {
    name: string;
    photo: string;
  };
  title: string;
  viewers: number;
  tags: string[];
  thumbnail: string;
}

const mockLiveStreams: LiveStream[] = [
  {
    id: "1",
    streamer: {
      name: "Marie",
      photo: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop"
    },
    title: "Soirée chill, venez discuter ! 💬",
    viewers: 234,
    tags: ["#chill", "#discussion"],
    thumbnail: "https://images.unsplash.com/photo-1516321497487-e288fb19713f?w=400&h=300&fit=crop"
  },
  {
    id: "2",
    streamer: {
      name: "Julie",
      photo: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop"
    },
    title: "Live cuisine 🍳 On prépare des crêpes",
    viewers: 156,
    tags: ["#cuisine", "#food"],
    thumbnail: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=300&fit=crop"
  },
  {
    id: "3",
    streamer: {
      name: "Clara",
      photo: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&h=100&fit=crop"
    },
    title: "Q&A - Posez vos questions ! ✨",
    viewers: 89,
    tags: ["#qna", "#discussion"],
    thumbnail: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=300&fit=crop"
  },
  {
    id: "4",
    streamer: {
      name: "Emma",
      photo: "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=100&h=100&fit=crop"
    },
    title: "Musique live 🎸 Reprises acoustiques",
    viewers: 312,
    tags: ["#musique", "#live"],
    thumbnail: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&h=300&fit=crop"
  }
];

const Live = () => {
  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <header className="flex items-center justify-center px-6 py-4">
        <ZemboLogo />
      </header>

      {/* Go Live Button */}
      <div className="px-6 mb-6">
        <button className="w-full py-4 btn-gold rounded-2xl font-semibold flex items-center justify-center gap-3 transition-transform hover:scale-[1.02]">
          <Radio className="w-5 h-5 text-primary-foreground" />
          <span className="text-primary-foreground">Go Live</span>
        </button>
      </div>

      {/* Section Title */}
      <div className="px-6 mb-4">
        <h2 className="text-xl font-bold text-foreground">Lives en cours</h2>
        <p className="text-sm text-muted-foreground">Rejoignez une diffusion</p>
      </div>

      {/* Live Streams Grid */}
      <div className="px-4 grid grid-cols-2 gap-3">
        {mockLiveStreams.map((stream) => (
          <div
            key={stream.id}
            className="relative rounded-2xl overflow-hidden bg-card cursor-pointer transition-transform hover:scale-[1.02]"
          >
            {/* Thumbnail */}
            <div className="relative aspect-[4/5]">
              <img
                src={stream.thumbnail}
                alt={stream.title}
                className="w-full h-full object-cover"
              />
              
              {/* Live Badge */}
              <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2 py-1 bg-destructive rounded-md">
                <span className="w-2 h-2 bg-foreground rounded-full animate-pulse" />
                <span className="text-xs font-bold text-foreground">LIVE</span>
              </div>

              {/* Viewers */}
              <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 bg-background/60 backdrop-blur-sm rounded-md">
                <Users className="w-3 h-3 text-foreground" />
                <span className="text-xs font-medium text-foreground">{stream.viewers}</span>
              </div>

              {/* Gradient Overlay */}
              <div className="absolute bottom-0 left-0 right-0 h-24 overlay-gradient" />

              {/* Streamer Info */}
              <div className="absolute bottom-3 left-3 right-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <img
                    src={stream.streamer.photo}
                    alt={stream.streamer.name}
                    className="w-6 h-6 rounded-full border-2 border-primary"
                  />
                  <span className="text-sm font-semibold text-foreground">
                    {stream.streamer.name}
                  </span>
                </div>
                <p className="text-xs text-foreground/90 line-clamp-2 mb-1.5">
                  {stream.title}
                </p>
                <div className="flex flex-wrap gap-1">
                  {stream.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] px-2 py-0.5 bg-background/40 backdrop-blur-sm rounded-full text-foreground/80"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
};

export default Live;
