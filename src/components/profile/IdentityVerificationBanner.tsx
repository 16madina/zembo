import { motion } from "framer-motion";
import { Clock, AlertTriangle, ShieldCheck, FileText, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface IdentityVerificationBannerProps {
  status: "none" | "pending" | "approved" | "rejected";
  rejectionReason?: string | null;
  onRetry?: () => void;
}

const IdentityVerificationBanner = ({ status, rejectionReason, onRetry }: IdentityVerificationBannerProps) => {
  const navigate = useNavigate();

  if (status === "approved" || status === "none") {
    return null;
  }

  if (status === "pending") {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-4 mb-4 p-4 rounded-2xl bg-amber-500/20 border border-amber-500/30"
      >
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-full bg-amber-500/30">
            <Clock className="w-5 h-5 text-amber-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-amber-400 mb-1">
              Vérification en cours
            </h3>
            <p className="text-sm text-amber-300/80">
              Votre pièce d'identité est en cours d'examen par notre équipe. 
              Vous pourrez interagir avec les autres utilisateurs une fois votre identité vérifiée.
            </p>
            <div className="mt-3 flex items-center gap-2 text-xs text-amber-400/70">
              <FileText className="w-4 h-4" />
              <span>Délai estimé : 24-48 heures</span>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  if (status === "rejected") {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-4 mb-4 p-4 rounded-2xl bg-destructive/20 border border-destructive/30"
      >
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-full bg-destructive/30">
            <AlertTriangle className="w-5 h-5 text-destructive" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-destructive mb-1">
              Vérification refusée
            </h3>
            <p className="text-sm text-destructive/80">
              {rejectionReason || "Votre demande de vérification a été refusée. Veuillez soumettre de nouveaux documents."}
            </p>
            <Button
              onClick={onRetry}
              size="sm"
              variant="outline"
              className="mt-3 border-destructive/50 text-destructive hover:bg-destructive/10"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Nouvelle demande
            </Button>
          </div>
        </div>
      </motion.div>
    );
  }

  return null;
};

export default IdentityVerificationBanner;
