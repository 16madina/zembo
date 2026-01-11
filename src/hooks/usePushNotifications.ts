import { useEffect, useState, useCallback } from "react";
import { isNative } from "@/lib/capacitor";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

// Dynamic import for Push Notifications to avoid errors on web
let PushNotifications: any = null;

if (isNative) {
  import("@capacitor/push-notifications").then((module) => {
    PushNotifications = module.PushNotifications;
  });
}

export interface PushNotificationToken {
  value: string;
}

export const usePushNotifications = () => {
  const { user } = useAuth();
  const [token, setToken] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<string>("prompt");

  const registerToken = useCallback(async (fcmToken: string) => {
    if (!user) return;

    try {
      // Store the FCM token in user's profile or a dedicated table
      const { error } = await supabase
        .from("profiles")
        .update({ 
          // We'll add this column or use metadata
          // For now, we'll just log it
        })
        .eq("user_id", user.id);

      if (error) {
        console.error("Error saving FCM token:", error);
      } else {
        console.log("FCM token registered successfully");
      }
    } catch (err) {
      console.error("Error registering token:", err);
    }
  }, [user]);

  const requestPermissions = useCallback(async () => {
    if (!isNative || !PushNotifications) {
      console.log("Push notifications not available on web");
      return false;
    }

    try {
      const permission = await PushNotifications.requestPermissions();
      setPermissionStatus(permission.receive);

      if (permission.receive === "granted") {
        await PushNotifications.register();
        return true;
      } else {
        toast.error("Permission refusée pour les notifications");
        return false;
      }
    } catch (error) {
      console.error("Error requesting push permissions:", error);
      return false;
    }
  }, []);

  const initializePushNotifications = useCallback(async () => {
    if (!isNative || !PushNotifications) return;

    // Check current permission status
    const permission = await PushNotifications.checkPermissions();
    setPermissionStatus(permission.receive);

    if (permission.receive === "granted") {
      await PushNotifications.register();
    }

    // Listen for registration success
    PushNotifications.addListener("registration", (token: PushNotificationToken) => {
      console.log("Push registration success, token:", token.value);
      setToken(token.value);
      registerToken(token.value);
    });

    // Listen for registration errors
    PushNotifications.addListener("registrationError", (error: any) => {
      console.error("Push registration error:", error);
      toast.error("Erreur lors de l'enregistrement des notifications");
    });

    // Listen for push notifications received while app is in foreground
    PushNotifications.addListener("pushNotificationReceived", (notification: any) => {
      console.log("Push notification received:", notification);
      toast(notification.title, {
        description: notification.body,
      });
    });

    // Listen for push notification action (user tapped on notification)
    PushNotifications.addListener("pushNotificationActionPerformed", (notification: any) => {
      console.log("Push notification action performed:", notification);
      // Handle navigation based on notification data
      const data = notification.notification.data;
      if (data?.type === "match") {
        window.location.href = "/messages";
      } else if (data?.type === "live") {
        window.location.href = `/live/${data.liveId}`;
      }
    });
  }, [registerToken]);

  useEffect(() => {
    if (isNative && user) {
      // Small delay to ensure PushNotifications module is loaded
      const timer = setTimeout(() => {
        initializePushNotifications();
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [user, initializePushNotifications]);

  return {
    token,
    permissionStatus,
    requestPermissions,
    isSupported: isNative,
  };
};
