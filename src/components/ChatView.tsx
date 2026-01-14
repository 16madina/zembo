import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Phone, Video, MoreVertical, Send, Smile, Image, Check, CheckCheck, X, Mic, Flag, UserX } from "lucide-react";
import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useChatMessages, ChatMessage } from "@/hooks/useChatMessages";
import { useVoiceCall } from "@/hooks/useVoiceCall";
import { useIdentityVerification } from "@/hooks/useIdentityVerification";
import { useMessageReactions } from "@/hooks/useMessageReactions";
import VoiceCallModal from "@/components/VoiceCallModal";
import ChatRestrictionBanner from "@/components/chat/ChatRestrictionBanner";
import MessageReactionPicker from "@/components/chat/MessageReactionPicker";
import MessageReactions from "@/components/chat/MessageReactions";
import VoiceRecorder from "@/components/chat/VoiceRecorder";
import SwipeableMessage from "@/components/chat/SwipeableMessage";
import ReplyPreview from "@/components/chat/ReplyPreview";
import QuotedMessage from "@/components/chat/QuotedMessage";
import { isNative } from "@/lib/capacitor";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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

const ChatView = ({ user, onBack }: ChatViewProps) => {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const { messages: dbMessages, isLoading, sendMessage, uploadImage } = useChatMessages(user.id);
  const { status: identityStatus, canInteract } = useIdentityVerification();
  const { 
    callState, 
    initiateCall, 
    acceptCall, 
    rejectCall, 
    endCall, 
    toggleMute, 
    formatDuration,
    remoteAudioRef 
  } = useVoiceCall();
  
  const [newMessage, setNewMessage] = useState("");
  const [isTyping, setIsTyping] = useState(user.isTyping);
  const [isOnline, setIsOnline] = useState(user.isOnline);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [activeReactionMessageId, setActiveReactionMessageId] = useState<string | null>(null);
  const [replyToMessage, setReplyToMessage] = useState<{
    id: string;
    text?: string;
    image?: string;
    audioUrl?: string;
    senderName: string;
    isMe: boolean;
  } | null>(null);

  // Keyboard handling (native) + viewport-resize compensation (iOS)
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [viewportHeight, setViewportHeight] = useState<number>(() =>
    (typeof window !== "undefined" ? window.visualViewport?.height ?? window.innerHeight : 0)
  );
  const [baselineViewportHeight, setBaselineViewportHeight] = useState<number>(() =>
    (typeof window !== "undefined" ? window.visualViewport?.height ?? window.innerHeight : 0)
  );
  const [keyboardShift, setKeyboardShift] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputBarRef = useRef<HTMLDivElement>(null);
  const [inputBarHeight, setInputBarHeight] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Create a map for quick lookup of messages by ID
  const messagesMap = useMemo(() => {
    const map = new Map<string, ChatMessage>();
    dbMessages.forEach(m => map.set(m.id, m));
    return map;
  }, [dbMessages]);

  // Transform DB messages to display format
  const displayMessages = dbMessages.map((m) => {
    const replyTo = m.reply_to_message_id ? messagesMap.get(m.reply_to_message_id) : null;
    return {
      id: m.id,
      text: m.content || "",
      image: m.image_url || undefined,
      audioUrl: m.audio_url || undefined,
      audioDuration: m.audio_duration || undefined,
      time: new Date(m.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
      isMe: m.sender_id === currentUser?.id,
      status: m.is_read ? "read" as const : "delivered" as const,
      replyToMessageId: m.reply_to_message_id,
      replyTo: replyTo ? {
        id: replyTo.id,
        text: replyTo.content || "",
        image: replyTo.image_url || undefined,
        audioUrl: replyTo.audio_url || undefined,
        isMe: replyTo.sender_id === currentUser?.id,
      } : null,
    };
  });

  // Message reactions hook
  const messageIds = displayMessages.map((m) => m.id);
  const { toggleReaction, getReactionSummary } = useMessageReactions(messageIds);

  // Handle swipe to reply
  const handleSwipeReply = useCallback((message: typeof displayMessages[0]) => {
    setReplyToMessage({
      id: message.id,
      text: message.text || undefined,
      image: message.image,
      audioUrl: message.audioUrl,
      senderName: message.isMe ? "Vous" : user.name,
      isMe: message.isMe,
    });
    // Haptic feedback
    if (isNative && navigator.vibrate) {
      navigator.vibrate(10);
    }
  }, [user.name]);

  // Long press handler for reactions
  const handleLongPressStart = useCallback((messageId: string) => {
    longPressTimerRef.current = setTimeout(() => {
      setActiveReactionMessageId(messageId);
      // Haptic feedback on native
      if (isNative && navigator.vibrate) {
        navigator.vibrate(10);
      }
    }, 500);
  }, []);

  const handleLongPressEnd = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const handleReactionSelect = useCallback((emoji: string) => {
    if (activeReactionMessageId) {
      toggleReaction(activeReactionMessageId, emoji);
      setActiveReactionMessageId(null);
    }
  }, [activeReactionMessageId, toggleReaction]);

  // Real-time online status from profiles table (source of truth)
  useEffect(() => {
    if (!user.id) return;

    let isMounted = true;

    const fetchInitial = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("is_online, last_seen")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!isMounted) return;
      if (!error && data) {
        setIsOnline(Boolean(data.is_online));
      }
    };

    fetchInitial();

    const channel = supabase
      .channel(`profile-status-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const nextOnline = Boolean((payload.new as any)?.is_online);
          setIsOnline(nextOnline);
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [user.id]);

  // Smooth scroll to bottom helper
  const scrollToBottomSmooth = (instant = false) => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: instant ? 'auto' : 'smooth'
      });
    }
  };

  // Keyboard height listener for native mobile - iMessage style
  useEffect(() => {
    const updateKeyboardHeight = () => {
      const height = parseInt(
        getComputedStyle(document.documentElement).getPropertyValue("--keyboard-height") || "0"
      );
      setKeyboardHeight(height);

      // When keyboard opens, scroll to bottom after layout adjusts
      if (height > 0) {
        requestAnimationFrame(() => {
          scrollToBottomSmooth();
        });
      }
    };

    // Watch for CSS variable changes via MutationObserver
    const observer = new MutationObserver(updateKeyboardHeight);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["style"] });

    // Also watch body class for keyboard-open
    const bodyObserver = new MutationObserver(updateKeyboardHeight);
    bodyObserver.observe(document.body, { attributes: true, attributeFilter: ["class"] });

    return () => {
      observer.disconnect();
      bodyObserver.disconnect();
    };
  }, []);

  // Track dynamic viewport height (changes when iOS resizes the webview)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const vv = window.visualViewport;
    const update = () => {
      setViewportHeight(vv?.height ?? window.innerHeight);
    };

    update();

    if (!vv) {
      window.addEventListener("resize", update);
      return () => window.removeEventListener("resize", update);
    }

    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);

  // Compute the effective shift to apply: avoid double-compensation when the webview already resized
  useEffect(() => {
    if (keyboardHeight === 0) {
      setBaselineViewportHeight(viewportHeight);
      setKeyboardShift(0);
      return;
    }

    const viewportDelta = Math.max(0, baselineViewportHeight - viewportHeight);
    setKeyboardShift(Math.max(0, keyboardHeight - viewportDelta));
  }, [keyboardHeight, viewportHeight, baselineViewportHeight]);

  // Measure input bar height so we can pad the scroll area precisely
  useEffect(() => {
    if (!inputBarRef.current) return;

    const el = inputBarRef.current;
    const update = () => setInputBarHeight(el.getBoundingClientRect().height);

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);

    return () => ro.disconnect();
  }, []);

  const handleCall = () => {
    initiateCall(user.id, user.name, user.photo, "audio");
  };

  const handleVideoCall = () => {
    initiateCall(user.id, user.name, user.photo, "video");
  };

  const handleReport = () => {
    toast({
      title: "Signalement envoyé",
      description: `Vous avez signalé ${user.name}. Notre équipe va examiner ce signalement.`,
    });
  };

  const handleBlock = () => {
    toast({
      title: "Utilisateur bloqué",
      description: `${user.name} a été bloqué. Vous ne recevrez plus de messages de cette personne.`,
      variant: "destructive",
    });
    onBack();
  };

  // Auto-scroll when new messages arrive
  useEffect(() => {
    // Use requestAnimationFrame to ensure DOM is updated
    requestAnimationFrame(() => {
      scrollToBottomSmooth();
    });
  }, [displayMessages.length]);

  // Real-time typing indicator via Supabase Presence
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const typingChannelRef = useRef<any>(null);
  const typingSubscribedRef = useRef(false);
  const pendingTypingRef = useRef<boolean | null>(null);

  useEffect(() => {
    if (!currentUser?.id || !user.id) return;

    const channelName = `typing-${[currentUser.id, user.id].sort().join('-')}`;
    const typingChannel = supabase.channel(channelName, {
      config: { presence: { key: currentUser.id } },
    });

    typingChannelRef.current = typingChannel;
    typingSubscribedRef.current = false;
    pendingTypingRef.current = null;

    const updateTypingFromState = () => {
      const state = typingChannel.presenceState();
      const other = state[user.id];
      if (other && Array.isArray(other)) {
        setIsTyping(other.some((p: any) => p.isTyping === true));
      } else {
        setIsTyping(false);
      }
    };

    typingChannel
      .on("presence", { event: "sync" }, updateTypingFromState)
      .on("presence", { event: "join" }, updateTypingFromState)
      .on("presence", { event: "leave" }, updateTypingFromState)
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          typingSubscribedRef.current = true;

          // ensure we have a state for ourselves
          await typingChannel.track({ isTyping: false });

          // if we typed before subscription finished, flush it now
          if (pendingTypingRef.current !== null) {
            const pending = pendingTypingRef.current;
            pendingTypingRef.current = null;
            await typingChannel.track({ isTyping: pending });
          }
        }
      });

    return () => {
      typingSubscribedRef.current = false;
      pendingTypingRef.current = null;
      typingChannelRef.current = null;
      setIsTyping(false);
      supabase.removeChannel(typingChannel);
    };
  }, [currentUser?.id, user.id]);

  // Broadcast own typing status using the existing channel
  const broadcastTyping = useCallback((typing: boolean) => {
    const ch = typingChannelRef.current;
    if (!ch) return;

    if (!typingSubscribedRef.current) {
      pendingTypingRef.current = typing;
      return;
    }

    ch.track({ isTyping: typing }).catch((e: any) => {
      console.error("Failed to broadcast typing status:", e);
    });
  }, []);
  
  // Handle input change to broadcast typing
  const handleInputChange = useCallback((value: string) => {
    setNewMessage(value);
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Broadcast typing if there's content
    if (value.trim()) {
      broadcastTyping(true);
      
      // Stop typing after 2 seconds of no activity
      typingTimeoutRef.current = setTimeout(() => {
        broadcastTyping(false);
      }, 2000);
    } else {
      broadcastTyping(false);
    }
  }, [broadcastTyping]);
  
  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      broadcastTyping(false);
    };
  }, [broadcastTyping]);

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

  const handleSend = async () => {
    if ((!newMessage.trim() && !selectedFile) || isSending) return;
    
    // Check if user can interact
    if (!canInteract) {
      toast({
        title: "Accès limité",
        description: "Vous devez compléter la vérification d'identité pour envoyer des messages.",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);
    
    try {
      let imageUrl: string | undefined;
      
      if (selectedFile) {
        imageUrl = await uploadImage(selectedFile) || undefined;
      }
      
      await sendMessage(newMessage, imageUrl, undefined, undefined, replyToMessage?.id);
      handleInputChange("");
      setSelectedImage(null);
      setSelectedFile(null);
      setReplyToMessage(null);
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer le message",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleEmojiSelect = (emoji: any) => {
    handleInputChange(newMessage + emoji.native);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle sending voice message from VoiceRecorder
  const handleSendVoiceMessage = async (audioBlob: Blob, duration: number) => {
    try {
      const fileName = `${currentUser?.id}/${Date.now()}.webm`;
      const { error: uploadError } = await supabase.storage
        .from("profile-photos")
        .upload(fileName, audioBlob);

      if (!uploadError) {
        const {
          data: { publicUrl },
        } = supabase.storage.from("profile-photos").getPublicUrl(fileName);

        await sendMessage("", undefined, publicUrl, duration, replyToMessage?.id);
        setReplyToMessage(null);
      }
      setShowVoiceRecorder(false);
    } catch (error) {
      console.error("Error sending voice message:", error);
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer le message vocal",
        variant: "destructive",
      });
    }
  };

  const showSendButton = Boolean(newMessage.trim() || selectedImage);
  const isInputDisabled = identityStatus === "pending";

  const MessageStatus = ({ status }: { status: "sent" | "delivered" | "read" }) => {
    if (status === "sent") {
      return <Check className="w-3.5 h-3.5 text-muted-foreground" />;
    }
    if (status === "delivered") {
      return <CheckCheck className="w-3.5 h-3.5 text-muted-foreground" />;
    }
    return <CheckCheck className="w-3.5 h-3.5 text-accent" />;
  };

  return (
    <>
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="fixed inset-0 z-[100] bg-background flex flex-col pt-[env(safe-area-inset-top)]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 glass-strong border-b border-border/50 flex-shrink-0">
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
              {isOnline && (
                <motion.span 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute bottom-0 right-0 w-3 h-3 bg-success border-2 border-card rounded-full" 
                />
              )}
            </div>
            
            <div>
              <h2 className="font-semibold text-foreground">{user.name}</h2>
              <p className="text-xs text-muted-foreground">
                {isOnline ? (
                  <span className="text-success">En ligne</span>
                ) : (
                  "Hors ligne"
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <motion.button
              onTouchEnd={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleCall();
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleCall();
              }}
              className="p-2.5 tap-highlight rounded-full active:bg-muted/50 touch-manipulation"
              whileTap={{ scale: 0.9 }}
            >
              <Phone className="w-5 h-5 text-muted-foreground" />
            </motion.button>
            <motion.button
              onTouchEnd={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleVideoCall();
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleVideoCall();
              }}
              className="p-2.5 tap-highlight rounded-full active:bg-muted/50 touch-manipulation"
              whileTap={{ scale: 0.9 }}
            >
              <Video className="w-5 h-5 text-muted-foreground" />
            </motion.button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <motion.button
                  className="p-2.5 tap-highlight rounded-full active:bg-muted/50 touch-manipulation"
                  whileTap={{ scale: 0.9 }}
                >
                  <MoreVertical className="w-5 h-5 text-muted-foreground" />
                </motion.button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 z-[110]">
                <DropdownMenuItem onClick={handleReport} className="gap-2 text-foreground">
                  <Flag className="w-4 h-4" />
                  Signaler
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleBlock} className="gap-2 text-destructive">
                  <UserX className="w-4 h-4" />
                  Bloquer
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Messages - iMessage style scrolling area */}
        <div 
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-4 py-4 space-y-3 scrollbar-hide"
          style={{
            paddingBottom:
              keyboardHeight > 0
                ? `${Math.max(0, inputBarHeight) + Math.max(0, keyboardShift) + 16}px`
                : `calc(${Math.max(0, inputBarHeight)}px + env(safe-area-inset-bottom) + 16px)`,
          }}
        >
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : displayMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-center">
              <p className="text-muted-foreground">Commencez la conversation !</p>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {displayMessages.map((message) => {
                const reactionSummary = getReactionSummary(message.id);
                return (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.2 }}
                    className="w-full"
                  >
                    <SwipeableMessage 
                      onSwipeReply={() => handleSwipeReply(message)}
                      isMe={message.isMe}
                    >
                      <div className={`flex flex-col ${message.isMe ? "items-end" : "items-start"}`}>
                        <div className="relative">
                          {/* Reaction Picker */}
                          <MessageReactionPicker
                            isOpen={activeReactionMessageId === message.id}
                            onSelect={handleReactionSelect}
                            onClose={() => setActiveReactionMessageId(null)}
                            position={message.isMe ? "right" : "left"}
                          />
                          
                          {/* Message Bubble */}
                          <div
                            className={`${
                              message.isMe
                                ? "bg-primary text-primary-foreground rounded-2xl rounded-br-md"
                                : "glass rounded-2xl rounded-bl-md"
                            } ${message.image ? "p-1.5" : "px-4 py-2.5"} select-none`}
                            onTouchStart={() => handleLongPressStart(message.id)}
                            onTouchEnd={handleLongPressEnd}
                            onTouchCancel={handleLongPressEnd}
                            onMouseDown={() => handleLongPressStart(message.id)}
                            onMouseUp={handleLongPressEnd}
                            onMouseLeave={handleLongPressEnd}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              setActiveReactionMessageId(message.id);
                            }}
                          >
                            {/* Quoted Message */}
                            {message.replyTo && (
                              <QuotedMessage
                                senderName={message.replyTo.isMe ? "Vous" : user.name}
                                text={message.replyTo.text}
                                image={message.replyTo.image}
                                audioUrl={message.replyTo.audioUrl}
                                isMe={message.replyTo.isMe}
                                isOwnMessage={message.isMe}
                              />
                            )}
                            
                            {message.image && (
                              <motion.img
                                src={message.image}
                                alt="Shared"
                                className="rounded-xl max-w-full max-h-60 object-cover cursor-pointer"
                                onClick={() => setPreviewImage(message.image!)}
                                whileTap={{ scale: 0.98 }}
                              />
                            )}
                            {message.audioUrl && (
                              <div className="flex items-center gap-3 min-w-[180px]">
                                <audio
                                  src={message.audioUrl}
                                  controls
                                  className="h-8 w-full max-w-[200px]"
                                  style={{ filter: message.isMe ? "invert(1)" : "none" }}
                                />
                              </div>
                            )}
                            {message.text && (
                              <p className={`text-sm leading-relaxed ${message.image ? "px-2.5 pt-2 pb-1" : ""}`}>
                                {message.text}
                              </p>
                            )}
                            <div className={`flex items-center justify-end gap-1 ${message.image || message.audioUrl ? "px-2.5 pb-1.5" : "mt-1"} ${
                              message.isMe ? "text-primary-foreground/70" : "text-muted-foreground"
                            }`}>
                              <span className="text-[10px]">{message.time}</span>
                              {message.isMe && <MessageStatus status={message.status} />}
                            </div>
                          </div>
                        </div>
                        
                        {/* Reactions Display */}
                        <MessageReactions
                          reactions={reactionSummary}
                          onReactionClick={(emoji) => toggleReaction(message.id, emoji)}
                          isMe={message.isMe}
                        />
                      </div>
                    </SwipeableMessage>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}

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
                  onClick={() => {
                    setSelectedImage(null);
                    setSelectedFile(null);
                  }}
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

        {/* Restriction Banner */}
        {identityStatus !== "approved" && (
          <ChatRestrictionBanner status={identityStatus} />
        )}

        {/* Reply Preview */}
        <AnimatePresence>
          {replyToMessage && (
            <ReplyPreview
              replyTo={replyToMessage}
              onCancel={() => setReplyToMessage(null)}
            />
          )}
        </AnimatePresence>

        {/* Typing indicator (fixed at bottom, above input) */}
        <AnimatePresence>
          {isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="px-4 pb-2"
            >
              <div className="inline-flex items-center gap-2 glass rounded-full px-3 py-2">
                <span className="text-xs text-muted-foreground">écrit</span>
                <div className="flex items-center gap-1">
                  <motion.span
                    className="w-1.5 h-1.5 bg-muted-foreground rounded-full"
                    animate={{ opacity: [0.35, 1, 0.35] }}
                    transition={{ duration: 0.9, repeat: Infinity, delay: 0 }}
                  />
                  <motion.span
                    className="w-1.5 h-1.5 bg-muted-foreground rounded-full"
                    animate={{ opacity: [0.35, 1, 0.35] }}
                    transition={{ duration: 0.9, repeat: Infinity, delay: 0.15 }}
                  />
                  <motion.span
                    className="w-1.5 h-1.5 bg-muted-foreground rounded-full"
                    animate={{ opacity: [0.35, 1, 0.35] }}
                    transition={{ duration: 0.9, repeat: Infinity, delay: 0.3 }}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input - iMessage style anchored at bottom */}
        <div 
          ref={inputBarRef}
          className="flex-shrink-0 px-4 glass-strong border-t border-border/50"
          style={{
            transform: keyboardShift > 0 ? `translateY(-${keyboardShift}px)` : undefined,
            transition: "transform 220ms cubic-bezier(0.2, 0, 0, 1)",
            // Zero padding when keyboard is open to stick directly to keyboard, safe-area padding when closed
            paddingTop: replyToMessage ? "8px" : "12px",
            paddingBottom: keyboardHeight > 0 ? "0px" : "calc(env(safe-area-inset-bottom) + 12px)",
            willChange: keyboardShift > 0 ? "transform" : undefined,
            zIndex: 120,
          }}
        >
          {showVoiceRecorder ? (
            <VoiceRecorder
              onSend={handleSendVoiceMessage}
              onCancel={() => setShowVoiceRecorder(false)}
              isDisabled={isInputDisabled}
            />
          ) : (
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
              
              <div className={`flex-1 flex items-center gap-2 glass rounded-full px-4 py-2.5 ${isInputDisabled ? 'opacity-50' : ''}`}>
              <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => handleInputChange(e.target.value)}
                  onKeyPress={handleKeyPress}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  placeholder={isInputDisabled ? "Vérification en attente..." : "Écris ton message..."}
                  disabled={isInputDisabled}
                  className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none min-w-0 disabled:cursor-not-allowed"
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

              <AnimatePresence mode="wait">
                {showSendButton ? (
                  <motion.button
                    key="send"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    onClick={handleSend}
                    disabled={isSending}
                    className={`p-3 rounded-full flex-shrink-0 ${
                      (newMessage.trim() || selectedImage) && !isSending ? "btn-gold" : "glass"
                    }`}
                    whileTap={{ scale: 0.9 }}
                  >
                    {isSending ? (
                      <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    ) : (
                      <Send className={`w-5 h-5 ${
                        newMessage.trim() || selectedImage ? "text-primary-foreground" : "text-muted-foreground"
                      }`} />
                    )}
                  </motion.button>
                ) : (
                  <motion.button
                    key="mic"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    onClick={() => {
                      setShowEmojiPicker(false);
                      setShowVoiceRecorder(true);
                    }}
                    disabled={isInputDisabled}
                    className={`p-3 rounded-full flex-shrink-0 btn-gold ${isInputDisabled ? "opacity-50" : ""}`}
                    whileTap={{ scale: 0.9 }}
                  >
                    <Mic className="w-5 h-5 text-primary-foreground" />
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          )}
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

      {/* Voice Call Modal */}
      <VoiceCallModal
        isOpen={callState.isRinging || callState.isInCall}
        isRinging={callState.isRinging}
        isIncoming={callState.isIncoming}
        isInCall={callState.isInCall}
        callType={callState.callType}
        remoteUserName={callState.remoteUserName}
        remoteUserPhoto={callState.remoteUserPhoto}
        isMuted={callState.isMuted}
        duration={callState.duration}
        onAccept={acceptCall}
        onReject={rejectCall}
        onEnd={endCall}
        onToggleMute={toggleMute}
        formatDuration={formatDuration}
        remoteAudioRef={remoteAudioRef}
      />
    </>
  );
};

export default ChatView;
