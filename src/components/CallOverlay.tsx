import VoiceCallModal from "@/components/VoiceCallModal";
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

  const isOpen = callState.isRinging || callState.isInCall;
  if (!isOpen) return null;

  return (
    <VoiceCallModal
      isOpen={isOpen}
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
  );
}
