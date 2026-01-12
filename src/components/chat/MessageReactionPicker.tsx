import { motion, AnimatePresence } from "framer-motion";

const REACTION_EMOJIS = ["❤️", "👍", "😂", "😮", "😢", "🙏"];

interface MessageReactionPickerProps {
  isOpen: boolean;
  onSelect: (emoji: string) => void;
  onClose: () => void;
  position: "left" | "right";
}

const MessageReactionPicker = ({
  isOpen,
  onSelect,
  onClose,
  position,
}: MessageReactionPickerProps) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100]"
            onClick={onClose}
          />
          
          {/* Picker */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 10 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className={`absolute bottom-full mb-2 z-[101] ${
              position === "right" ? "right-0" : "left-0"
            }`}
          >
            <div className="flex items-center gap-1 p-2 rounded-full glass-strong shadow-lg border border-border/50">
              {REACTION_EMOJIS.map((emoji) => (
                <motion.button
                  key={emoji}
                  onClick={() => {
                    onSelect(emoji);
                    onClose();
                  }}
                  className="w-10 h-10 flex items-center justify-center text-xl rounded-full hover:bg-white/10 transition-colors"
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.9 }}
                >
                  {emoji}
                </motion.button>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default MessageReactionPicker;
