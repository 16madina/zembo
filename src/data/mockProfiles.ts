export interface Profile {
  id: string;
  name: string;
  age: number;
  gender: 'male' | 'female';
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
    gender: "female",
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
    gender: "female",
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
    gender: "female",
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
    gender: "female",
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
    gender: "female",
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
  },
  {
    id: "6",
    name: "Lucas",
    age: 27,
    gender: "male",
    location: "Paris, France",
    distance: "3 km",
    bio: "Entrepreneur passionné 🚀 J'adore les startups, le sport et les voyages. Toujours partant pour un bon café ou une randonnée le weekend !",
    photos: [
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=600&h=800&fit=crop",
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=600&h=800&fit=crop",
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=800&fit=crop"
    ],
    isOnline: true,
    isVerified: true,
    interests: ["Startup", "Sport", "Voyage", "Café", "Tech"]
  },
  {
    id: "7",
    name: "Thomas",
    age: 29,
    gender: "male",
    location: "Lyon, France",
    distance: "6 km",
    bio: "Musicien et développeur 🎸 Le code le jour, la guitare le soir. Fan de rock et de cuisine italienne. Cherche quelqu'un pour partager des concerts !",
    photos: [
      "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=600&h=800&fit=crop",
      "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=600&h=800&fit=crop",
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=600&h=800&fit=crop"
    ],
    isOnline: false,
    isVerified: true,
    interests: ["Musique", "Code", "Guitare", "Rock", "Cuisine"]
  },
  {
    id: "8",
    name: "Maxime",
    age: 25,
    gender: "male",
    location: "Marseille, France",
    distance: "2 km",
    bio: "Coach sportif et passionné de nature 💪 Running, crossfit, escalade... La vie est trop courte pour rester assis ! Tu viens t'entraîner ?",
    photos: [
      "https://images.unsplash.com/photo-1504257432389-52343af06ae3?w=600&h=800&fit=crop",
      "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=600&h=800&fit=crop",
      "https://images.unsplash.com/photo-1548372290-8d01b6c8e78c?w=600&h=800&fit=crop"
    ],
    isOnline: true,
    isVerified: false,
    interests: ["Fitness", "Running", "Escalade", "Nature", "Healthy"]
  },
  {
    id: "9",
    name: "Antoine",
    age: 31,
    gender: "male",
    location: "Bordeaux, France",
    distance: "4 km",
    bio: "Chef cuisinier et amateur de vin 🍷 Je cuisine, tu dégustes ? Passionné par la gastronomie française et les découvertes culinaires.",
    photos: [
      "https://images.unsplash.com/photo-1463453091185-61582044d556?w=600&h=800&fit=crop",
      "https://images.unsplash.com/photo-1480455624313-e29b44bbfde1?w=600&h=800&fit=crop",
      "https://images.unsplash.com/photo-1507591064344-4c6ce005b128?w=600&h=800&fit=crop"
    ],
    isOnline: false,
    isVerified: true,
    interests: ["Cuisine", "Vin", "Gastronomie", "Voyage", "Art"]
  },
  {
    id: "10",
    name: "Hugo",
    age: 24,
    gender: "male",
    location: "Nice, France",
    distance: "1 km",
    bio: "Photographe et surfeur 📷🏄 Je capture les plus beaux moments entre deux vagues. La mer, c'est ma vie. Tu viens voir le coucher de soleil ?",
    photos: [
      "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=600&h=800&fit=crop",
      "https://images.unsplash.com/photo-1488161628813-04466f0be7a4?w=600&h=800&fit=crop",
      "https://images.unsplash.com/photo-1501196354995-cbb51c65adc8?w=600&h=800&fit=crop"
    ],
    isOnline: true,
    isVerified: true,
    interests: ["Photo", "Surf", "Plage", "Voyage", "Aventure"]
  }
];
