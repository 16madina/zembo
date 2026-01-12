import { Mic, Image as ImageIcon } from "lucide-react";

interface QuotedMessageProps {
  senderName: string;
  text?: string;
  image?: string;
  audioUrl?: string;
  isMe: boolean;
  isOwnMessage: boolean;
}

const QuotedMessage = ({ 
  senderName, 
  text, 
  image, 
  audioUrl, 
  isMe, 
  isOwnMessage 
}: QuotedMessageProps) => {
  const getContent = () => {
    if (audioUrl) {
      return (
        <span className="flex items-center gap-1">
          <Mic className="w-3 h-3" />
          Message vocal
        </span>
      );
    }
    if (image && !text) {
      return (
        <span className="flex items-center gap-1">
          <ImageIcon className="w-3 h-3" />
          Photo
        </span>
      );
    }
    return <span className="line-clamp-2">{text}</span>;
  };

  return (
    <div 
      className={`flex gap-2 mb-2 p-2 rounded-lg ${
        isOwnMessage 
          ? "bg-primary-foreground/10" 
          : "bg-muted/50"
      }`}
    >
      <div 
        className={`w-0.5 rounded-full flex-shrink-0 ${
          isOwnMessage ? "bg-primary-foreground/50" : "bg-primary"
        }`} 
      />
      
      <div className="flex-1 min-w-0">
        <p 
          className={`text-[10px] font-medium mb-0.5 ${
            isOwnMessage ? "text-primary-foreground/70" : "text-primary"
          }`}
        >
          {isMe ? "Vous" : senderName}
        </p>
        <div 
          className={`text-xs ${
            isOwnMessage ? "text-primary-foreground/60" : "text-muted-foreground"
          }`}
        >
          {getContent()}
        </div>
      </div>

      {image && (
        <img 
          src={image} 
          alt="" 
          className="w-8 h-8 rounded object-cover flex-shrink-0"
        />
      )}
    </div>
  );
};

export default QuotedMessage;
