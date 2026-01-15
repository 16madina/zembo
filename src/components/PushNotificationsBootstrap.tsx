import { useEffect, useState } from "react";
import { usePushNotifications } from "@/hooks/usePushNotifications";

const PUSH_KEY = "zembo-push";

export default function PushNotificationsBootstrap() {
  const [enabled, setEnabled] = useState(() => {
    const saved = localStorage.getItem(PUSH_KEY);
    return saved ? saved === "true" : true;
  });

  usePushNotifications({ enabled });

  useEffect(() => {
    const sync = () => {
      const saved = localStorage.getItem(PUSH_KEY);
      setEnabled(saved ? saved === "true" : true);
    };

    window.addEventListener("zembo-push-changed", sync as EventListener);
    window.addEventListener("storage", sync);

    return () => {
      window.removeEventListener("zembo-push-changed", sync as EventListener);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return null;
}
