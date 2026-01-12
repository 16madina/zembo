import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ChatMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string | null;
  image_url: string | null;
  audio_url: string | null;
  audio_duration: number | null;
  is_read: boolean;
  created_at: string;
  reply_to_message_id: string | null;
  reply_to?: ChatMessage | null;
}

export const useChatMessages = (otherUserId: string) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch initial messages
  useEffect(() => {
    if (!user?.id || !otherUserId) return;

    const fetchMessages = async () => {
      setIsLoading(true);
      
      // Use type assertion for new table
      const { data, error } = await (supabase as any)
        .from("messages")
        .select("*")
        .or(
          `and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`
        )
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching messages:", error);
      } else {
        setMessages(data || []);
        // Mark unread messages as read
        markAsRead();
      }
      
      setIsLoading(false);
    };

    fetchMessages();
  }, [user?.id, otherUserId]);

  // Real-time subscription for new messages
  useEffect(() => {
    if (!user?.id || !otherUserId) return;

    const channel = supabase
      .channel(`messages-${user.id}-${otherUserId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const newMessage = payload.new as ChatMessage;
          // Only add if it's part of this conversation
          if (
            (newMessage.sender_id === user.id && newMessage.receiver_id === otherUserId) ||
            (newMessage.sender_id === otherUserId && newMessage.receiver_id === user.id)
          ) {
            setMessages((prev) => [...prev, newMessage]);
            // Mark as read if we're the receiver
            if (newMessage.receiver_id === user.id) {
              markAsRead();
            }
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
          const updatedMessage = payload.new as ChatMessage;
          setMessages((prev) =>
            prev.map((m) => (m.id === updatedMessage.id ? updatedMessage : m))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, otherUserId]);

  const markAsRead = useCallback(async () => {
    if (!user?.id || !otherUserId) return;

    await (supabase as any)
      .from("messages")
      .update({ is_read: true })
      .eq("sender_id", otherUserId)
      .eq("receiver_id", user.id)
      .eq("is_read", false);
  }, [user?.id, otherUserId]);

  const sendNotification = useCallback(async (messageId: string, content: string | null, isAudio: boolean, isImage: boolean) => {
    if (!user?.id || !otherUserId) return;

    try {
      const response = await supabase.functions.invoke("notify-message", {
        body: {
          sender_id: user.id,
          receiver_id: otherUserId,
          message_id: messageId,
          content: content,
          is_audio: isAudio,
          is_image: isImage,
        },
      });

      if (response.error) {
        console.error("Error sending notification:", response.error);
      } else {
        console.log("Message notification sent:", response.data);
      }
    } catch (err) {
      console.error("Error invoking notify-message function:", err);
    }
  }, [user?.id, otherUserId]);

  const sendMessage = useCallback(async (
    content: string, 
    imageUrl?: string, 
    audioUrl?: string, 
    audioDuration?: number,
    replyToMessageId?: string
  ) => {
    if (!user?.id || !otherUserId) return null;

    const { data, error } = await (supabase as any)
      .from("messages")
      .insert({
        sender_id: user.id,
        receiver_id: otherUserId,
        content: content || null,
        image_url: imageUrl || null,
        audio_url: audioUrl || null,
        audio_duration: audioDuration || null,
        reply_to_message_id: replyToMessageId || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Error sending message:", error);
      return null;
    }

    // Send push notification to receiver
    if (data) {
      sendNotification(data.id, content, !!audioUrl, !!imageUrl);
    }

    return data;
  }, [user?.id, otherUserId, sendNotification]);

  const uploadImage = useCallback(async (file: File): Promise<string | null> => {
    if (!user?.id) return null;

    const fileExt = file.name.split(".").pop();
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("profile-photos")
      .upload(fileName, file);

    if (uploadError) {
      console.error("Error uploading image:", uploadError);
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
      .from("profile-photos")
      .getPublicUrl(fileName);

    return publicUrl;
  }, [user?.id]);

  return {
    messages,
    isLoading,
    sendMessage,
    uploadImage,
    markAsRead,
  };
};
