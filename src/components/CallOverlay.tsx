import { useState } from "react";
import VoiceCallModal from "@/components/VoiceCallModal";
import IncomingCallBanner from "@/components/IncomingCallBanner";
import { useVoiceCallContext } from "@/contexts/VoiceCallContext";

export default function CallOverlay() {
  const {
    callState,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    formatDuration,
    remoteAudioRef,
    localStreamRef,
    remoteStreamRef,
  } = useVoiceCallContext();

  // Show compact banner for incoming calls, full modal when in call or outgoing
  const showBanner = callState.isRinging && callState.isIncoming;
  const showFullModal = callState.isInCall || (callState.isRinging && !callState.isIncoming);

  return (
    <>
      {/* Compact banner for incoming calls */}
      <IncomingCallBanner
        isVisible={showBanner}
        callerName={callState.remoteUserName || "Inconnu"}
        callerPhoto={callState.remoteUserPhoto}
        callType={callState.callType}
        onAccept={acceptCall}
        onReject={rejectCall}
      />

      {/* Full modal for active calls or outgoing calls */}
      {showFullModal && (
        <VoiceCallModal
          isOpen={true}
          isRinging={callState.isRinging}
          isIncoming={callState.isIncoming}
          isInCall={callState.isInCall}
          callType={callState.callType}
          remoteUserName={callState.remoteUserName}
          remoteUserPhoto={callState.remoteUserPhoto}
          isMuted={callState.isMuted}
          duration={callState.duration}
          onAccept={acceptCall}
          onReject={rejectCall}
          onEnd={endCall}
          onToggleMute={toggleMute}
          formatDuration={formatDuration}
          remoteAudioRef={remoteAudioRef}
          localStreamRef={localStreamRef}
          remoteStreamRef={remoteStreamRef}
        />
      )}
    </>
  );
}
