import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flag, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { tapHaptics } from "@/hooks/useHaptics";

export type ReportContentType = "profile" | "live" | "room" | "message";

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportedUserId: string;
  contentType?: ReportContentType;
  contentId?: string;
}

const reasons = [
  { id: "inappropriate", label: "Contenu inapproprié", emoji: "🔞" },
  { id: "harassment", label: "Harcèlement", emoji: "😠" },
  { id: "spam", label: "Spam / Publicité", emoji: "📢" },
  { id: "fake_profile", label: "Faux profil", emoji: "🎭" },
  { id: "other", label: "Autre", emoji: "⚠️" },
];

const ReportModal = ({
  isOpen,
  onClose,
  reportedUserId,
  contentType = "profile",
  contentId,
}: ReportModalProps) => {
  const { user } = useAuth();
  const [selected, setSelected] = useState<string | null>(null);
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const close = () => {
    if (submitting) return;
    tapHaptics.impact("LIGHT");
    setSelected(null);
    setDetails("");
    onClose();
  };

  const submit = async () => {
    if (!selected || !user?.id) return;
    tapHaptics.impact("MEDIUM");
    setSubmitting(true);
    try {
      const { error } = await (supabase as any).from("content_reports").insert({
        reporter_id: user.id,
        reported_user_id: reportedUserId,
        content_type: contentType,
        content_id: contentId ?? null,
        reason: selected,
        details: details || null,
      });
      if (error) throw error;
      tapHaptics.notify("SUCCESS");
      toast.success("Signalement envoyé", {
        description: "Notre équipe va examiner votre signalement.",
      });
      close();
    } catch (e) {
      console.error(e);
      tapHaptics.notify("ERROR");
      toast.error("Impossible d'envoyer le signalement");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[10000] flex items-end justify-center bg-black/60 backdrop-blur-sm"
          onClick={close}
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-background rounded-t-3xl p-6 pb-10"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <Flag className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-xl font-bold text-foreground">Signaler</h2>
              </div>
              <button
                onClick={close}
                className="w-8 h-8 rounded-full glass flex items-center justify-center"
                disabled={submitting}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-sm text-muted-foreground mb-4">
              Pour quelle raison souhaitez-vous signaler ce contenu ?
            </p>

            <div className="grid grid-cols-1 gap-2 mb-4">
              {reasons.map((r) => (
                <button
                  key={r.id}
                  onClick={() => { tapHaptics.selection(); setSelected(r.id); }}
                  disabled={submitting}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                    selected === r.id
                      ? "bg-primary/20 border-2 border-primary"
                      : "glass hover:bg-muted"
                  }`}
                >
                  <span className="text-xl">{r.emoji}</span>
                  <span className="font-medium text-foreground">{r.label}</span>
                </button>
              ))}
            </div>

            <Textarea
              placeholder="Précisez si besoin (optionnel)"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={3}
              className="resize-none mb-4"
              disabled={submitting}
            />

            <Button
              onClick={submit}
              disabled={!selected || submitting}
              className="w-full gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Envoi...
                </>
              ) : (
                <>
                  <Flag className="w-4 h-4" />
                  Envoyer le signalement
                </>
              )}
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ReportModal;
