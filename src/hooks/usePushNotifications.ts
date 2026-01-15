import { useEffect, useState, useCallback } from "react";
import { isNative } from "@/lib/capacitor";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

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
  const [token, setToken] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<string>("prompt");
  const enabled = options.enabled ?? true;

  const registerToken = useCallback(async (fcmToken: string) => {
    if (!user) return;

    try {
      // Detect device type
      const userAgent = navigator.userAgent.toLowerCase();
      let deviceType = "unknown";
      if (/iphone|ipad|ipod/.test(userAgent)) {
        deviceType = "ios";
      } else if (/android/.test(userAgent)) {
        deviceType = "android";
      }

      // Generate a simple device name
      const deviceName = `${deviceType.toUpperCase()} Device`;

      // Upsert device token in user_devices table
      const { error } = await supabase
        .from("user_devices")
        .upsert(
          {
            user_id: user.id,
            fcm_token: fcmToken,
            device_type: deviceType,
            device_name: deviceName,
            last_used_at: new Date().toISOString(),
          },
          {
            onConflict: "user_id,fcm_token",
          }
        );

      if (error) {
        console.error("Error saving device token:", error);
      } else {
        console.log("Device token registered successfully for", deviceType);
      }
    } catch (err) {
      console.error("Error registering token:", err);
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
    // DEBUG TOAST 1: Hook started
    console.log("DEBUG: initializePushNotifications called");

    const PushNotifications = await getPushNotifications();
    if (!PushNotifications) {
      console.log("DEBUG: PushNotifications not available");
      toast.error("❌ PushNotifications non disponible", { duration: 3000 });
      return;
    }
    
    if (!user) {
      console.log("DEBUG: User not connected");
      toast.error("❌ User non connecté", { duration: 3000 });
      return;
    }

    toast.info("🔔 Push init - user: " + user.id.slice(0, 8), { duration: 2000 });

    try {
      // Avoid duplicate listeners on fast refresh / re-mounts
      await PushNotifications.removeAllListeners();

      // Listen for registration success
      PushNotifications.addListener("registration", (tokenData: PushNotificationToken) => {
        console.log("DEBUG: registration listener TRIGGERED, token:", tokenData.value);
        toast.success("🎉 TOKEN REÇU via listener! " + tokenData.value.slice(0, 15) + "...", { 
          duration: 8000 
        });
        setToken(tokenData.value);
        registerToken(tokenData.value);
      });

      // Listen for registration errors
      PushNotifications.addListener("registrationError", (error: any) => {
        console.error("DEBUG: registrationError:", error);
        toast.error("❌ Erreur registration: " + JSON.stringify(error), { duration: 8000 });
      });

      // Listen for push notifications received while app is in foreground
      PushNotifications.addListener("pushNotificationReceived", (notification: any) => {
        console.log("DEBUG: pushNotificationReceived:", notification);
        toast.success("📬 Notif reçue: " + notification.title, { duration: 5000 });

        const data: NotificationData = notification.data || {};

        // Show in-app toast with action
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
        console.log("DEBUG: pushNotificationActionPerformed:", notification);
        toast.info("👆 Notif tapped", { duration: 3000 });

        const data: NotificationData = notification.notification?.data || {};
        handleNotificationNavigation(data);
      });

      // Check current permission status
      const current = await PushNotifications.checkPermissions();
      setPermissionStatus(current.receive);
      toast.info("🔐 Permission: " + current.receive, { duration: 2000 });

      if (current.receive !== "granted") {
        const permission = await PushNotifications.requestPermissions();
        setPermissionStatus(permission.receive);
        if (permission.receive !== "granted") {
          toast.error("❌ Permission refusée", { duration: 5000 });
          return;
        }
      }

      // Register for push notifications - this should trigger the registration listener
      toast.info("📝 Appel register()...", { duration: 2000 });
      await PushNotifications.register();
      
      // WORKAROUND: On iOS, the token might already exist from Firebase swizzling
      // Try to get the delivery status which contains the token on some versions
      setTimeout(async () => {
        // If we still don't have a token after 3 seconds, try to get it another way
        if (!token) {
          console.log("DEBUG: Token not received after 3s, checking getDeliveredNotifications...");
          toast.warning("⏰ Token non reçu via listener après 3s", { duration: 3000 });
          
          // Try to check if we can get notifications (this confirms registration worked)
          try {
            const delivered = await PushNotifications.getDeliveredNotifications();
            console.log("DEBUG: getDeliveredNotifications worked, registration seems OK:", delivered);
            toast.info("📋 getDeliveredNotifications OK: " + delivered.notifications.length + " notifs", { duration: 3000 });
          } catch (e) {
            console.error("DEBUG: getDeliveredNotifications failed:", e);
          }
        }
      }, 3000);

    } catch (error) {
      console.error("DEBUG: Error initializing push notifications:", error);
      toast.error("💥 Erreur init: " + String(error), { duration: 8000 });
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
