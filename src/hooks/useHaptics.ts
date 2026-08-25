import { useMemo } from "react";
import { haptics } from "@/lib/capacitor";

type ImpactLevel = "LIGHT" | "MEDIUM" | "HEAVY";
type NotifType = "SUCCESS" | "WARNING" | "ERROR";

/**
 * Thin, always-safe wrapper around the Capacitor haptics helper.
 * No-op on web, never throws, never blocks the calling handler.
 */
export const useHaptics = () => {
  return useMemo(
    () => ({
      selection: () => {
        void haptics.selection().catch(() => {});
      },
      impact: (level: ImpactLevel = "LIGHT") => {
        void haptics.impact(level).catch(() => {});
      },
      notify: (type: NotifType = "SUCCESS") => {
        void haptics.notification(type).catch(() => {});
      },
    }),
    []
  );
};

/** Non-hook variant for use inside plain functions/handlers outside components. */
export const tapHaptics = {
  selection: () => void haptics.selection().catch(() => {}),
  impact: (level: ImpactLevel = "LIGHT") => void haptics.impact(level).catch(() => {}),
  notify: (type: NotifType = "SUCCESS") => void haptics.notification(type).catch(() => {}),
};

export default useHaptics;
