import React, { createContext, useContext } from "react";
import { useVoiceCall } from "@/hooks/useVoiceCall";

type VoiceCallContextValue = ReturnType<typeof useVoiceCall>;

const VoiceCallContext = createContext<VoiceCallContextValue | null>(null);

export function VoiceCallProvider({ children }: { children: React.ReactNode }) {
  const value = useVoiceCall();
  return <VoiceCallContext.Provider value={value}>{children}</VoiceCallContext.Provider>;
}

export function useVoiceCallContext() {
  const ctx = useContext(VoiceCallContext);
  if (!ctx) {
    throw new Error("useVoiceCallContext must be used within VoiceCallProvider");
  }
  return ctx;
}
