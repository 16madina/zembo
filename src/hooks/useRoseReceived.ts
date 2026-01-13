import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSoundEffects } from "@/hooks/useSoundEffects";

interface RoseSender {
  id: string;
  name: string;
  photo: string;
  message: string;
}

/**
 * Sanitizes a message by removing phone numbers and email addresses
 * to prevent users from sharing contact info before matching
 */
export function sanitizeRoseMessage(message: string): string {
  if (!message) return "";
  
  let sanitized = message;
  
  // Remove phone numbers (various formats)
  // International formats: +33, +1, etc.
  sanitized = sanitized.replace(/\+?\d{1,4}[\s.-]?\(?\d{1,4}\)?[\s.-]?\d{1,4}[\s.-]?\d{1,9}/g, "[numéro masqué]");
  
  // French phone numbers: 06, 07, 01, etc.
  sanitized = sanitized.replace(/(?:0|\+33|0033)[\s.-]?[1-9](?:[\s.-]?\d{2}){4}/g, "[numéro masqué]");
  
  // General patterns with digits grouped (6+ consecutive digits)
  sanitized = sanitized.replace(/\d[\d\s.-]{5,}\d/g, "[numéro masqué]");
  
  // Remove email addresses
  sanitized = sanitized.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[email masqué]");
  
  // Remove URLs
  sanitized = sanitized.replace(/https?:\/\/[^\s]+/g, "[lien masqué]");
  sanitized = sanitized.replace(/www\.[^\s]+/g, "[lien masqué]");
  
  // Remove social media handles (Instagram, Snapchat, etc.)
  sanitized = sanitized.replace(/@[a-zA-Z0-9._]{3,}/g, "[pseudo masqué]");
  
  // Remove "insta:", "snap:", "whatsapp:", etc.
  sanitized = sanitized.replace(/(?:insta(?:gram)?|snap(?:chat)?|whatsapp|telegram|tiktok|facebook|fb|twitter|discord)[\s:]*[a-zA-Z0-9._@-]+/gi, "[contact masqué]");
  
  return sanitized.trim();
}

export function useRoseReceived() {
  const { user } = useAuth();
  const { playRoseSound } = useSoundEffects();
  const [roseReceived, setRoseReceived] = useState<RoseSender | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const isFirstLoad = useRef(true);

  const fetchSenderProfile = useCallback(async (senderId: string): Promise<RoseSender | null> => {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("user_id, display_name, avatar_url")
      .eq("user_id", senderId)
      .maybeSingle();
    
    if (error || !profile) {
      console.error("Error fetching rose sender profile:", error);
      return null;
    }
    
    return {
      id: profile.user_id,
      name: profile.display_name || "Quelqu'un",
      photo: profile.avatar_url || "/placeholder.svg",
      message: "",
    };
  }, []);

  const fetchRoseMessage = useCallback(async (senderId: string, receiverId: string): Promise<string> => {
    // Get the most recent gift transaction with a message
    const { data: transaction, error } = await supabase
      .from("gift_transactions")
      .select("message, gift_id")
      .eq("sender_id", senderId)
      .eq("receiver_id", receiverId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (error || !transaction?.message) {
      return "";
    }
    
    // Sanitize the message to remove phone numbers and emails
    return sanitizeRoseMessage(transaction.message);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setRoseReceived(null);
  }, []);

  const viewProfile = useCallback(() => {
    // We'll handle navigation in the component that uses this hook
    setIsModalOpen(false);
  }, []);

  // Subscribe to new likes with has_rose = true
  useEffect(() => {
    if (!user) return;

    const roseChannel = supabase
      .channel("realtime-roses-received")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "likes",
          filter: `liked_id=eq.${user.id}`,
        },
        async (payload) => {
          const newLike = payload.new as { 
            liker_id: string; 
            liked_id: string; 
            has_rose: boolean;
          };
          
          // Only show modal for roses, not regular likes
          if (!newLike.has_rose) return;
          
          // Skip during initial load
          if (isFirstLoad.current) return;
          
          console.log("Rose received!", newLike);
          
          // Fetch sender profile
          const sender = await fetchSenderProfile(newLike.liker_id);
          if (!sender) return;
          
          // Fetch the message from gift_transactions
          const message = await fetchRoseMessage(newLike.liker_id, user.id);
          
          setRoseReceived({
            ...sender,
            message,
          });
          setIsModalOpen(true);
          
          // Play romantic sound effect
          playRoseSound();
        }
      )
      .subscribe();

    // Mark initial load as complete after a short delay
    const timer = setTimeout(() => {
      isFirstLoad.current = false;
    }, 2000);

    return () => {
      clearTimeout(timer);
      supabase.removeChannel(roseChannel);
    };
  }, [user, fetchSenderProfile, fetchRoseMessage, playRoseSound]);

  return {
    roseReceived,
    isModalOpen,
    closeModal,
    viewProfile,
    sanitizeRoseMessage,
  };
}
