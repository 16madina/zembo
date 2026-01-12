import { motion } from "framer-motion";
import { X, Mic, Image as ImageIcon } from "lucide-react";

interface ReplyMessage {
  id: string;
  text?: string;
  image?: string;
  audioUrl?: string;
  senderName: string;
  isMe: boolean;
}

interface ReplyPreviewProps {
  replyTo: ReplyMessage;
  onCancel: () => void;
}

const ReplyPreview = ({ replyTo, onCancel }: ReplyPreviewProps) => {
  const getPreviewContent = () => {
    if (replyTo.audioUrl) {
      return (
        <span className="flex items-center gap-1 text-muted-foreground">
          <Mic className="w-3 h-3" />
          Message vocal
        </span>
      );
    }
    if (replyTo.image && !replyTo.text) {
      return (
        <span className="flex items-center gap-1 text-muted-foreground">
          <ImageIcon className="w-3 h-3" />
          Photo
        </span>
      );
    }
    return (
      <span className="text-muted-foreground line-clamp-1">
        {replyTo.text}
      </span>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, height: 0 }}
      animate={{ opacity: 1, y: 0, height: "auto" }}
      exit={{ opacity: 0, y: 10, height: 0 }}
      className="px-4 py-2 border-t border-border/50 bg-muted/30"
    >
      <div className="flex items-center gap-3">
        <div className="w-1 h-10 bg-primary rounded-full flex-shrink-0" />
        
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-primary">
            {replyTo.isMe ? "Vous" : replyTo.senderName}
          </p>
          <div className="text-sm truncate">
            {getPreviewContent()}
          </div>
        </div>

        {replyTo.image && (
          <img 
            src={replyTo.image} 
            alt="" 
            className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
          />
        )}

        <motion.button
          onClick={onCancel}
          className="p-1.5 rounded-full hover:bg-muted/50 tap-highlight flex-shrink-0"
          whileTap={{ scale: 0.9 }}
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </motion.button>
      </div>
    </motion.div>
  );
};

export default ReplyPreview;
