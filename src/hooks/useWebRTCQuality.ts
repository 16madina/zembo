import { useState, useEffect, useCallback, useRef } from "react";

export type ConnectionQuality = "excellent" | "good" | "medium" | "poor" | "unknown";

interface WebRTCStats {
  roundTripTime: number | null; // ms
  packetLoss: number | null; // percentage
  jitter: number | null; // ms
  bitrate: number | null; // kbps
  framesPerSecond: number | null;
}

interface UseWebRTCQualityResult {
  quality: ConnectionQuality;
  stats: WebRTCStats;
  qualityScore: number; // 0-100
}

const DEFAULT_STATS: WebRTCStats = {
  roundTripTime: null,
  packetLoss: null,
  jitter: null,
  bitrate: null,
  framesPerSecond: null,
};

export const useWebRTCQuality = (
  peerConnection: RTCPeerConnection | null,
  enabled: boolean = true
): UseWebRTCQualityResult => {
  const [quality, setQuality] = useState<ConnectionQuality>("unknown");
  const [stats, setStats] = useState<WebRTCStats>(DEFAULT_STATS);
  const [qualityScore, setQualityScore] = useState(0);
  
  const prevBytesReceivedRef = useRef<number>(0);
  const prevTimestampRef = useRef<number>(0);
  const packetsReceivedRef = useRef<number>(0);
  const packetsLostRef = useRef<number>(0);

  const calculateQuality = useCallback((currentStats: WebRTCStats): { quality: ConnectionQuality; score: number } => {
    let score = 100;

    // RTT scoring (ideal < 100ms, acceptable < 300ms)
    if (currentStats.roundTripTime !== null) {
      if (currentStats.roundTripTime < 50) {
        score -= 0;
      } else if (currentStats.roundTripTime < 100) {
        score -= 5;
      } else if (currentStats.roundTripTime < 200) {
        score -= 15;
      } else if (currentStats.roundTripTime < 300) {
        score -= 25;
      } else {
        score -= 40;
      }
    }

    // Packet loss scoring (ideal < 1%, acceptable < 5%)
    if (currentStats.packetLoss !== null) {
      if (currentStats.packetLoss < 0.5) {
        score -= 0;
      } else if (currentStats.packetLoss < 1) {
        score -= 5;
      } else if (currentStats.packetLoss < 2) {
        score -= 15;
      } else if (currentStats.packetLoss < 5) {
        score -= 25;
      } else {
        score -= 40;
      }
    }

    // Jitter scoring (ideal < 30ms, acceptable < 100ms)
    if (currentStats.jitter !== null) {
      if (currentStats.jitter < 20) {
        score -= 0;
      } else if (currentStats.jitter < 50) {
        score -= 5;
      } else if (currentStats.jitter < 100) {
        score -= 10;
      } else {
        score -= 20;
      }
    }

    // FPS scoring for video quality
    if (currentStats.framesPerSecond !== null) {
      if (currentStats.framesPerSecond >= 25) {
        score -= 0;
      } else if (currentStats.framesPerSecond >= 20) {
        score -= 5;
      } else if (currentStats.framesPerSecond >= 15) {
        score -= 10;
      } else {
        score -= 15;
      }
    }

    // Clamp score
    score = Math.max(0, Math.min(100, score));

    // Determine quality level
    let quality: ConnectionQuality;
    if (score >= 85) {
      quality = "excellent";
    } else if (score >= 70) {
      quality = "good";
    } else if (score >= 50) {
      quality = "medium";
    } else {
      quality = "poor";
    }

    return { quality, score };
  }, []);

  useEffect(() => {
    if (!peerConnection || !enabled) {
      setQuality("unknown");
      setStats(DEFAULT_STATS);
      setQualityScore(0);
      return;
    }

    const getStats = async () => {
      try {
        const report = await peerConnection.getStats();
        const newStats: WebRTCStats = { ...DEFAULT_STATS };
        const now = Date.now();

        report.forEach((stat) => {
          // Get RTT from candidate-pair
          if (stat.type === "candidate-pair" && stat.state === "succeeded") {
            if (stat.currentRoundTripTime !== undefined) {
              newStats.roundTripTime = stat.currentRoundTripTime * 1000; // Convert to ms
            }
          }

          // Get inbound RTP stats for packet loss and jitter
          if (stat.type === "inbound-rtp" && stat.kind === "video") {
            if (stat.packetsReceived !== undefined && stat.packetsLost !== undefined) {
              const totalPackets = stat.packetsReceived + stat.packetsLost;
              if (totalPackets > 0) {
                // Calculate incremental packet loss
                const newPacketsReceived = stat.packetsReceived - packetsReceivedRef.current;
                const newPacketsLost = stat.packetsLost - packetsLostRef.current;
                const newTotal = newPacketsReceived + newPacketsLost;
                
                if (newTotal > 0) {
                  newStats.packetLoss = (newPacketsLost / newTotal) * 100;
                }
                
                packetsReceivedRef.current = stat.packetsReceived;
                packetsLostRef.current = stat.packetsLost;
              }
            }

            if (stat.jitter !== undefined) {
              newStats.jitter = stat.jitter * 1000; // Convert to ms
            }

            if (stat.framesPerSecond !== undefined) {
              newStats.framesPerSecond = stat.framesPerSecond;
            }

            // Calculate bitrate
            if (stat.bytesReceived !== undefined && prevTimestampRef.current > 0) {
              const byteDiff = stat.bytesReceived - prevBytesReceivedRef.current;
              const timeDiff = (now - prevTimestampRef.current) / 1000; // seconds
              if (timeDiff > 0) {
                newStats.bitrate = (byteDiff * 8) / timeDiff / 1000; // kbps
              }
            }
            prevBytesReceivedRef.current = stat.bytesReceived || 0;
            prevTimestampRef.current = now;
          }
        });

        setStats(newStats);
        const { quality: newQuality, score } = calculateQuality(newStats);
        setQuality(newQuality);
        setQualityScore(score);
      } catch (err) {
        console.error("[WebRTCQuality] Error getting stats:", err);
      }
    };

    // Poll stats every 2 seconds
    const interval = setInterval(getStats, 2000);
    getStats(); // Initial call

    return () => clearInterval(interval);
  }, [peerConnection, enabled, calculateQuality]);

  return { quality, stats, qualityScore };
};
