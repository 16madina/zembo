import { supabase } from "@/integrations/supabase/client";

/**
 * Check if an email is already registered
 */
export async function isEmailTaken(email: string): Promise<boolean> {
  const normalizedEmail = email.trim().toLowerCase();
  
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", normalizedEmail)
    .maybeSingle();
  
  if (error) {
    console.error("Error checking email:", error);
    return false; // Allow registration on error, server will catch duplicates
  }
  
  return data !== null;
}

/**
 * Check if a phone number is already registered
 */
export async function isPhoneTaken(phone: string, dialCode: string): Promise<boolean> {
  // Format phone with dial code for storage
  const fullPhone = `${dialCode}${phone}`.replace(/\s/g, "");
  
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("phone", fullPhone)
    .maybeSingle();
  
  if (error) {
    console.error("Error checking phone:", error);
    return false; // Allow registration on error, server will catch duplicates
  }
  
  return data !== null;
}

/**
 * Format phone number for storage (with dial code, no spaces)
 */
export function formatPhoneForStorage(phone: string, dialCode: string): string {
  return `${dialCode}${phone}`.replace(/\s/g, "");
}
