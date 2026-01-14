import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bug, X, ChevronDown, ChevronUp, Trash2 } from "lucide-react";

interface LogEntry {
  id: number;
  timestamp: Date;
  message: string;
  data?: unknown;
}

const DebugPanel = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const logIdRef = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Override console.log to capture [random-call] logs
    const originalLog = console.log;
    
    console.log = (...args: unknown[]) => {
      originalLog.apply(console, args);
      
      // Check if this is a [random-call] log
      if (args[0] === "[random-call]") {
        const message = String(args[1] || "");
        const data = args[2];
        
        setLogs((prev) => {
          const newLog: LogEntry = {
            id: logIdRef.current++,
            timestamp: new Date(),
            message,
            data,
          };
          // Keep only last 50 logs
          const updated = [...prev, newLog].slice(-50);
          return updated;
        });
      }
    };

    return () => {
      console.log = originalLog;
    };
  }, []);

  // Auto-scroll to bottom when new logs appear
  useEffect(() => {
    if (scrollRef.current && isOpen && !isMinimized) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, isOpen, isMinimized]);

  const formatTime = (date: Date) => {
    const time = date.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    const ms = String(date.getMilliseconds()).padStart(3, "0");
    return `${time}.${ms}`;
  };

  const formatData = (data: unknown): string => {
    if (data === undefined) return "";
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  };

  const clearLogs = () => {
    setLogs([]);
  };

  return (
    <>
      {/* Debug button */}
      <motion.button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 right-4 z-50 w-12 h-12 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg"
        whileTap={{ scale: 0.9 }}
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1 }}
      >
        <Bug className="w-5 h-5" />
        {logs.length > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-yellow-400 text-black text-xs flex items-center justify-center font-bold">
            {logs.length > 99 ? "99+" : logs.length}
          </span>
        )}
      </motion.button>

      {/* Debug panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className={`fixed left-2 right-2 z-[100] bg-black/95 border border-red-500/50 rounded-t-2xl shadow-2xl ${
              isMinimized ? "bottom-20 h-12" : "bottom-20 max-h-[60vh]"
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-red-500/30">
              <div className="flex items-center gap-2">
                <Bug className="w-4 h-4 text-red-500" />
                <span className="text-red-500 font-mono font-bold text-sm">
                  iOS Debug [{logs.length}]
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={clearLogs}
                  className="p-1.5 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="p-1.5 rounded bg-gray-700 text-gray-300 hover:bg-gray-600"
                >
                  {isMinimized ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded bg-gray-700 text-gray-300 hover:bg-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Logs */}
            {!isMinimized && (
              <div
                ref={scrollRef}
                className="overflow-y-auto max-h-[calc(60vh-48px)] p-2 font-mono text-xs"
              >
                {logs.length === 0 ? (
                  <div className="text-gray-500 text-center py-8">
                    Aucun log [random-call] capturé...
                    <br />
                    <span className="text-gray-600">
                      Lance une recherche pour voir les logs
                    </span>
                  </div>
                ) : (
                  logs.map((log) => (
                    <div
                      key={log.id}
                      className="mb-2 p-2 rounded bg-gray-900/50 border-l-2 border-red-500/50"
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-gray-500 shrink-0">
                          {formatTime(log.timestamp)}
                        </span>
                        <span className="text-green-400 font-semibold">
                          {log.message}
                        </span>
                      </div>
                      {log.data !== undefined && (
                        <pre className="mt-1 text-yellow-300/80 whitespace-pre-wrap break-all overflow-x-auto">
                          {formatData(log.data)}
                        </pre>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default DebugPanel;
