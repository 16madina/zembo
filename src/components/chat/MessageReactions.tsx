import { motion } from "framer-motion";
import { ReactionSummary } from "@/hooks/useMessageReactions";

interface MessageReactionsProps {
  reactions: ReactionSummary[];
  onReactionClick: (emoji: string) => void;
  isMe: boolean;
}

const MessageReactions = ({ reactions, onReactionClick, isMe }: MessageReactionsProps) => {
  if (!reactions.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-center gap-1 mt-1 ${isMe ? "justify-end" : "justify-start"}`}
    >
      {reactions.map((reaction) => (
        <motion.button
          key={reaction.emoji}
          onClick={() => onReactionClick(reaction.emoji)}
          className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs transition-colors ${
            reaction.hasUserReacted
              ? "bg-primary/20 border border-primary/50"
              : "bg-muted/50 border border-border/50 hover:bg-muted"
          }`}
          whileTap={{ scale: 0.9 }}
        >
          <span>{reaction.emoji}</span>
          {reaction.count > 1 && (
            <span className="text-[10px] text-muted-foreground">{reaction.count}</span>
          )}
        </motion.button>
      ))}
    </motion.div>
  );
};

export default MessageReactions;
