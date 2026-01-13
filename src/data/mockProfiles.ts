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
    name: "Amara",
    age: 24,
    gender: "female",
    location: "Abidjan, Côte d'Ivoire",
    distance: "2 km",
    bio: "Mannequin et passionnée de mode africaine 👗 J'adore mettre en valeur notre culture à travers mes tenues. À la recherche d'une belle connexion !",
    photos: [
      "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=600&h=800&fit=crop",
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&h=800&fit=crop",
      "https://images.unsplash.com/photo-1524638431109-93d95c968f03?w=600&h=800&fit=crop"
    ],
    isOnline: true,
    isVerified: true,
    interests: ["Mode", "Photographie", "Voyage", "Art", "Danse"]
  },
  {
    id: "2",
    name: "Fatou",
    age: 26,
    gender: "female",
    location: "Dakar, Sénégal",
    distance: "5 km",
    bio: "Entrepreneuse dans la beauté naturelle 💄 Je crois en la puissance de nos cheveux naturels. Cherche quelqu'un d'ambitieux et authentique !",
    photos: [
      "https://images.unsplash.com/photo-1523824921871-d6f1a15151f1?w=600&h=800&fit=crop",
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=600&h=800&fit=crop",
      "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=600&h=800&fit=crop"
    ],
    isOnline: false,
    isVerified: true,
    interests: ["Business", "Beauté", "Yoga", "Cuisine", "Musique"]
  },
  {
    id: "3",
    name: "Aïcha",
    age: 23,
    gender: "female",
    location: "Lagos, Nigeria",
    distance: "3 km",
    bio: "Étudiante en médecine et danseuse 💃 Quand je ne suis pas à l'hôpital, je danse l'afrobeat ! Cherche quelqu'un de fun et motivé.",
    photos: [
      "https://images.unsplash.com/photo-1589156280159-27698a70f29e?w=600&h=800&fit=crop",
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600&h=800&fit=crop",
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&h=800&fit=crop"
    ],
    isOnline: true,
    isVerified: false,
    interests: ["Danse", "Médecine", "Afrobeat", "Sport", "Voyage"]
  },
  {
    id: "4",
    name: "Nadia",
    age: 28,
    gender: "female",
    location: "Casablanca, Maroc",
    distance: "8 km",
    bio: "Architecte d'intérieur passionnée 🏠 J'adore mélanger les styles modernes et traditionnels africains. Viens créer notre histoire !",
    photos: [
      "https://images.unsplash.com/photo-1611432579699-484f7990b127?w=600&h=800&fit=crop",
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=600&h=800&fit=crop",
      "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=600&h=800&fit=crop"
    ],
    isOnline: false,
    isVerified: true,
    interests: ["Design", "Art", "Déco", "Voyage", "Gastronomie"]
  },
  {
    id: "5",
    name: "Zara",
    age: 25,
    gender: "female",
    location: "Kinshasa, RDC",
    distance: "1 km",
    bio: "Chanteuse et compositrice 🎵 La musique coule dans mes veines. Si tu aimes les soirées karaoké et les couchers de soleil, on va s'entendre !",
    photos: [
      "https://images.unsplash.com/photo-1595152772835-219674b2a8a6?w=600&h=800&fit=crop",
      "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=600&h=800&fit=crop",
      "https://images.unsplash.com/photo-1485875437342-9b39470b3d95?w=600&h=800&fit=crop"
    ],
    isOnline: true,
    isVerified: true,
    interests: ["Musique", "Chant", "Studio", "Concert", "Aventure"]
  },
  {
    id: "6",
    name: "Kofi",
    age: 27,
    gender: "male",
    location: "Accra, Ghana",
    distance: "3 km",
    bio: "Entrepreneur tech et passionné de fitness 💪 Je construis des startups le jour et je m'entraîne le soir. Cherche une partenaire ambitieuse !",
    photos: [
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=800&fit=crop",
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=600&h=800&fit=crop",
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=600&h=800&fit=crop"
    ],
    isOnline: true,
    isVerified: true,
    interests: ["Tech", "Fitness", "Business", "Voyage", "Cuisine"]
  },
  {
    id: "7",
    name: "Mamadou",
    age: 29,
    gender: "male",
    location: "Dakar, Sénégal",
    distance: "6 km",
    bio: "Photographe professionnel 📸 Je capture la beauté de l'Afrique à travers mon objectif. Fan de jazz et de bonne cuisine sénégalaise !",
    photos: [
      "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=600&h=800&fit=crop",
      "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=600&h=800&fit=crop",
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=600&h=800&fit=crop"
    ],
    isOnline: false,
    isVerified: true,
    interests: ["Photo", "Jazz", "Thiéboudienne", "Art", "Voyage"]
  },
  {
    id: "8",
    name: "Ibrahim",
    age: 25,
    gender: "male",
    location: "Abidjan, Côte d'Ivoire",
    distance: "2 km",
    bio: "Footballeur semi-pro et coach ⚽ Le sport c'est ma vie ! Toujours partant pour une partie de foot ou une session running. Tu viens ?",
    photos: [
      "https://images.unsplash.com/photo-1504257432389-52343af06ae3?w=600&h=800&fit=crop",
      "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=600&h=800&fit=crop",
      "https://images.unsplash.com/photo-1548372290-8d01b6c8e78c?w=600&h=800&fit=crop"
    ],
    isOnline: true,
    isVerified: false,
    interests: ["Football", "Running", "Coaching", "Healthy", "Musique"]
  },
  {
    id: "9",
    name: "Youssef",
    age: 31,
    gender: "male",
    location: "Marrakech, Maroc",
    distance: "4 km",
    bio: "Chef cuisinier spécialisé en fusion afro-méditerranéenne 🍽️ Je mélange les saveurs du continent. Viens goûter à mes créations !",
    photos: [
      "https://images.unsplash.com/photo-1463453091185-61582044d556?w=600&h=800&fit=crop",
      "https://images.unsplash.com/photo-1480455624313-e29b44bbfde1?w=600&h=800&fit=crop",
      "https://images.unsplash.com/photo-1507591064344-4c6ce005b128?w=600&h=800&fit=crop"
    ],
    isOnline: false,
    isVerified: true,
    interests: ["Cuisine", "Gastronomie", "Épices", "Voyage", "Culture"]
  },
  {
    id: "10",
    name: "Sékou",
    age: 24,
    gender: "male",
    location: "Conakry, Guinée",
    distance: "1 km",
    bio: "Musicien et producteur 🎹 Le djembé et l'afrobeat sont mon langage. Cherche une âme sœur qui vibre avec la musique !",
    photos: [
      "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=600&h=800&fit=crop",
      "https://images.unsplash.com/photo-1488161628813-04466f0be7a4?w=600&h=800&fit=crop",
      "https://images.unsplash.com/photo-1501196354995-cbb51c65adc8?w=600&h=800&fit=crop"
    ],
    isOnline: true,
    isVerified: true,
    interests: ["Musique", "Djembé", "Afrobeat", "Studio", "Concerts"]
  }
];
