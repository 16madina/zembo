import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Phone, Video, MoreVertical, Send, Smile, Image, Check, CheckCheck, X } from "lucide-react";
import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";

interface Message {
  id: string;
  text: string;
  image?: string;
  time: string;
  isMe: boolean;
  status: "sent" | "delivered" | "read";
}

interface ChatUser {
  id: string;
  name: string;
  photo: string;
  isOnline: boolean;
  isTyping: boolean;
}

interface ChatViewProps {
  user: ChatUser;
  onBack: () => void;
}

const mockMessages: Message[] = [
  { id: "1", text: "Salut ! Comment tu vas ?", time: "10:30", isMe: false, status: "read" },
  { id: "2", text: "Hey ! Ça va super bien et toi ? 😊", time: "10:32", isMe: true, status: "read" },
  { id: "3", text: "Tu utilises quoi comme appareil photo ?", time: "10:40", isMe: true, status: "read" },
  { id: "4", text: "Un Sony A7III principalement, mais j'aime aussi shooter avec mon iPhone pour le côté spontané", time: "11:00", isMe: false, status: "read" },
  { id: "5", text: "Nice ! Tu fais plutôt portrait ou paysage ?", time: "11:05", isMe: true, status: "read" },
  { id: "6", text: "Un peu des deux mais je préfère le street photography ! Et toi ?", time: "14:30", isMe: false, status: "read" },
];

const ChatView = ({ user, onBack }: ChatViewProps) => {
  const [messages, setMessages] = useState<Message[]>(mockMessages);
  const [newMessage, setNewMessage] = useState("");
  const [isTyping, setIsTyping] = useState(user.isTyping);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Simulate typing indicator
  useEffect(() => {
    const interval = setInterval(() => {
      setIsTyping((prev) => !prev);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showEmojiPicker && emojiButtonRef.current && !emojiButtonRef.current.contains(event.target as Node)) {
        const emojiPicker = document.querySelector('em-emoji-picker');
        if (emojiPicker && !emojiPicker.contains(event.target as Node)) {
          setShowEmojiPicker(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showEmojiPicker]);

  const handleSend = () => {
    if (!newMessage.trim() && !selectedImage) return;

    const message: Message = {
      id: Date.now().toString(),
      text: newMessage,
      image: selectedImage || undefined,
      time: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
      isMe: true,
      status: "sent",
    };

    setMessages((prev) => [...prev, message]);
    setNewMessage("");
    setSelectedImage(null);

    // Simulate message status updates
    setTimeout(() => {
      setMessages((prev) =>
        prev.map((m) => (m.id === message.id ? { ...m, status: "delivered" as const } : m))
      );
    }, 1000);

    setTimeout(() => {
      setMessages((prev) =>
        prev.map((m) => (m.id === message.id ? { ...m, status: "read" as const } : m))
      );
    }, 2500);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleEmojiSelect = (emoji: any) => {
    setNewMessage((prev) => prev + emoji.native);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const MessageStatus = ({ status }: { status: Message["status"] }) => {
    if (status === "sent") {
      return <Check className="w-3.5 h-3.5 text-muted-foreground" />;
    }
    if (status === "delivered") {
      return <CheckCheck className="w-3.5 h-3.5 text-muted-foreground" />;
    }
    return <CheckCheck className="w-3.5 h-3.5 text-accent" />;
  };

  return (
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      className="fixed inset-0 z-50 bg-background flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 glass-strong border-b border-border/50 safe-area-top">
        <div className="flex items-center gap-3">
          <motion.button
            onClick={onBack}
            className="p-2 -ml-2 tap-highlight rounded-full"
            whileTap={{ scale: 0.9 }}
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </motion.button>
          
          <div className="relative">
            <img
              src={user.photo}
              alt={user.name}
              className="w-10 h-10 rounded-full object-cover"
            />
            {user.isOnline && (
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-success border-2 border-card rounded-full" />
            )}
          </div>
          
          <div>
            <h2 className="font-semibold text-foreground">{user.name}</h2>
            <p className="text-xs text-muted-foreground">
              {isTyping ? (
                <span className="text-success">écrit...</span>
              ) : user.isOnline ? (
                "En ligne"
              ) : (
                "Hors ligne"
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <motion.button
            className="p-2.5 tap-highlight rounded-full"
            whileTap={{ scale: 0.9 }}
          >
            <Phone className="w-5 h-5 text-muted-foreground" />
          </motion.button>
          <motion.button
            className="p-2.5 tap-highlight rounded-full"
            whileTap={{ scale: 0.9 }}
          >
            <Video className="w-5 h-5 text-muted-foreground" />
          </motion.button>
          <motion.button
            className="p-2.5 tap-highlight rounded-full"
            whileTap={{ scale: 0.9 }}
          >
            <MoreVertical className="w-5 h-5 text-muted-foreground" />
          </motion.button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 scrollbar-hide">
        <AnimatePresence initial={false}>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.2 }}
              className={`flex ${message.isMe ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] ${
                  message.isMe
                    ? "bg-primary text-primary-foreground rounded-2xl rounded-br-md"
                    : "glass rounded-2xl rounded-bl-md"
                } ${message.image ? "p-1.5" : "px-4 py-2.5"}`}
              >
                {message.image && (
                  <motion.img
                    src={message.image}
                    alt="Shared"
                    className="rounded-xl max-w-full max-h-60 object-cover cursor-pointer"
                    onClick={() => setPreviewImage(message.image!)}
                    whileTap={{ scale: 0.98 }}
                  />
                )}
                {message.text && (
                  <p className={`text-sm leading-relaxed ${message.image ? "px-2.5 pt-2 pb-1" : ""}`}>
                    {message.text}
                  </p>
                )}
                <div className={`flex items-center justify-end gap-1 ${message.image ? "px-2.5 pb-1.5" : "mt-1"} ${
                  message.isMe ? "text-primary-foreground/70" : "text-muted-foreground"
                }`}>
                  <span className="text-[10px]">{message.time}</span>
                  {message.isMe && <MessageStatus status={message.status} />}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing indicator */}
        <AnimatePresence>
          {isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="flex justify-start"
            >
              <div className="glass rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex items-center gap-1">
                  <motion.span
                    className="w-2 h-2 bg-muted-foreground rounded-full"
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 1, repeat: Infinity, delay: 0 }}
                  />
                  <motion.span
                    className="w-2 h-2 bg-muted-foreground rounded-full"
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
                  />
                  <motion.span
                    className="w-2 h-2 bg-muted-foreground rounded-full"
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        <div ref={messagesEndRef} />
      </div>

      {/* Selected Image Preview */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="px-4 py-2 border-t border-border/50"
          >
            <div className="relative inline-block">
              <img
                src={selectedImage}
                alt="Selected"
                className="h-20 rounded-xl object-cover"
              />
              <motion.button
                onClick={() => setSelectedImage(null)}
                className="absolute -top-2 -right-2 p-1 bg-destructive rounded-full"
                whileTap={{ scale: 0.9 }}
              >
                <X className="w-3 h-3 text-destructive-foreground" />
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Emoji Picker */}
      <AnimatePresence>
        {showEmojiPicker && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-20 left-4 right-4 z-10"
          >
            <Picker
              data={data}
              onEmojiSelect={handleEmojiSelect}
              theme="dark"
              locale="fr"
              previewPosition="none"
              skinTonePosition="none"
              maxFrequentRows={2}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input */}
      <div className="px-4 py-3 pb-20 glass-strong border-t border-border/50">
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
          />
          <motion.button
            onClick={() => fileInputRef.current?.click()}
            className="p-2.5 tap-highlight rounded-full glass"
            whileTap={{ scale: 0.9 }}
          >
            <Image className="w-5 h-5 text-muted-foreground" />
          </motion.button>
          
          <div className="flex-1 flex items-center gap-2 glass rounded-full px-4 py-2.5">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Écris ton message..."
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none min-w-0"
            />
            <motion.button
              ref={emojiButtonRef}
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="tap-highlight flex-shrink-0"
              whileTap={{ scale: 0.9 }}
            >
              <Smile className={`w-5 h-5 ${showEmojiPicker ? "text-primary" : "text-muted-foreground"}`} />
            </motion.button>
          </div>

          <motion.button
            onClick={handleSend}
            className={`p-3 rounded-full flex-shrink-0 ${
              newMessage.trim() || selectedImage ? "btn-gold" : "glass"
            }`}
            whileTap={{ scale: 0.9 }}
          >
            <Send className={`w-5 h-5 ${
              newMessage.trim() || selectedImage ? "text-primary-foreground" : "text-muted-foreground"
            }`} />
          </motion.button>
        </div>
      </div>

      {/* Image Preview Modal */}
      <AnimatePresence>
        {previewImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4"
            onClick={() => setPreviewImage(null)}
          >
            <motion.button
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 p-2 glass rounded-full"
              whileTap={{ scale: 0.9 }}
            >
              <X className="w-6 h-6 text-white" />
            </motion.button>
            <motion.img
              src={previewImage}
              alt="Preview"
              className="max-w-full max-h-full object-contain rounded-xl"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default ChatView;
