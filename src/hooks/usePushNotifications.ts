import { useEffect, useState, useCallback, useRef } from "react";
import { isNative } from "@/lib/capacitor";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const FCM_TOKEN_KEY = "fcm_token";

// Dynamic import for Push Notifications to avoid errors on web
const getPushNotifications = async () => {
  if (!isNative) return null;
  const mod = await import("@capacitor/push-notifications");
  return mod.PushNotifications;
};

export interface PushNotificationToken {
  value: string;
}

export interface NotificationData {
  type?: string;
  sender_id?: string;
  sender_name?: string;
  sender_avatar?: string;
  message_id?: string;
  match_id?: string;
  matched_user_id?: string;
  matched_user_name?: string;
  matched_user_avatar?: string;
  live_id?: string;
  live_title?: string;
  // Call notification data
  callId?: string;
  callType?: string;
  callerName?: string;
  callerPhoto?: string;
}

interface UsePushNotificationsOptions {
  enabled?: boolean;
}

export const usePushNotifications = (options: UsePushNotificationsOptions = {}) => {
  const { user } = useAuth();
  const [token, setToken] = useState<string | null>(() => {
    // Initialize from localStorage if available
    if (typeof window !== "undefined") {
      return localStorage.getItem(FCM_TOKEN_KEY);
    }
    return null;
  });
  const [permissionStatus, setPermissionStatus] = useState<string>("prompt");
  const enabled = options.enabled ?? true;
  const tokenReceivedRef = useRef(false);

  const registerToken = useCallback(async (fcmToken: string) => {
    if (!user) {
      console.log("[Push] Cannot register token - no user");
      return false;
    }

    try {
      // Verify Supabase session is active
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session) {
        console.error("[Push] No active session, cannot register token");
        return false;
      }

      // Detect device type
      const userAgent = navigator.userAgent.toLowerCase();
      let deviceType = "unknown";
      if (/iphone|ipad|ipod/.test(userAgent)) {
        deviceType = "ios";
      } else if (/android/.test(userAgent)) {
        deviceType = "android";
      }

      const deviceName = `${deviceType.toUpperCase()} Device`;
      const now = new Date().toISOString();

      console.log(`[Push] Registering token for ${deviceType}: ${fcmToken.slice(0, 20)}...`);

      // Try INSERT first
      const { error: insertError } = await supabase
        .from("user_devices")
        .insert({
          user_id: user.id,
          fcm_token: fcmToken,
          device_type: deviceType,
          device_name: deviceName,
          last_used_at: now,
        });

      if (insertError) {
        // If duplicate, try UPDATE
        if (insertError.code === "23505") {
          console.log("[Push] Token exists, updating last_used_at...");
          const { error: updateError } = await supabase
            .from("user_devices")
            .update({ last_used_at: now, device_name: deviceName })
            .eq("user_id", user.id)
            .eq("fcm_token", fcmToken);

          if (updateError) {
            console.error("[Push] Update failed:", updateError.message);
            return false;
          }
          console.log("[Push] Token updated successfully");
        } else {
          console.error("[Push] Insert failed:", insertError.message, insertError.code);
          return false;
        }
      } else {
        console.log("[Push] Token registered successfully");
      }

      return true;
    } catch (err) {
      console.error("[Push] Error registering token:", err);
      return false;
    }
  }, [user]);

  const handleNotificationNavigation = useCallback((data: NotificationData) => {
    console.log("Handling notification navigation:", data);
    
    const type = data.type;
    
    switch (type) {
      case "message":
        // Navigate to messages with the sender's conversation
        if (data.sender_id) {
          // Store sender info in sessionStorage for the Messages page to use
          sessionStorage.setItem("openChatWith", JSON.stringify({
            id: data.sender_id,
            name: data.sender_name || "Utilisateur",
            photo: data.sender_avatar || "",
            isOnline: true
          }));
        }
        window.location.href = "/messages";
        break;
        
      case "match":
        // Navigate to messages with the matched user's conversation
        if (data.matched_user_id) {
          sessionStorage.setItem("openChatWith", JSON.stringify({
            id: data.matched_user_id,
            name: data.matched_user_name || "Nouveau Match",
            photo: data.matched_user_avatar || "",
            isOnline: true
          }));
        }
        window.location.href = "/messages";
        break;
        
      case "live":
        // Navigate to the live room
        if (data.live_id) {
          window.location.href = `/live/${data.live_id}`;
        } else {
          window.location.href = "/live";
        }
        break;
        
      case "like":
        // Navigate to home to see who liked
        window.location.href = "/";
        break;
        
      case "super_like":
        // Navigate to home to see the super like
        window.location.href = "/";
        break;

      case "incoming_call":
        // Navigate to messages to handle the incoming call
        // The call will be received via realtime subscription in useVoiceCall
        if (data.sender_id || data.callId) {
          sessionStorage.setItem("pendingCall", JSON.stringify({
            callId: data.callId,
            callerName: data.callerName,
            callerPhoto: data.callerPhoto,
            callType: data.callType || "audio",
          }));
        }
        window.location.href = "/messages";
        break;

      case "missed_call":
        // Navigate to messages and show missed call info
        if (data.callerName) {
          sessionStorage.setItem("missedCall", JSON.stringify({
            callId: data.callId,
            callerName: data.callerName,
            callerPhoto: data.callerPhoto,
            callType: data.callType || "audio",
          }));
        }
        window.location.href = "/messages";
        break;
        
      default:
        // Default navigation
        console.log("Unknown notification type:", type);
        window.location.href = "/";
    }
  }, []);

  const requestPermissions = useCallback(async () => {
    const PushNotifications = await getPushNotifications();
    if (!PushNotifications) {
      console.log("Push notifications not available");
      return false;
    }

    try {
      const permission = await PushNotifications.requestPermissions();
      setPermissionStatus(permission.receive);

      if (permission.receive === "granted") {
        await PushNotifications.register();
        return true;
      }

      toast.error("Permission refusée pour les notifications");
      return false;
    } catch (error) {
      console.error("Error requesting push permissions:", error);
      return false;
    }
  }, []);

  const initializePushNotifications = useCallback(async () => {
    console.log("[Push] Initializing push notifications...");

    const PushNotifications = await getPushNotifications();
    if (!PushNotifications) {
      console.log("[Push] Not available on this platform");
      return;
    }
    
    if (!user) {
      console.log("[Push] No user, skipping initialization");
      return;
    }

    console.log("[Push] User authenticated:", user.id.slice(0, 8));

    try {
      // Remove any existing listeners to avoid duplicates
      await PushNotifications.removeAllListeners();

      tokenReceivedRef.current = false;

      // Listen for registration success
      PushNotifications.addListener("registration", async (tokenData: PushNotificationToken) => {
        console.log("[Push] Token received via listener:", tokenData.value.slice(0, 20));
        tokenReceivedRef.current = true;
        
        // Store token in localStorage for future sessions
        localStorage.setItem(FCM_TOKEN_KEY, tokenData.value);
        setToken(tokenData.value);
        
        const success = await registerToken(tokenData.value);
        if (success) {
          toast.success("Notifications activées", { duration: 3000 });
        }
      });

      // Listen for registration errors
      PushNotifications.addListener("registrationError", (error: any) => {
        console.error("[Push] Registration error:", error);
        toast.error("Erreur d'enregistrement des notifications");
      });

      // Listen for push notifications received while app is in foreground
      PushNotifications.addListener("pushNotificationReceived", (notification: any) => {
        console.log("[Push] Notification received:", notification);
        const data: NotificationData = notification.data || {};

        toast(notification.title, {
          description: notification.body,
          action: {
            label: "Voir",
            onClick: () => handleNotificationNavigation(data),
          },
          duration: 5000,
        });
      });

      // Listen for push notification action (user tapped on notification)
      PushNotifications.addListener("pushNotificationActionPerformed", (notification: any) => {
        console.log("[Push] Notification tapped:", notification);
        const data: NotificationData = notification.notification?.data || {};
        handleNotificationNavigation(data);
      });

      // Check current permission status
      const current = await PushNotifications.checkPermissions();
      setPermissionStatus(current.receive);
      console.log("[Push] Current permission:", current.receive);

      if (current.receive !== "granted") {
        const permission = await PushNotifications.requestPermissions();
        setPermissionStatus(permission.receive);
        if (permission.receive !== "granted") {
          console.log("[Push] Permission denied");
          return;
        }
      }

      // Register for push notifications
      console.log("[Push] Calling register()...");
      await PushNotifications.register();
      
      // iOS WORKAROUND: The registration listener may not fire due to Firebase swizzling
      // Wait 3 seconds and check if we got the token, if not try to use stored token
      setTimeout(async () => {
        if (!tokenReceivedRef.current) {
          console.log("[Push] Token not received via listener after 3s, trying stored token");
          
          // Check if there's a stored token in localStorage from a previous session
          const storedToken = localStorage.getItem(FCM_TOKEN_KEY);
          if (storedToken) {
            console.log("[Push] Using stored token from localStorage:", storedToken.slice(0, 20));
            setToken(storedToken);
            await registerToken(storedToken);
          } else {
            console.log("[Push] No stored token available");
          }
        }
      }, 3000);

    } catch (error) {
      console.error("[Push] Error initializing:", error);
    }
  }, [user, token, registerToken, handleNotificationNavigation]);

  useEffect(() => {
    if (isNative && user && enabled) {
      // Small delay to ensure bridge is ready right after login
      const timer = setTimeout(() => {
        initializePushNotifications();
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [user, enabled, initializePushNotifications]);

  return {
    token,
    permissionStatus,
    requestPermissions,
    isSupported: isNative,
  };
};
