import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, CheckCheck, Check, Loader2, Heart, Lock, Crown, Sparkles } from "lucide-react";
import ZemboLogo from "@/components/ZemboLogo";
import BottomNavigation from "@/components/BottomNavigation";
import ChatView from "@/components/ChatView";
import ProfileModal from "@/components/ProfileModal";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { useSoundEffects } from "@/hooks/useSoundEffects";
import { toast } from "@/hooks/use-toast";
interface Conversation {
  id: string;
  user: {
    name: string;
    photo: string;
    isOnline: boolean;
  };
  lastMessage: string;
  time: string;
  unread: number;
  status: "sent" | "delivered" | "read";
  isTyping: boolean;
}

interface NewMatch {
  id: string;
  name: string;
  photo: string;
  isOnline: boolean;
}

interface LikedByUser {
  id: string;
  name: string;
  photo: string;
  isSuperLike: boolean;
  createdAt: string;
  age?: number;
  location?: string;
  bio?: string;
  interests?: string[];
  isVerified?: boolean;
}

interface SelectedProfile {
  id: string;
  name: string;
  age: number;
  location: string;
  photos: string[];
  bio: string;
  interests: string[];
  isVerified: boolean;
}

interface OpenChatData {
  id: string;
  name: string;
  photo: string;
  isOnline: boolean;
}


const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 }
  }
};

const item = {
  hidden: { opacity: 0, x: -20 },
  show: { opacity: 1, x: 0 }
};

const MessageStatus = ({ status }: { status: Conversation["status"] }) => {
  if (status === "sent") {
    return <Check className="w-3.5 h-3.5 text-muted-foreground" />;
  }
  if (status === "delivered") {
    return <CheckCheck className="w-3.5 h-3.5 text-muted-foreground" />;
  }
  return <CheckCheck className="w-3.5 h-3.5 text-accent" />;
};

const Messages = () => {
  const { user } = useAuth();
  const { isPremium } = useSubscription();
  const { playNotificationSound, playMatchSound } = useSoundEffects();
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [newMatches, setNewMatches] = useState<NewMatch[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [likedByUsers, setLikedByUsers] = useState<LikedByUser[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<SelectedProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<{ type: 'like' | 'match'; name?: string } | null>(null);
  const isFirstLoad = useRef(true);

  // Fetch all data
  const fetchData = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      // Fetch all matches where current user is involved
      const { data: matchesData } = await supabase
        .from("matches")
        .select("*")
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .order("created_at", { ascending: false });

      // Fetch users who liked me but I haven't liked back (for "Who liked me" section)
      const { data: likedByData } = await supabase
        .from("likes")
        .select("liker_id, is_super_like, created_at")
        .eq("liked_id", user.id);

      // Get IDs of users I've already liked
      const { data: myLikesData } = await supabase
        .from("likes")
        .select("liked_id")
        .eq("liker_id", user.id);

      const myLikedIds = new Set(myLikesData?.map(l => l.liked_id) || []);
      
      // Filter to only users I haven't liked back
      const pendingLikes = likedByData?.filter(l => !myLikedIds.has(l.liker_id)) || [];

      if (pendingLikes.length > 0) {
        const likerIds = pendingLikes.map(l => l.liker_id);
        const { data: likerProfiles } = await supabase
          .from("profiles")
          .select("user_id, display_name, avatar_url")
          .in("user_id", likerIds);

        if (likerProfiles) {
          const likedByList: LikedByUser[] = pendingLikes.map(like => {
            const profile = likerProfiles.find(p => p.user_id === like.liker_id);
            return {
              id: like.liker_id,
              name: profile?.display_name || "Utilisateur",
              photo: profile?.avatar_url || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop",
              isSuperLike: like.is_super_like,
              createdAt: like.created_at,
            };
          });
          setLikedByUsers(likedByList);
        }
      } else {
        setLikedByUsers([]);
      }

      if (matchesData) {
        // Get the other user's ID for each match
        const otherUserIds = matchesData.map(match =>
          match.user1_id === user.id ? match.user2_id : match.user1_id
        );

        // Fetch profiles for matched users
        if (otherUserIds.length > 0) {
          const { data: profilesData } = await supabase
            .from("profiles")
            .select("user_id, display_name, avatar_url, is_online")
            .in("user_id", otherUserIds);

          if (profilesData) {
            // Get the last message for each conversation
            const conversationsWithMessages: Conversation[] = [];
            const newMatchesList: NewMatch[] = [];

            for (const match of matchesData) {
              const otherUserId = match.user1_id === user.id ? match.user2_id : match.user1_id;
              const profile = profilesData.find(p => p.user_id === otherUserId);

              if (profile) {
                // Get last message between users
                const { data: lastMessageData } = await supabase
                  .from("messages")
                  .select("*")
                  .or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`)
                  .order("created_at", { ascending: false })
                  .limit(1);

                // Count unread messages
                const { count: unreadCount } = await supabase
                  .from("messages")
                  .select("*", { count: "exact", head: true })
                  .eq("sender_id", otherUserId)
                  .eq("receiver_id", user.id)
                  .eq("is_read", false);

                const lastMessage = lastMessageData?.[0];

                if (lastMessage) {
                  // Has messages - add to conversations
                  const date = new Date(lastMessage.created_at);
                  const now = new Date();
                  const isToday = date.toDateString() === now.toDateString();
                  const isYesterday = new Date(now.getTime() - 86400000).toDateString() === date.toDateString();
                  
                  let timeString = "";
                  if (isToday) {
                    timeString = date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
                  } else if (isYesterday) {
                    timeString = "Hier";
                  } else {
                    timeString = date.toLocaleDateString("fr-FR", { weekday: "short" });
                  }

                  conversationsWithMessages.push({
                    id: otherUserId,
                    user: {
                      name: profile.display_name || "Utilisateur",
                      photo: profile.avatar_url || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop",
                      isOnline: profile.is_online || false,
                    },
                    lastMessage: lastMessage.content || (lastMessage.image_url ? "📷 Photo" : lastMessage.audio_url ? "🎤 Message vocal" : ""),
                    time: timeString,
                    unread: unreadCount || 0,
                    status: lastMessage.sender_id === user.id ? (lastMessage.is_read ? "read" : "delivered") : "read",
                    isTyping: false,
                  });
                } else {
                  // No messages yet - new match
                  newMatchesList.push({
                    id: otherUserId,
                    name: profile.display_name || "Utilisateur",
                    photo: profile.avatar_url || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop",
                    isOnline: profile.is_online || false,
                  });
                }
              }
            }

            setConversations(conversationsWithMessages);
            setNewMatches(newMatchesList);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching messages data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Real-time subscriptions for matches, messages, and likes
  useEffect(() => {
    if (!user) return;

    // Helper to fetch profile name
    const fetchProfileName = async (userId: string): Promise<string> => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("user_id", userId)
        .single();
      return data?.display_name || "Quelqu'un";
    };

    // Subscribe to new matches
    const matchesChannel = supabase
      .channel("realtime-matches")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "matches",
        },
        async (payload) => {
          const newMatch = payload.new as { user1_id: string; user2_id: string };
          // Check if current user is part of this match
          if (newMatch.user1_id === user.id || newMatch.user2_id === user.id) {
            console.log("New match detected!", newMatch);
            
            // Only play sound/show notification after initial load
            if (!isFirstLoad.current) {
              const otherUserId = newMatch.user1_id === user.id ? newMatch.user2_id : newMatch.user1_id;
              const name = await fetchProfileName(otherUserId);
              
              playMatchSound();
              setNotification({ type: 'match', name });
              
              toast({
                title: "🎉 Nouveau Match !",
                description: `Vous avez matché avec ${name} !`,
              });
              
              setTimeout(() => setNotification(null), 3000);
            }
            
            fetchData(); // Refresh all data
          }
        }
      )
      .subscribe();

    // Subscribe to new messages (for unread count and last message updates)
    const messagesChannel = supabase
      .channel("realtime-messages-list")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const newMessage = payload.new as { sender_id: string; receiver_id: string };
          // Check if current user is part of this conversation
          if (newMessage.sender_id === user.id || newMessage.receiver_id === user.id) {
            console.log("New message detected!", newMessage);
            fetchData(); // Refresh to update last message and unread count
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const updatedMessage = payload.new as { sender_id: string; receiver_id: string };
          if (updatedMessage.sender_id === user.id || updatedMessage.receiver_id === user.id) {
            fetchData(); // Refresh for read status updates
          }
        }
      )
      .subscribe();

    // Subscribe to new likes (for "Who liked me" section)
    const likesChannel = supabase
      .channel("realtime-likes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "likes",
        },
        async (payload) => {
          const newLike = payload.new as { liker_id: string; liked_id: string };
          // Someone liked me
          if (newLike.liked_id === user.id) {
            console.log("Someone liked me!", newLike);
            
            // Only play sound/show notification after initial load
            if (!isFirstLoad.current) {
              const name = await fetchProfileName(newLike.liker_id);
              
              playNotificationSound();
              setNotification({ type: 'like', name });
              
              toast({
                title: "❤️ Nouveau Like !",
                description: `${name} vous a liké !`,
              });
              
              setTimeout(() => setNotification(null), 3000);
            }
            
            fetchData(); // Refresh to show in "Who liked me"
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "likes",
        },
        () => {
          fetchData(); // Refresh when likes are removed
        }
      )
      .subscribe();

    // Mark initial load as complete after a delay
    const timer = setTimeout(() => {
      isFirstLoad.current = false;
    }, 2000);

    return () => {
      clearTimeout(timer);
      supabase.removeChannel(matchesChannel);
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(likesChannel);
    };
  }, [user, fetchData, playNotificationSound, playMatchSound]);

  // Check for notification deep link on mount
  useEffect(() => {
    const openChatData = sessionStorage.getItem("openChatWith");
    if (openChatData) {
      try {
        const chatData: OpenChatData = JSON.parse(openChatData);
        sessionStorage.removeItem("openChatWith");
        
        // Create a conversation object from the notification data
        const conversation: Conversation = {
          id: chatData.id,
          user: {
            name: chatData.name,
            photo: chatData.photo || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop",
            isOnline: chatData.isOnline,
          },
          lastMessage: "",
          time: "",
          unread: 0,
          status: "read",
          isTyping: false,
        };
        
        setSelectedConversation(conversation);
      } catch (e) {
        console.error("Error parsing openChatWith data:", e);
      }
    }
  }, []);

  const handleOpenChat = (conv: Conversation) => {
    setSelectedConversation(conv);
  };

  const handleCloseChat = () => {
    setSelectedConversation(null);
    // Refresh data when closing chat to update read status
    fetchData();
  };

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden pt-[env(safe-area-inset-top)] pb-[calc(88px+env(safe-area-inset-bottom))]">
      {/* Notification Animation Overlay */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -100, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="fixed top-[env(safe-area-inset-top)] left-0 right-0 z-50 flex justify-center px-4 pt-4"
          >
            <motion.div
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl shadow-lg backdrop-blur-md ${
                notification.type === 'match' 
                  ? 'bg-gradient-to-r from-primary/90 to-accent/90' 
                  : 'bg-gradient-to-r from-destructive/90 to-pink-500/90'
              }`}
              animate={{ 
                boxShadow: [
                  "0 0 20px 0 rgba(var(--primary), 0.3)",
                  "0 0 40px 10px rgba(var(--primary), 0.5)",
                  "0 0 20px 0 rgba(var(--primary), 0.3)",
                ]
              }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              {notification.type === 'match' ? (
                <>
                  <motion.div
                    animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.2, 1] }}
                    transition={{ duration: 0.5, repeat: 2 }}
                  >
                    <Sparkles className="w-6 h-6 text-white" />
                  </motion.div>
                  <span className="text-white font-bold text-lg">Match avec {notification.name} !</span>
                  <motion.div
                    animate={{ rotate: [0, -10, 10, 0], scale: [1, 1.2, 1] }}
                    transition={{ duration: 0.5, repeat: 2 }}
                  >
                    <Sparkles className="w-6 h-6 text-white" />
                  </motion.div>
                </>
              ) : (
                <>
                  <motion.div
                    animate={{ scale: [1, 1.3, 1] }}
                    transition={{ duration: 0.6, repeat: 2 }}
                  >
                    <Heart className="w-6 h-6 text-white fill-white" />
                  </motion.div>
                  <span className="text-white font-bold text-lg">{notification.name} vous a liké !</span>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fixed Header */}
      <motion.header 
        className="flex items-center justify-between px-4 md:px-8 py-3 flex-shrink-0 max-w-4xl md:mx-auto w-full"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <ZemboLogo />
        <div className="w-8" />
      </motion.header>

      <motion.div 
        className="px-4 md:px-8 mb-4 flex-shrink-0 max-w-4xl md:mx-auto w-full"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <h1 className="text-2xl font-bold text-foreground">Messages</h1>
        <p className="text-sm text-muted-foreground">{conversations.length + newMatches.length} matchs</p>
      </motion.div>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain max-w-4xl md:mx-auto w-full">
        
        {/* Who Liked Me Section */}
        {likedByUsers.length > 0 && (
          <motion.div
            className="px-4 md:px-8 mb-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Heart className="w-4 h-4 text-destructive fill-destructive" />
              <h3 className="text-sm font-medium text-muted-foreground">
                Qui m'a liké ({likedByUsers.length})
              </h3>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
              {likedByUsers.map((likedBy) => (
                <motion.button
                  key={likedBy.id}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedProfile({
                    id: likedBy.id,
                    name: likedBy.name,
                    age: likedBy.age || 25,
                    location: likedBy.location || "France",
                    photos: [likedBy.photo],
                    bio: "",
                    interests: [],
                    isVerified: false
                  })}
                  className="flex flex-col items-center gap-1.5 flex-shrink-0"
                >
                  <div className="relative">
                    <div className={`w-16 h-16 rounded-full p-0.5 ${likedBy.isSuperLike ? 'bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600' : 'bg-gradient-to-br from-destructive via-destructive/80 to-destructive/60'}`}>
                      <div className="relative w-full h-full">
                        <img
                          src={likedBy.photo}
                          alt={likedBy.name}
                          className="w-full h-full rounded-full object-cover border-2 border-background"
                        />
                      </div>
                    </div>
                    {likedBy.isSuperLike && (
                      <span className="absolute -top-1 -right-1 text-lg">⭐</span>
                    )}
                  </div>
                  <span className="text-xs font-medium text-foreground">
                    {likedBy.name}
                  </span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {/* New Matches Section */}
        {newMatches.length > 0 && (
          <motion.div
            className="px-4 md:px-8 mb-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Nouveaux matchs</h3>
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
              {newMatches.map((match) => (
                <motion.button
                  key={match.id}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleOpenChat({
                    id: match.id,
                    user: { name: match.name, photo: match.photo, isOnline: match.isOnline },
                    lastMessage: "",
                    time: "",
                    unread: 0,
                    status: "sent",
                    isTyping: false
                  })}
                  className="flex flex-col items-center gap-1.5 flex-shrink-0"
                >
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full p-0.5 bg-gradient-to-br from-primary via-primary/80 to-primary/60">
                      <img
                        src={match.photo}
                        alt={match.name}
                        className="w-full h-full rounded-full object-cover border-2 border-background"
                      />
                    </div>
                    {match.isOnline && (
                      <span className="absolute bottom-0 right-0 w-4 h-4 bg-success border-[3px] border-background rounded-full" />
                    )}
                  </div>
                  <span className="text-xs font-medium text-foreground">{match.name}</span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Conversations Section */}
        <motion.div 
          className="px-4 md:px-8 mb-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <h3 className="text-sm font-medium text-muted-foreground">Conversations</h3>
        </motion.div>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : conversations.length > 0 ? (
          <motion.div 
            className="px-4 md:px-8 space-y-2 md:space-y-3 pb-4"
            variants={container}
            initial="hidden"
            animate="show"
          >
            {conversations.map((conv) => (
            <motion.div
              key={conv.id}
              variants={item}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => handleOpenChat(conv)}
              className="flex items-center gap-4 p-4 glass rounded-2xl cursor-pointer transition-colors"
            >
              <div className="relative flex-shrink-0">
                <img
                  src={conv.user.photo}
                  alt={conv.user.name}
                  className="w-14 h-14 rounded-full object-cover"
                />
                {conv.user.isOnline && (
                  <span className="absolute bottom-0 right-0 w-4 h-4 bg-success border-[3px] border-card rounded-full" />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-semibold text-foreground">{conv.user.name}</h3>
                  <span className="text-xs text-muted-foreground">{conv.time}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {conv.unread === 0 && <MessageStatus status={conv.status} />}
                  <p className={`text-sm truncate ${
                    conv.unread > 0 ? "text-foreground font-medium" : "text-muted-foreground"
                  }`}>
                    {conv.isTyping ? (
                      <span className="text-success italic">écrit...</span>
                    ) : (
                      conv.lastMessage
                    )}
                  </p>
                </div>
              </div>
              
              {conv.unread > 0 && (
                <motion.span 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-6 h-6 flex items-center justify-center btn-gold text-primary-foreground text-xs font-bold rounded-full flex-shrink-0"
                >
                  {conv.unread}
                </motion.span>
              )}
            </motion.div>
          ))}
          </motion.div>
        ) : (
          <motion.div 
            className="flex-1 flex flex-col items-center justify-center px-6 text-center py-20"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="w-20 h-20 mb-6 rounded-full glass flex items-center justify-center">
              <MessageCircle className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Pas encore de messages</h3>
            <p className="text-muted-foreground">Vos conversations apparaîtront ici</p>
          </motion.div>
        )}
      </div>

      {/* Chat View */}
      <AnimatePresence>
        {selectedConversation && (
          <ChatView
            user={{
              id: selectedConversation.id,
              name: selectedConversation.user.name,
              photo: selectedConversation.user.photo,
              isOnline: selectedConversation.user.isOnline,
              isTyping: selectedConversation.isTyping,
            }}
            onBack={handleCloseChat}
          />
        )}
      </AnimatePresence>

      {/* Profile Modal for Who Liked Me */}
      <ProfileModal
        isOpen={!!selectedProfile}
        onClose={() => setSelectedProfile(null)}
        profile={selectedProfile}
        onLike={async () => {
          if (selectedProfile && user) {
            // Add a like back - this will create a match since they already liked us
            const { error } = await supabase
              .from("likes")
              .insert({ liker_id: user.id, liked_id: selectedProfile.id });
            
            if (!error) {
              toast({
                title: "C'est un match ! 🎉",
                description: `Vous avez matché avec ${selectedProfile.name}`,
              });
              setSelectedProfile(null);
              fetchData(); // Refresh to move them to matches
            }
          }
        }}
        onSuperLike={async () => {
          if (selectedProfile && user) {
            const { error } = await supabase
              .from("likes")
              .insert({ liker_id: user.id, liked_id: selectedProfile.id, is_super_like: true });
            
            if (!error) {
              toast({
                title: "Super Like envoyé ! ⭐",
                description: `Vous avez matché avec ${selectedProfile.name}`,
              });
              setSelectedProfile(null);
              fetchData();
            }
          }
        }}
      />

      <BottomNavigation />
    </div>
  );
};

export default Messages;
