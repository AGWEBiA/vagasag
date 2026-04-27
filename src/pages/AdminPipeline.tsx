import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import {
  ArrowDown,
  ArrowUp,
  Bot,
  Layers,
  Loader2,
  Mail,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  ESTAGIO_CORES_PRESET,
  ESTAGIO_TIPO_LABEL,
  type EstagioTipo,
  type PipelineEstagio,
} from "@/lib/pipeline";
import { useUserRole } from "@/hooks/useUserRole";
import { Navigate } from "react-router-dom";

const AdminPipeline = () => {
  const { isAdmin, loading: roleLoading } = useUserRole();
  const [estagios, setEstagios] = useState<PipelineEstagio[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<PipelineEstagio | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PipelineEstagio | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    document.title = "Pipeline | Seniority Hub";
    void load();
  }, []);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("pipeline_estagios")
      .select("*")
      .order("ordem", { ascending: true });
    if (error) {
      toast.error("Erro ao carregar estágios");
      setLoading(false);
      return;
    }
    setEstagios((data ?? []) as PipelineEstagio[]);
    setLoading(false);
  };

  const move = async (id: string, dir: -1 | 1) => {
    const idx = estagios.findIndex((e) => e.id === id);
    const target = idx + dir;
    if (idx === -1 || target < 0 || target >= estagios.length) return;
    const a = estagios[idx];
    const b = estagios[target];
    const updates = await Promise.all([
      supabase.from("pipeline_estagios").update({ ordem: b.ordem }).eq("id", a.id),
      supabase.from("pipeline_estagios").update({ ordem: a.ordem }).eq("id", b.id),
    ]);
    if (updates.some((u) => u.error)) {
      toast.error("Erro ao reordenar");
      return;
    }
    void load();
  };

  const toggleAtivo = async (e: PipelineEstagio) => {
    const { error } = await supabase
      .from("pipeline_estagios")
      .update({ ativo: !e.ativo })
      .eq("id", e.id);
    if (error) {
      toast.error("Erro ao atualizar");
      return;
    }
    void load();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase
      .from("pipeline_estagios")
      .delete()
      .eq("id", deleteTarget.id);
    if (error) {
      toast.error(
        "Não é possível excluir. Provavelmente há candidaturas neste estágio.",
      );
    } else {
      toast.success("Estágio excluído");
      void load();
    }
    setDeleteTarget(null);
  };

  if (roleLoading) {
    return (
      <AppShell>
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-gold" />
        </div>
      </AppShell>
    );
  }
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  return (
    <AppShell>
      <header className="mb-6 flex items-start justify-between gap-4 animate-fade-in">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pleno-bg text-gold text-xs font-medium mb-2 border border-gold/30">
            <Layers className="h-3 w-3" /> Pipeline ATS
          </div>
          <h1 className="font-display text-3xl font-semibold">
            Estágios do <span className="text-gradient-gold">funil</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure as etapas pelas quais cada candidato passa. Aplicado a todas
            as vagas.
          </p>
        </div>
        <Button
          onClick={() => setCreating(true)}
          className="bg-gradient-gold text-gold-foreground hover:opacity-90 shadow-gold"
        >
          <Plus className="h-4 w-4 mr-2" /> Novo estágio
        </Button>
      </header>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-gold" />
        </div>
      ) : (
        <div className="surface-card rounded-xl divide-y divide-sidebar-border">
          {estagios.map((e, i) => (
            <div key={e.id} className="flex items-center gap-3 p-4">
              <span
                className="h-3 w-3 rounded-full shrink-0"
                style={{ backgroundColor: e.cor }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{e.nome}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider border border-sidebar-border text-muted-foreground">
                    {ESTAGIO_TIPO_LABEL[e.tipo]}
                  </span>
                  {!e.ativo && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider bg-junior-bg text-junior border border-junior/40">
                      inativo
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">Ordem: {e.ordem}</div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={i === 0}
                  onClick={() => move(e.id, -1)}
                  title="Subir"
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={i === estagios.length - 1}
                  onClick={() => move(e.id, 1)}
                  title="Descer"
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-2 mx-2">
                  <Switch
                    checked={e.ativo}
                    onCheckedChange={() => toggleAtivo(e)}
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setEditing(e)}
                  title="Editar"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setDeleteTarget(e)}
                  title="Excluir"
                  className="text-junior hover:text-junior"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <EstagioDialog
        open={creating || !!editing}
        estagio={editing}
        nextOrdem={Math.max(0, ...estagios.map((e) => e.ordem)) + 10}
        saving={saving}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        onSave={async (payload) => {
          setSaving(true);
          const op = editing
            ? supabase
                .from("pipeline_estagios")
                .update(payload)
                .eq("id", editing.id)
            : supabase.from("pipeline_estagios").insert(payload);
          const { error } = await op;
          setSaving(false);
          if (error) {
            toast.error("Erro ao salvar");
            return;
          }
          toast.success(editing ? "Estágio atualizado" : "Estágio criado");
          setCreating(false);
          setEditing(null);
          void load();
        }}
      />

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir estágio?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteTarget?.nome}" será removido. Candidaturas neste estágio
              ficarão sem estágio definido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
};

const EstagioDialog = ({
  open,
  estagio,
  nextOrdem,
  saving,
  onClose,
  onSave,
}: {
  open: boolean;
  estagio: PipelineEstagio | null;
  nextOrdem: number;
  saving: boolean;
  onClose: () => void;
  onSave: (p: {
    nome: string;
    cor: string;
    tipo: EstagioTipo;
    ordem: number;
    ativo: boolean;
  }) => void;
}) => {
  const [nome, setNome] = useState("");
  const [cor, setCor] = useState(ESTAGIO_CORES_PRESET[0]);
  const [tipo, setTipo] = useState<EstagioTipo>("intermediario");
  const [ordem, setOrdem] = useState<number>(nextOrdem);

  useEffect(() => {
    if (open) {
      setNome(estagio?.nome ?? "");
      setCor(estagio?.cor ?? ESTAGIO_CORES_PRESET[0]);
      setTipo(estagio?.tipo ?? "intermediario");
      setOrdem(estagio?.ordem ?? nextOrdem);
    }
  }, [open, estagio, nextOrdem]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{estagio ? "Editar estágio" : "Novo estágio"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Entrevista técnica"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={tipo}
                onValueChange={(v) => setTipo(v as EstagioTipo)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inicial">Inicial</SelectItem>
                  <SelectItem value="intermediario">Intermediário</SelectItem>
                  <SelectItem value="final_aprovado">Final · Aprovado</SelectItem>
                  <SelectItem value="final_reprovado">
                    Final · Reprovado
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Ordem</Label>
              <Input
                type="number"
                value={ordem}
                onChange={(e) => setOrdem(Number(e.target.value))}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Cor</Label>
            <div className="flex flex-wrap gap-2">
              {ESTAGIO_CORES_PRESET.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCor(c)}
                  className={`h-8 w-8 rounded-full border-2 transition ${
                    cor === c ? "border-gold scale-110" : "border-transparent"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={() =>
              onSave({ nome: nome.trim(), cor, tipo, ordem, ativo: true })
            }
            disabled={!nome.trim() || saving}
            className="bg-gradient-gold text-gold-foreground"
          >
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AdminPipeline;
