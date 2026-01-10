import { Settings, Edit3, BadgeCheck, MapPin, Heart, Star, Image } from "lucide-react";
import ZemboLogo from "@/components/ZemboLogo";
import BottomNavigation from "@/components/BottomNavigation";

const Profile = () => {
  const user = {
    name: "Alex",
    age: 25,
    location: "Paris, France",
    bio: "Passionné de voyages et de nouvelles rencontres. Fan de musique live et de bons restaurants.",
    photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop",
    isVerified: true,
    stats: {
      likes: 156,
      superLikes: 23,
      photos: 6
    },
    interests: ["Voyage", "Musique", "Cuisine", "Sport", "Photo"]
  };

  return (
    <div className="min-h-screen pb-24">
      <header className="flex items-center justify-between px-6 py-4">
        <div className="w-10" />
        <ZemboLogo />
        <button className="p-2.5 bg-card/80 backdrop-blur-sm rounded-xl border border-border transition-colors hover:bg-secondary">
          <Settings className="w-5 h-5 text-muted-foreground" />
        </button>
      </header>

      {/* Profile Card */}
      <div className="px-6 mb-6">
        <div className="relative bg-card rounded-3xl overflow-hidden">
          {/* Photo */}
          <div className="relative aspect-square max-h-[300px]">
            <img
              src={user.photo}
              alt={user.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-0 left-0 right-0 h-24 overlay-gradient" />
            
            {/* Edit Button */}
            <button className="absolute bottom-4 right-4 p-3 btn-gold rounded-full transition-transform hover:scale-110">
              <Edit3 className="w-5 h-5 text-primary-foreground" />
            </button>
          </div>

          {/* Info */}
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground">
                {user.name}, {user.age}
              </h1>
              {user.isVerified && (
                <BadgeCheck className="w-6 h-6 text-primary" />
              )}
            </div>

            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="w-4 h-4" />
              <span>{user.location}</span>
            </div>

            <p className="text-foreground/80">{user.bio}</p>

            {/* Interests */}
            <div className="flex flex-wrap gap-2">
              {user.interests.map((interest) => (
                <span
                  key={interest}
                  className="px-3 py-1.5 bg-secondary text-secondary-foreground rounded-full text-sm font-medium"
                >
                  {interest}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="px-6 grid grid-cols-3 gap-4">
        <div className="bg-card rounded-2xl p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Heart className="w-5 h-5 text-primary" fill="currentColor" />
          </div>
          <p className="text-2xl font-bold text-foreground">{user.stats.likes}</p>
          <p className="text-xs text-muted-foreground">Likes reçus</p>
        </div>
        <div className="bg-card rounded-2xl p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Star className="w-5 h-5 text-accent" fill="currentColor" />
          </div>
          <p className="text-2xl font-bold text-foreground">{user.stats.superLikes}</p>
          <p className="text-xs text-muted-foreground">Super Likes</p>
        </div>
        <div className="bg-card rounded-2xl p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Image className="w-5 h-5 text-success" />
          </div>
          <p className="text-2xl font-bold text-foreground">{user.stats.photos}</p>
          <p className="text-xs text-muted-foreground">Photos</p>
        </div>
      </div>

      <BottomNavigation />
    </div>
  );
};

export default Profile;
