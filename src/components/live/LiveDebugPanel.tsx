import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bug, X, RefreshCw, Radio, Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { LiveKitDebugInfo } from "@/hooks/useLiveKit";

interface LiveDebugPanelProps {
  liveKitDebug: LiveKitDebugInfo;
  stageConnected: boolean;
  stageConnecting: boolean;
  isOnStage: boolean;
  onReconnectLiveKit: () => void;
  onResyncTracks: () => void;
}

const LiveDebugPanel = ({
  liveKitDebug,
  stageConnected,
  stageConnecting,
  isOnStage,
  onReconnectLiveKit,
  onResyncTracks,
}: LiveDebugPanelProps) => {
  const [isOpen, setIsOpen] = useState(false);

  // Only show in development
  if (import.meta.env.PROD) return null;

  return (
    <>
      {/* Debug Toggle Button */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(true)}
        className="fixed top-20 left-4 w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 border border-primary/30"
      >
        <Bug className="w-4 h-4 text-primary" />
      </motion.button>

      {/* Debug Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, x: -200 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -200 }}
            className="fixed top-16 left-4 w-72 max-h-[60vh] bg-background/95 backdrop-blur-lg rounded-lg border border-border shadow-xl z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-border bg-muted/50">
              <span className="text-sm font-semibold flex items-center gap-2">
                <Bug className="w-4 h-4 text-primary" />
                LiveKit Debug
              </span>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6"
                onClick={() => setIsOpen(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Content */}
            <div className="p-3 space-y-3 overflow-y-auto max-h-[50vh] text-xs">
              {/* Role & Room */}
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Role:</span>
                  <span className={`font-mono ${liveKitDebug.role === "streamer" ? "text-primary" : "text-blue-400"}`}>
                    {liveKitDebug.role}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Room:</span>
                  <span className="font-mono text-foreground truncate max-w-[150px]">
                    {liveKitDebug.roomName || "N/A"}
                  </span>
                </div>
              </div>

              {/* Connection Status */}
              <div className="p-2 rounded bg-muted/50 space-y-1">
                <div className="flex items-center gap-2 mb-2">
                  {liveKitDebug.isConnected ? (
                    <Wifi className="w-3 h-3 text-green-500" />
                  ) : liveKitDebug.isConnecting ? (
                    <Radio className="w-3 h-3 text-yellow-500 animate-pulse" />
                  ) : (
                    <WifiOff className="w-3 h-3 text-destructive" />
                  )}
                  <span className="font-semibold">LiveKit Status</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Connected:</span>
                  <span className={liveKitDebug.isConnected ? "text-green-500" : "text-destructive"}>
                    {liveKitDebug.isConnected ? "Yes" : "No"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Connecting:</span>
                  <span className={liveKitDebug.isConnecting ? "text-yellow-500" : "text-muted-foreground"}>
                    {liveKitDebug.isConnecting ? "Yes" : "No"}
                  </span>
                </div>
                {liveKitDebug.error && (
                  <div className="text-destructive mt-1 p-1 bg-destructive/10 rounded text-[10px]">
                    {liveKitDebug.error}
                  </div>
                )}
              </div>

              {/* Participants */}
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Participants:</span>
                  <span className="font-mono text-foreground">{liveKitDebug.numParticipants}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Remote:</span>
                  <span className="font-mono text-foreground">{liveKitDebug.remoteParticipants}</span>
                </div>
              </div>

              {/* Tracks */}
              <div className="p-2 rounded bg-muted/50 space-y-1">
                <span className="font-semibold block mb-1">Tracks</span>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Local Video Pubs:</span>
                  <span className="font-mono text-foreground">{liveKitDebug.localVideoPublications}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Local Audio Pubs:</span>
                  <span className="font-mono text-foreground">{liveKitDebug.localAudioPublications}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Remote Video Tracks:</span>
                  <span className="font-mono text-foreground">{liveKitDebug.remoteVideoTracks}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Has Remote Video:</span>
                  <span className={liveKitDebug.hasRemoteVideoTrack ? "text-green-500" : "text-yellow-500"}>
                    {liveKitDebug.hasRemoteVideoTrack ? "Yes" : "No"}
                  </span>
                </div>
              </div>

              {/* Stage Status */}
              <div className="p-2 rounded bg-muted/50 space-y-1">
                <span className="font-semibold block mb-1">Stage (WebRTC)</span>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">On Stage:</span>
                  <span className={isOnStage ? "text-green-500" : "text-muted-foreground"}>
                    {isOnStage ? "Yes" : "No"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Connected:</span>
                  <span className={stageConnected ? "text-green-500" : "text-muted-foreground"}>
                    {stageConnected ? "Yes" : "No"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Connecting:</span>
                  <span className={stageConnecting ? "text-yellow-500" : "text-muted-foreground"}>
                    {stageConnecting ? "Yes" : "No"}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2 pt-2 border-t border-border">
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full text-xs"
                  onClick={onReconnectLiveKit}
                >
                  <RefreshCw className="w-3 h-3 mr-2" />
                  Reconnect LiveKit
                </Button>
                {liveKitDebug.role === "viewer" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full text-xs"
                    onClick={onResyncTracks}
                  >
                    <Radio className="w-3 h-3 mr-2" />
                    Resync Remote Tracks
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default LiveDebugPanel;
