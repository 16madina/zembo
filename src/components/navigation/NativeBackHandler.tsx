import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { isNative } from "@/lib/capacitor";
import { isTabRoute } from "./PageTransition";

/** Wires the Android hardware back button to sensible in-app navigation. */
const NativeBackHandler = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isNative) return;

    let remove: (() => void) | undefined;
    let cancelled = false;

    (async () => {
      try {
        const { App } = await import("@capacitor/app");
        const handle = await App.addListener("backButton", () => {
          // 1) Close any open modal / sheet first
          const openOverlay = document.querySelector(
            '[role="dialog"], [role="alertdialog"], [data-state="open"][data-radix-popper-content-wrapper]'
          );
          if (openOverlay) {
            document.dispatchEvent(
              new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
            );
            return;
          }

          const path = window.location.pathname;

          // 2) Child page -> go back
          if (!isTabRoute(path)) {
            navigate(-1);
            return;
          }

          // 3) Main tab -> back to home, or exit from home
          if (path !== "/") {
            navigate("/");
            return;
          }

          void App.exitApp();
        });
        if (cancelled) {
          void handle.remove();
        } else {
          remove = () => void handle.remove();
        }
      } catch {
        // @capacitor/app unavailable — nothing to wire up
      }
    })();

    return () => {
      cancelled = true;
      remove?.();
    };
  }, [navigate, location.pathname]);

  return null;
};

export default NativeBackHandler;
