import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface AIDataConsent {
  id: string;
  user_id: string;
  consented_at: string | null;
  consent_version: string;
  consent_details: Record<string, any>;
  created_at: string;
  updated_at: string;
}

const CURRENT_CONSENT_VERSION = "1.0";

export const useAIDataConsent = () => {
  const { user } = useAuth();
  const [consent, setConsent] = useState<AIDataConsent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasConsented, setHasConsented] = useState(false);

  // Fetch consent status
  const fetchConsent = useCallback(async () => {
    if (!user?.id) {
      setConsent(null);
      setHasConsented(false);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await (supabase as any)
        .from("ai_data_consents")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      setConsent(data);
      setHasConsented(
        data?.consented_at !== null && 
        data?.consent_version === CURRENT_CONSENT_VERSION
      );
    } catch (error) {
      console.error("Error fetching AI consent:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // Grant consent
  const grantConsent = useCallback(async (details?: Record<string, any>) => {
    if (!user?.id) return false;

    try {
      const consentData = {
        user_id: user.id,
        consented_at: new Date().toISOString(),
        consent_version: CURRENT_CONSENT_VERSION,
        consent_details: details || {},
      };

      const { data, error } = await (supabase as any)
        .from("ai_data_consents")
        .upsert(consentData, { onConflict: "user_id" })
        .select()
        .single();

      if (error) throw error;

      setConsent(data);
      setHasConsented(true);
      return true;
    } catch (error) {
      console.error("Error granting AI consent:", error);
      return false;
    }
  }, [user?.id]);

  // Revoke consent
  const revokeConsent = useCallback(async () => {
    if (!user?.id) return false;

    try {
      const { error } = await (supabase as any)
        .from("ai_data_consents")
        .update({
          consented_at: null,
          consent_details: {},
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      if (error) throw error;

      setHasConsented(false);
      await fetchConsent();
      return true;
    } catch (error) {
      console.error("Error revoking AI consent:", error);
      return false;
    }
  }, [user?.id, fetchConsent]);

  // Initial fetch
  useEffect(() => {
    fetchConsent();
  }, [fetchConsent]);

  return {
    consent,
    hasConsented,
    isLoading,
    grantConsent,
    revokeConsent,
    refresh: fetchConsent,
    currentVersion: CURRENT_CONSENT_VERSION,
  };
};
