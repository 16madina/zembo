import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type VerificationStatus = "none" | "pending" | "approved" | "rejected";

interface UseIdentityVerificationReturn {
  status: VerificationStatus;
  isLoading: boolean;
  canInteract: boolean;
  rejectionReason: string | null;
  refetch: () => Promise<void>;
}

export const useIdentityVerification = (): UseIdentityVerificationReturn => {
  const { user } = useAuth();
  const [status, setStatus] = useState<VerificationStatus>("none");
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStatus = async () => {
    if (!user) {
      setStatus("none");
      setIsLoading(false);
      return;
    }

    try {
      // First check profile verification status
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_verified, identity_verification_status")
        .eq("user_id", user.id)
        .maybeSingle();

      // If user is already verified (passed face verification), allow interaction
      if (profile?.is_verified) {
        setStatus("approved");
        setIsLoading(false);
        return;
      }

      // Check identity verification table
      const { data: verification, error } = await supabase
        .from("identity_verifications")
        .select("status, rejection_reason")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching identity verification:", error);
        // If no verification found, user hasn't submitted yet
        setStatus("none");
      } else if (verification) {
        setStatus(verification.status as VerificationStatus);
        setRejectionReason(verification.rejection_reason);
      } else {
        setStatus("none");
      }
    } catch (err) {
      console.error("Error in useIdentityVerification:", err);
      setStatus("none");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, [user]);

  // Subscribe to realtime updates for this user's verification
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`identity-verification-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "identity_verifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log("Identity verification update:", payload);
          fetchStatus();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return {
    status,
    isLoading,
    canInteract: status !== "pending", // Can interact if not pending manual review
    rejectionReason,
    refetch: fetchStatus,
  };
};
