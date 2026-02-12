import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let initialSessionHandled = false;
    let lastSignInTimestamp = 0;

    // Set up auth state listener as SINGLE source of truth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log("[Auth] onAuthStateChange:", event, !!session);

        // Track when we last signed in
        if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
          lastSignInTimestamp = Date.now();
        }

        // On iOS/Safari WebKit, a spurious SIGNED_OUT can fire right after
        // SIGNED_IN or TOKEN_REFRESHED. Ignore SIGNED_OUT if it arrives
        // within 3 seconds of a sign-in event.
        if (event === "SIGNED_OUT") {
          const timeSinceSignIn = Date.now() - lastSignInTimestamp;
          if (timeSinceSignIn < 3000 && lastSignInTimestamp > 0) {
            console.log("[Auth] Ignoring spurious SIGNED_OUT on iOS (came", timeSinceSignIn, "ms after sign-in)");
            return;
          }
          setSession(null);
          setUser(null);
          setLoading(false);
          return;
        }

        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        initialSessionHandled = true;

        // Update online status (deferred to avoid blocking state updates)
        if (session?.user) {
          const userId = session.user.id;
          setTimeout(() => {
            supabase
              .from("profiles")
              .update({ is_online: true, last_seen: new Date().toISOString() })
              .eq("user_id", userId)
              .then(({ error }) => {
                if (error) console.error("Failed to set online status:", error);
              });
          }, 0);
        }
      }
    );

    // Fallback: if onAuthStateChange hasn't fired after 2s, use getSession
    const fallbackTimer = setTimeout(async () => {
      if (!initialSessionHandled) {
        console.log("[Auth] Fallback: using getSession");
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    }, 2000);

    return () => {
      clearTimeout(fallbackTimer);
      subscription.unsubscribe();
    };
  }, []);

  // Handle offline status on window close
  useEffect(() => {
    const handleBeforeUnload = async () => {
      if (user) {
        await supabase
          .from("profiles")
          .update({ is_online: false, last_seen: new Date().toISOString() })
          .eq("user_id", user.id);
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [user]);

  const signUp = async (email: string, password: string, displayName?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          display_name: displayName,
        },
      },
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (!error && data.session) {
      setSession(data.session);
      setUser(data.session.user);
    }
    return { error };
  };

  const signOut = async () => {
    if (user) {
      await supabase
        .from("profiles")
        .update({ is_online: false, last_seen: new Date().toISOString() })
        .eq("user_id", user.id);
    }
    await supabase.auth.signOut();
  };

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};