import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Search,
  Filter,
  Zap,
  MessageCircle,
} from "lucide-react";

interface Challenge {
  id: string;
  type: string;
  content: string;
  category: string;
  difficulty: number;
  is_active: boolean;
  created_at: string;
}

interface ChallengeFormData {
  type: "truth" | "dare";
  content: string;
  category: string;
  difficulty: number;
  is_active: boolean;
}

const CATEGORIES = ["fun", "romantique", "osé", "aventure", "créatif"];
const DIFFICULTIES = [
  { value: 1, label: "Facile", color: "bg-green-500" },
  { value: 2, label: "Moyen", color: "bg-yellow-500" },
  { value: 3, label: "Difficile", color: "bg-orange-500" },
  { value: 4, label: "Extrême", color: "bg-red-500" },
];

const AdminTruthOrDareTab = () => {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "truth" | "dare">("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterActive, setFilterActive] = useState<"all" | "active" | "inactive">("all");

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingChallenge, setEditingChallenge] = useState<Challenge | null>(null);
  const [deletingChallengeId, setDeletingChallengeId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<ChallengeFormData>({
    type: "truth",
    content: "",
    category: "fun",
    difficulty: 1,
    is_active: true,
  });

  useEffect(() => {
    fetchChallenges();
  }, []);

  const fetchChallenges = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("truth_or_dare_challenges")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setChallenges(data || []);
    } catch (error) {
      console.error("Error fetching challenges:", error);
      toast.error("Erreur lors du chargement des défis");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenForm = (challenge?: Challenge) => {
    if (challenge) {
      setEditingChallenge(challenge);
      setFormData({
        type: challenge.type as "truth" | "dare",
        content: challenge.content,
        category: challenge.category,
        difficulty: challenge.difficulty,
        is_active: challenge.is_active,
      });
    } else {
      setEditingChallenge(null);
      setFormData({
        type: "truth",
        content: "",
        category: "fun",
        difficulty: 1,
        is_active: true,
      });
    }
    setIsFormOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.content.trim()) {
      toast.error("Le contenu est requis");
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingChallenge) {
        const { error } = await supabase
          .from("truth_or_dare_challenges")
          .update({
            type: formData.type,
            content: formData.content,
            category: formData.category,
            difficulty: formData.difficulty,
            is_active: formData.is_active,
          })
          .eq("id", editingChallenge.id);

        if (error) throw error;
        toast.success("Défi mis à jour");
      } else {
        const { error } = await supabase
          .from("truth_or_dare_challenges")
          .insert({
            type: formData.type,
            content: formData.content,
            category: formData.category,
            difficulty: formData.difficulty,
            is_active: formData.is_active,
          });

        if (error) throw error;
        toast.success("Défi créé");
      }

      setIsFormOpen(false);
      fetchChallenges();
    } catch (error) {
      console.error("Error saving challenge:", error);
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingChallengeId) return;

    try {
      const { error } = await supabase
        .from("truth_or_dare_challenges")
        .delete()
        .eq("id", deletingChallengeId);

      if (error) throw error;
      toast.success("Défi supprimé");
      setIsDeleteDialogOpen(false);
      setDeletingChallengeId(null);
      fetchChallenges();
    } catch (error) {
      console.error("Error deleting challenge:", error);
      toast.error("Erreur lors de la suppression");
    }
  };

  const handleToggleActive = async (challenge: Challenge) => {
    try {
      const { error } = await supabase
        .from("truth_or_dare_challenges")
        .update({ is_active: !challenge.is_active })
        .eq("id", challenge.id);

      if (error) throw error;
      toast.success(challenge.is_active ? "Défi désactivé" : "Défi activé");
      fetchChallenges();
    } catch (error) {
      console.error("Error toggling challenge:", error);
      toast.error("Erreur lors de la modification");
    }
  };

  const filteredChallenges = challenges.filter((challenge) => {
    const matchesSearch = challenge.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === "all" || challenge.type === filterType;
    const matchesCategory = filterCategory === "all" || challenge.category === filterCategory;
    const matchesActive =
      filterActive === "all" ||
      (filterActive === "active" && challenge.is_active) ||
      (filterActive === "inactive" && !challenge.is_active);

    return matchesSearch && matchesType && matchesCategory && matchesActive;
  });

  const stats = {
    total: challenges.length,
    truths: challenges.filter((c) => c.type === "truth").length,
    dares: challenges.filter((c) => c.type === "dare").length,
    active: challenges.filter((c) => c.is_active).length,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-card border border-border">
          <p className="text-sm text-muted-foreground">Total</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </div>
        <div className="p-4 rounded-xl bg-card border border-border">
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <MessageCircle className="w-4 h-4" /> Vérités
          </p>
          <p className="text-2xl font-bold text-blue-500">{stats.truths}</p>
        </div>
        <div className="p-4 rounded-xl bg-card border border-border">
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <Zap className="w-4 h-4" /> Défis
          </p>
          <p className="text-2xl font-bold text-amber-500">{stats.dares}</p>
        </div>
        <div className="p-4 rounded-xl bg-card border border-border">
          <p className="text-sm text-muted-foreground">Actifs</p>
          <p className="text-2xl font-bold text-green-500">{stats.active}</p>
        </div>
      </div>

      {/* Actions & Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-[200px]"
            />
          </div>

          <Select value={filterType} onValueChange={(v) => setFilterType(v as typeof filterType)}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="truth">Vérité</SelectItem>
              <SelectItem value="dare">Défi</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Catégorie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes</SelectItem>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterActive} onValueChange={(v) => setFilterActive(v as typeof filterActive)}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="active">Actifs</SelectItem>
              <SelectItem value="inactive">Inactifs</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button onClick={() => handleOpenForm()} className="gap-2">
          <Plus className="w-4 h-4" />
          Nouveau défi
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Type</TableHead>
              <TableHead>Contenu</TableHead>
              <TableHead className="w-[120px]">Catégorie</TableHead>
              <TableHead className="w-[100px]">Difficulté</TableHead>
              <TableHead className="w-[80px]">Actif</TableHead>
              <TableHead className="w-[100px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <AnimatePresence>
              {filteredChallenges.map((challenge) => (
                <motion.tr
                  key={challenge.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="border-b border-border"
                >
                  <TableCell>
                    <Badge
                      variant={challenge.type === "truth" ? "secondary" : "default"}
                      className={
                        challenge.type === "truth"
                          ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                          : "bg-amber-500/20 text-amber-400 border-amber-500/30"
                      }
                    >
                      {challenge.type === "truth" ? "Vérité" : "Défi"}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[300px] truncate">{challenge.content}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {challenge.category}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          DIFFICULTIES.find((d) => d.value === challenge.difficulty)?.color
                        }`}
                      />
                      <span className="text-sm">
                        {DIFFICULTIES.find((d) => d.value === challenge.difficulty)?.label}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={challenge.is_active}
                      onCheckedChange={() => handleToggleActive(challenge)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenForm(challenge)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => {
                          setDeletingChallengeId(challenge.id);
                          setIsDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </motion.tr>
              ))}
            </AnimatePresence>
          </TableBody>
        </Table>

        {filteredChallenges.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">
            Aucun défi trouvé
          </div>
        )}
      </div>

      {/* Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingChallenge ? "Modifier le défi" : "Nouveau défi"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={formData.type}
                onValueChange={(v) => setFormData({ ...formData, type: v as "truth" | "dare" })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="truth">Vérité</SelectItem>
                  <SelectItem value="dare">Défi</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Contenu</Label>
              <Textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder={
                  formData.type === "truth"
                    ? "Ex: Quel est ton plus grand secret ?"
                    : "Ex: Fais 10 pompes devant tout le monde"
                }
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Catégorie</Label>
              <Select
                value={formData.category}
                onValueChange={(v) => setFormData({ ...formData, category: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Difficulté</Label>
              <Select
                value={formData.difficulty.toString()}
                onValueChange={(v) => setFormData({ ...formData, difficulty: parseInt(v) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DIFFICULTIES.map((d) => (
                    <SelectItem key={d.value} value={d.value.toString()}>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${d.color}`} />
                        {d.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <Label>Actif</Label>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(v) => setFormData({ ...formData, is_active: v })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingChallenge ? "Mettre à jour" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce défi ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le défi sera définitivement supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
};

export default AdminTruthOrDareTab;
