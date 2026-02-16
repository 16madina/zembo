// Gender type matching database values
export type GenderType = 'homme' | 'femme' | 'homme_gay' | 'femme_lesbienne' | 'non_binaire' | 'autre_lgbt';

export interface Profile {
  id: string;
  name: string;
  age: number;
  gender: GenderType;
  location: string;
  distance: string;
  bio: string;
  photos: string[];
  isOnline: boolean;
  isVerified: boolean;
  interests: string[];
  lookingFor?: string[];
}

export const mockProfiles: Profile[] = [
  {
    id: "demo-4photos",
    name: "Lina",
    age: 26,
    gender: "femme",
    location: "Paris, France",
    distance: "1 km",
    bio: "📸 Profil démo avec 4 photos pour tester la navigation ! Swipe ou tape sur les côtés pour voir les photos suivantes.",
    photos: [
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=600&h=800&fit=crop",
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&h=800&fit=crop",
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&h=800&fit=crop",
      "https://images.unsplash.com/photo-1488716820095-cbe80883c496?w=600&h=800&fit=crop"
    ],
    isOnline: true,
    isVerified: true,
    interests: ["Test", "Navigation", "Swipe", "Photos"]
  },
  {
    id: "1",
    name: "Amara",
    age: 24,
    gender: "femme",
    location: "Abidjan, Côte d'Ivoire",
    distance: "2 km",
    bio: "Mannequin et passionnée de mode africaine 👗 J'adore mettre en valeur notre culture à travers mes tenues. À la recherche d'une belle connexion !",
    photos: [
      "https://images.unsplash.com/photo-1523824921871-d6f1a15151f1?w=600&h=800&fit=crop",
      "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=600&h=800&fit=crop",
      "https://images.unsplash.com/photo-1589156280159-27698a70f29e?w=600&h=800&fit=crop"
    ],
    isOnline: true,
    isVerified: true,
    interests: ["Mode", "Photographie", "Voyage", "Art", "Danse"]
  },
  {
    id: "2",
    name: "Fatou",
    age: 26,
    gender: "femme",
    location: "Dakar, Sénégal",
    distance: "5 km",
    bio: "Entrepreneuse dans la beauté naturelle 💄 Je crois en la puissance de nos cheveux naturels. Cherche quelqu'un d'ambitieux et authentique !",
    photos: [
      "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=600&h=800&fit=crop",
      "https://images.unsplash.com/photo-1618375531912-867984bdfd87?w=600&h=800&fit=crop",
      "https://images.unsplash.com/photo-1611432579699-484f7990b127?w=600&h=800&fit=crop"
    ],
    isOnline: false,
    isVerified: true,
    interests: ["Business", "Beauté", "Yoga", "Cuisine", "Musique"]
  },
  {
    id: "3",
    name: "Aïcha",
    age: 23,
    gender: "femme",
    location: "Lagos, Nigeria",
    distance: "3 km",
    bio: "Étudiante en médecine et danseuse 💃 Quand je ne suis pas à l'hôpital, je danse l'afrobeat ! Cherche quelqu'un de fun et motivé.",
    photos: [
      "https://images.unsplash.com/photo-1589156280159-27698a70f29e?w=600&h=800&fit=crop",
      "https://images.unsplash.com/photo-1614252369475-531eba835eb1?w=600&h=800&fit=crop",
      "https://images.unsplash.com/photo-1523824921871-d6f1a15151f1?w=600&h=800&fit=crop"
    ],
    isOnline: true,
    isVerified: false,
    interests: ["Danse", "Médecine", "Afrobeat", "Sport", "Voyage"]
  },
  {
    id: "4",
    name: "Nadia",
    age: 28,
    gender: "femme",
    location: "Casablanca, Maroc",
    distance: "8 km",
    bio: "Architecte d'intérieur passionnée 🏠 J'adore mélanger les styles modernes et traditionnels africains. Viens créer notre histoire !",
    photos: [
      "https://images.unsplash.com/photo-1618375531912-867984bdfd87?w=600&h=800&fit=crop",
      "https://images.unsplash.com/photo-1611432579699-484f7990b127?w=600&h=800&fit=crop",
      "https://images.unsplash.com/photo-1616091216791-a5360b5fc78a?w=600&h=800&fit=crop"
    ],
    isOnline: false,
    isVerified: true,
    interests: ["Design", "Art", "Déco", "Voyage", "Gastronomie"]
  },
  {
    id: "5",
    name: "Zara",
    age: 25,
    gender: "femme",
    location: "Kinshasa, RDC",
    distance: "1 km",
    bio: "Chanteuse et compositrice 🎵 La musique coule dans mes veines. Si tu aimes les soirées karaoké et les couchers de soleil, on va s'entendre !",
    photos: [
      "https://images.unsplash.com/photo-1614252369475-531eba835eb1?w=600&h=800&fit=crop",
      "https://images.unsplash.com/photo-1616091216791-a5360b5fc78a?w=600&h=800&fit=crop",
      "https://images.unsplash.com/photo-1589156280159-27698a70f29e?w=600&h=800&fit=crop"
    ],
    isOnline: true,
    isVerified: true,
    interests: ["Musique", "Chant", "Studio", "Concert", "Aventure"]
  },
  {
    id: "6",
    name: "Kofi",
    age: 27,
    gender: "homme",
    location: "Accra, Ghana",
    distance: "3 km",
    bio: "Entrepreneur tech et passionné de fitness 💪 Je construis des startups le jour et je m'entraîne le soir. Cherche une partenaire ambitieuse !",
    photos: [
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=800&fit=crop&q=80",
      "https://images.unsplash.com/photo-1506277886164-e25aa3f4ef7f?w=600&h=800&fit=crop",
      "https://images.unsplash.com/photo-1542178243-bc20204b769f?w=600&h=800&fit=crop"
    ],
    isOnline: true,
    isVerified: true,
    interests: ["Tech", "Fitness", "Business", "Voyage", "Cuisine"]
  },
  {
    id: "7",
    name: "Mamadou",
    age: 29,
    gender: "homme",
    location: "Dakar, Sénégal",
    distance: "6 km",
    bio: "Photographe professionnel 📸 Je capture la beauté de l'Afrique à travers mon objectif. Fan de jazz et de bonne cuisine sénégalaise !",
    photos: [
      "https://images.unsplash.com/photo-1506277886164-e25aa3f4ef7f?w=600&h=800&fit=crop",
      "https://images.unsplash.com/photo-1542178243-bc20204b769f?w=600&h=800&fit=crop",
      "https://images.unsplash.com/photo-1519058082700-08a0b56da9b4?w=600&h=800&fit=crop"
    ],
    isOnline: false,
    isVerified: true,
    interests: ["Photo", "Jazz", "Thiéboudienne", "Art", "Voyage"]
  },
  {
    id: "8",
    name: "Ibrahim",
    age: 25,
    gender: "homme",
    location: "Abidjan, Côte d'Ivoire",
    distance: "2 km",
    bio: "Footballeur semi-pro et coach ⚽ Le sport c'est ma vie ! Toujours partant pour une partie de foot ou une session running. Tu viens ?",
    photos: [
      "https://images.unsplash.com/photo-1519058082700-08a0b56da9b4?w=600&h=800&fit=crop",
      "https://images.unsplash.com/photo-1543357480-c60d40007a3f?w=600&h=800&fit=crop",
      "https://images.unsplash.com/photo-1506277886164-e25aa3f4ef7f?w=600&h=800&fit=crop"
    ],
    isOnline: true,
    isVerified: false,
    interests: ["Football", "Running", "Coaching", "Healthy", "Musique"]
  },
  {
    id: "9",
    name: "Youssef",
    age: 31,
    gender: "homme",
    location: "Marrakech, Maroc",
    distance: "4 km",
    bio: "Chef cuisinier spécialisé en fusion afro-méditerranéenne 🍽️ Je mélange les saveurs du continent. Viens goûter à mes créations !",
    photos: [
      "https://images.unsplash.com/photo-1543357480-c60d40007a3f?w=600&h=800&fit=crop",
      "https://images.unsplash.com/photo-1542178243-bc20204b769f?w=600&h=800&fit=crop",
      "https://images.unsplash.com/photo-1519058082700-08a0b56da9b4?w=600&h=800&fit=crop"
    ],
    isOnline: false,
    isVerified: true,
    interests: ["Cuisine", "Gastronomie", "Épices", "Voyage", "Culture"]
  },
  {
    id: "10",
    name: "Sékou",
    age: 24,
    gender: "homme",
    location: "Conakry, Guinée",
    distance: "1 km",
    bio: "Musicien et producteur 🎹 Le djembé et l'afrobeat sont mon langage. Cherche une âme sœur qui vibre avec la musique !",
    photos: [
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=800&fit=crop",
      "https://images.unsplash.com/photo-1543357480-c60d40007a3f?w=600&h=800&fit=crop",
      "https://images.unsplash.com/photo-1506277886164-e25aa3f4ef7f?w=600&h=800&fit=crop"
    ],
    isOnline: true,
    isVerified: true,
    interests: ["Musique", "Djembé", "Afrobeat", "Studio", "Concerts"]
  },
  // LGBT+ profiles
  {
    id: "11",
    name: "Marc",
    age: 28,
    gender: "homme_gay",
    location: "Paris, France",
    distance: "3 km",
    bio: "Designer UX et amateur de café ☕ J'adore les musées, les films d'auteur et les longues conversations. Cherche un homme sincère et cultivé.",
    photos: [
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=600&h=800&fit=crop",
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=600&h=800&fit=crop",
      "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=600&h=800&fit=crop"
    ],
    isOnline: true,
    isVerified: true,
    interests: ["Design", "Cinéma", "Art", "Café", "Voyage"]
  },
  {
    id: "12",
    name: "Olivier",
    age: 32,
    gender: "homme_gay",
    location: "Lyon, France",
    distance: "5 km",
    bio: "Avocat le jour, chef amateur la nuit 👨‍🍳 Passionné de randonnée et de vin. Cherche quelqu'un pour partager des aventures !",
    photos: [
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=600&h=800&fit=crop",
      "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=600&h=800&fit=crop",
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=600&h=800&fit=crop"
    ],
    isOnline: false,
    isVerified: true,
    interests: ["Cuisine", "Randonnée", "Vin", "Droit", "Nature"]
  },
  {
    id: "13",
    name: "Léa",
    age: 26,
    gender: "femme_lesbienne",
    location: "Bordeaux, France",
    distance: "2 km",
    bio: "Photographe et amoureuse de la nature 🌿 Mes weekends : randonnées, camping et étoiles. Cherche une femme avec qui explorer le monde.",
    photos: [
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=600&h=800&fit=crop",
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600&h=800&fit=crop",
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&h=800&fit=crop"
    ],
    isOnline: true,
    isVerified: true,
    interests: ["Photo", "Nature", "Camping", "Voyage", "Animaux"]
  },
  {
    id: "14",
    name: "Camille",
    age: 29,
    gender: "femme_lesbienne",
    location: "Marseille, France",
    distance: "4 km",
    bio: "Musicienne et prof de yoga 🧘‍♀️ L'équilibre entre l'énergie et la sérénité. Fan de concerts intimistes et de brunchs du dimanche.",
    photos: [
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600&h=800&fit=crop",
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=600&h=800&fit=crop",
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=600&h=800&fit=crop"
    ],
    isOnline: false,
    isVerified: true,
    interests: ["Musique", "Yoga", "Concerts", "Brunch", "Méditation"]
  },
  {
    id: "15",
    name: "Alex",
    age: 25,
    gender: "non_binaire",
    location: "Nantes, France",
    distance: "3 km",
    bio: "Artiste digital et activiste 🎨 Pronoms : iel/elleux. Passionné·e par l'art engagé et les discussions profondes. Cherche des connexions authentiques.",
    photos: [
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&h=800&fit=crop",
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=800&fit=crop",
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=600&h=800&fit=crop"
    ],
    isOnline: true,
    isVerified: true,
    interests: ["Art", "Activisme", "Digital", "Philosophie", "Musique"]
  },
  {
    id: "16",
    name: "Sasha",
    age: 27,
    gender: "non_binaire",
    location: "Toulouse, France",
    distance: "6 km",
    bio: "Développeur·euse et gamer 🎮 Pronoms : iel. Entre deux lignes de code, je speedrun des jeux rétro. Cherche quelqu'un pour du coop !",
    photos: [
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&h=800&fit=crop",
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=600&h=800&fit=crop",
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&h=800&fit=crop"
    ],
    isOnline: true,
    isVerified: false,
    interests: ["Gaming", "Code", "Rétro", "Tech", "Anime"]
  },
  {
    id: "17",
    name: "Jordan",
    age: 30,
    gender: "autre_lgbt",
    location: "Nice, France",
    distance: "2 km",
    bio: "Écrivain·e et voyageur·euse 📚 Fluide dans mon genre et dans ma vie. Chaque jour est une nouvelle page. Tu veux écrire la suite avec moi ?",
    photos: [
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=600&h=800&fit=crop",
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=600&h=800&fit=crop",
      "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=600&h=800&fit=crop"
    ],
    isOnline: false,
    isVerified: true,
    interests: ["Écriture", "Voyage", "Littérature", "Poésie", "Café"]
  },
  {
    id: "18",
    name: "Charlie",
    age: 23,
    gender: "autre_lgbt",
    location: "Strasbourg, France",
    distance: "4 km",
    bio: "Étudiant·e en arts et performeur·euse drag 💅 La scène c'est ma maison ! Cherche quelqu'un qui aime briller autant que moi.",
    photos: [
      "https://images.unsplash.com/photo-1519058082700-08a0b56da9b4?w=600&h=800&fit=crop",
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600&h=800&fit=crop",
      "https://images.unsplash.com/photo-1543357480-c60d40007a3f?w=600&h=800&fit=crop"
    ],
    isOnline: true,
    isVerified: true,
    interests: ["Drag", "Performance", "Art", "Mode", "Fêtes"]
  }
];
