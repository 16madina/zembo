import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Radio, Hash, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

interface CreateLiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateLive: (title: string, description?: string, tags?: string[]) => Promise<void>;
  isLoading?: boolean;
}

const SUGGESTED_TAGS = [
  "#chill",
  "#discussion",
  "#musique",
  "#cuisine",
  "#gaming",
  "#qna",
  "#fitness",
  "#voyage",
];

const CreateLiveModal = ({
  isOpen,
  onClose,
  onCreateLive,
  isLoading,
}: CreateLiveModalProps) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState("");

  const handleAddTag = (tag: string) => {
    if (!tags.includes(tag) && tags.length < 5) {
      setTags([...tags, tag]);
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleAddCustomTag = () => {
    if (customTag.trim() && tags.length < 5) {
      const formattedTag = customTag.startsWith("#")
        ? customTag.trim()
        : `#${customTag.trim()}`;
      if (!tags.includes(formattedTag)) {
        setTags([...tags, formattedTag]);
        setCustomTag("");
      }
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) return;
    await onCreateLive(title.trim(), description.trim() || undefined, tags.length > 0 ? tags : undefined);
    setTitle("");
    setDescription("");
    setTags([]);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 max-w-md mx-auto"
            initial={{ opacity: 0, scale: 0.95, y: "-45%" }}
            animate={{ opacity: 1, scale: 1, y: "-50%" }}
            exit={{ opacity: 0, scale: 0.95, y: "-45%" }}
          >
            <div className="glass rounded-3xl p-6 border border-border/50">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-destructive/20">
                    <Radio className="w-5 h-5 text-destructive" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-foreground">
                      Lancer un Live
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Partagez un moment avec votre communauté
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-full hover:bg-muted transition-colors"
                >
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>

              {/* Form */}
              <div className="space-y-4">
                {/* Title */}
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Titre du live *
                  </label>
                  <Input
                    placeholder="Ex: Soirée chill, venez discuter !"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={100}
                    className="bg-background/50"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    <FileText className="w-4 h-4 inline mr-1" />
                    Description (optionnel)
                  </label>
                  <Textarea
                    placeholder="Décrivez votre live..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    maxLength={500}
                    rows={3}
                    className="bg-background/50 resize-none"
                  />
                </div>

                {/* Tags */}
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    <Hash className="w-4 h-4 inline mr-1" />
                    Tags ({tags.length}/5)
                  </label>

                  {/* Selected Tags */}
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {tags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="cursor-pointer hover:bg-destructive/20"
                          onClick={() => handleRemoveTag(tag)}
                        >
                          {tag} ×
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Suggested Tags */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {SUGGESTED_TAGS.filter((tag) => !tags.includes(tag)).map(
                      (tag) => (
                        <Badge
                          key={tag}
                          variant="outline"
                          className="cursor-pointer hover:bg-primary/10"
                          onClick={() => handleAddTag(tag)}
                        >
                          {tag}
                        </Badge>
                      )
                    )}
                  </div>

                  {/* Custom Tag Input */}
                  <div className="flex gap-2">
                    <Input
                      placeholder="Ajouter un tag..."
                      value={customTag}
                      onChange={(e) => setCustomTag(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && handleAddCustomTag()}
                      className="bg-background/50"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleAddCustomTag}
                      disabled={!customTag.trim() || tags.length >= 5}
                    >
                      +
                    </Button>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 mt-6">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={onClose}
                  disabled={isLoading}
                >
                  Annuler
                </Button>
                <Button
                  className="flex-1 btn-gold"
                  onClick={handleSubmit}
                  disabled={!title.trim() || isLoading}
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                      Lancement...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Radio className="w-4 h-4" />
                      Go Live
                    </span>
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default CreateLiveModal;
