export interface Profile {
  id: string;
  name: string;
  age: number;
  location: string;
  distance: string;
  bio: string;
  photos: string[];
  isOnline: boolean;
  isVerified: boolean;
  interests: string[];
}

export const mockProfiles: Profile[] = [
  {
    id: "1",
    name: "Sophie",
    age: 24,
    location: "Paris, France",
    distance: "2 km",
    bio: "Passionnée de voyage et de photographie 📸 J'adore découvrir de nouveaux cafés et explorer la ville. À la recherche de quelqu'un pour partager des aventures !",
    photos: [
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600&h=800&fit=crop",
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=600&h=800&fit=crop",
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&h=800&fit=crop"
    ],
    isOnline: true,
    isVerified: true,
    interests: ["Voyage", "Photographie", "Café", "Art", "Musique"]
  },
  {
    id: "2",
    name: "Emma",
    age: 26,
    location: "Lyon, France",
    distance: "5 km",
    bio: "Foodie assumée 🍕 Développeuse le jour, chef amateur la nuit. Si tu aimes les bons restos et les discussions profondes, on va s'entendre !",
    photos: [
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&h=800&fit=crop",
      "https://images.unsplash.com/photo-1502823403499-6ccfcf4fb453?w=600&h=800&fit=crop",
      "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=600&h=800&fit=crop"
    ],
    isOnline: false,
    isVerified: true,
    interests: ["Cuisine", "Tech", "Yoga", "Netflix", "Vin"]
  },
  {
    id: "3",
    name: "Léa",
    age: 23,
    location: "Marseille, France",
    distance: "3 km",
    bio: "Sportive dans l'âme 🏃‍♀️ Quand je ne cours pas, je suis probablement à la plage ou en train de lire. Cherche quelqu'un d'actif et positif !",
    photos: [
      "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=600&h=800&fit=crop",
      "https://images.unsplash.com/photo-1496345875659-11f7dd282d1d?w=600&h=800&fit=crop",
      "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&h=800&fit=crop"
    ],
    isOnline: true,
    isVerified: false,
    interests: ["Sport", "Plage", "Lecture", "Healthy", "Voyage"]
  },
  {
    id: "4",
    name: "Camille",
    age: 28,
    location: "Bordeaux, France",
    distance: "8 km",
    bio: "Artiste dans l'âme 🎨 Je peins, je dessine, je crée. La vie est trop courte pour être ordinaire. Viens créer des souvenirs avec moi !",
    photos: [
      "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=600&h=800&fit=crop",
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=800&fit=crop",
      "https://images.unsplash.com/photo-1524638431109-93d95c968f03?w=600&h=800&fit=crop"
    ],
    isOnline: false,
    isVerified: true,
    interests: ["Art", "Musées", "Musique", "Cinéma", "Nature"]
  },
  {
    id: "5",
    name: "Chloé",
    age: 25,
    location: "Nice, France",
    distance: "1 km",
    bio: "Amoureuse de la mer 🌊 Kitesurf, plongée, paddle... Si tu aimes l'océan autant que moi, swipe right ! On pourrait partager un coucher de soleil.",
    photos: [
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=600&h=800&fit=crop",
      "https://images.unsplash.com/photo-1492106087820-71f1a00d2b11?w=600&h=800&fit=crop",
      "https://images.unsplash.com/photo-1485875437342-9b39470b3d95?w=600&h=800&fit=crop"
    ],
    isOnline: true,
    isVerified: true,
    interests: ["Kitesurf", "Plongée", "Beach", "Fitness", "Aventure"]
  }
];
