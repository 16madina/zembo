import { X, Star, Heart } from "lucide-react";

interface ActionButtonsProps {
  onPass: () => void;
  onSuperLike: () => void;
  onLike: () => void;
}

const ActionButtons = ({ onPass, onSuperLike, onLike }: ActionButtonsProps) => {
  return (
    <div className="flex items-center justify-center gap-6">
      {/* Pass Button */}
      <button
        onClick={onPass}
        className="p-5 bg-card border border-border rounded-full text-destructive transition-all duration-200 hover:scale-110 hover:bg-destructive/10 glow-red hover:glow-red"
      >
        <X className="w-8 h-8" strokeWidth={3} />
      </button>

      {/* Super Like Button */}
      <button
        onClick={onSuperLike}
        className="p-4 bg-card border border-border rounded-full text-accent transition-all duration-200 hover:scale-110 hover:bg-accent/10 glow-blue hover:glow-blue"
      >
        <Star className="w-6 h-6" fill="currentColor" />
      </button>

      {/* Like Button */}
      <button
        onClick={onLike}
        className="p-5 btn-gold rounded-full transition-all duration-200 hover:scale-110"
      >
        <Heart className="w-8 h-8 text-primary-foreground" fill="currentColor" />
      </button>
    </div>
  );
};

export default ActionButtons;
