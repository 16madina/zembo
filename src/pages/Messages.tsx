import { MessageCircle } from "lucide-react";
import ZemboLogo from "@/components/ZemboLogo";
import BottomNavigation from "@/components/BottomNavigation";

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
}

const mockConversations: Conversation[] = [
  {
    id: "1",
    user: {
      name: "Sophie",
      photo: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
      isOnline: true
    },
    lastMessage: "On se retrouve où demain ?",
    time: "14:32",
    unread: 2
  },
  {
    id: "2",
    user: {
      name: "Emma",
      photo: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop",
      isOnline: false
    },
    lastMessage: "Super, j'ai hâte d'y être ! 😊",
    time: "Hier",
    unread: 0
  },
  {
    id: "3",
    user: {
      name: "Léa",
      photo: "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=100&h=100&fit=crop",
      isOnline: true
    },
    lastMessage: "Tu fais quoi ce weekend ?",
    time: "Lun",
    unread: 1
  }
];

const Messages = () => {
  return (
    <div className="min-h-screen pb-24">
      <header className="flex items-center justify-center px-6 py-4">
        <ZemboLogo />
      </header>

      <div className="px-6 mb-4">
        <h2 className="text-xl font-bold text-foreground">Messages</h2>
        <p className="text-sm text-muted-foreground">Vos conversations</p>
      </div>

      {mockConversations.length > 0 ? (
        <div className="px-4 space-y-2">
          {mockConversations.map((conv) => (
            <div
              key={conv.id}
              className="flex items-center gap-4 p-4 bg-card rounded-2xl cursor-pointer transition-colors hover:bg-secondary"
            >
              <div className="relative">
                <img
                  src={conv.user.photo}
                  alt={conv.user.name}
                  className="w-14 h-14 rounded-full object-cover"
                />
                {conv.user.isOnline && (
                  <span className="absolute bottom-0 right-0 w-4 h-4 bg-success border-2 border-card rounded-full" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-semibold text-foreground">{conv.user.name}</h3>
                  <span className="text-xs text-muted-foreground">{conv.time}</span>
                </div>
                <p className="text-sm text-muted-foreground truncate">{conv.lastMessage}</p>
              </div>
              {conv.unread > 0 && (
                <span className="w-6 h-6 flex items-center justify-center bg-primary text-primary-foreground text-xs font-bold rounded-full">
                  {conv.unread}
                </span>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center mt-20">
          <div className="w-20 h-20 mb-6 rounded-full bg-muted flex items-center justify-center">
            <MessageCircle className="w-10 h-10 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">Pas encore de messages</h3>
          <p className="text-muted-foreground">Vos conversations apparaîtront ici</p>
        </div>
      )}

      <BottomNavigation />
    </div>
  );
};

export default Messages;
