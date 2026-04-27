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
                  {e.auto_score_ativo && (
                    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider bg-pleno-bg text-pleno border border-pleno/40">
                      <Bot className="h-3 w-3" /> auto-score
                    </span>
                  )}
                  {e.email_ativo && (
                    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider bg-gold/10 text-gold border border-gold/40">
                      <Mail className="h-3 w-3" /> e-mail
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

interface EstagioPayload {
  nome: string;
  cor: string;
  tipo: EstagioTipo;
  ordem: number;
  ativo: boolean;
  auto_score_ativo: boolean;
  email_ativo: boolean;
  email_assunto: string | null;
  email_corpo: string | null;
}

const PLACEHOLDERS_BY_TIPO: Record<EstagioTipo, { assunto: string; corpo: string }> = {
  inicial: {
    assunto: "Recebemos sua candidatura para {{vaga}}",
    corpo:
      "Olá {{nome}},\n\nRecebemos sua candidatura para {{vaga}} e ela já está em análise.\n\nObrigado!",
  },
  intermediario: {
    assunto: "Atualização sobre sua candidatura — {{vaga}}",
    corpo:
      "Olá {{nome}},\n\nSua candidatura avançou para a etapa \"{{estagio}}\". Em breve entraremos em contato com os próximos passos.",
  },
  final_aprovado: {
    assunto: "Boas notícias sobre {{vaga}} 🎉",
    corpo:
      "Olá {{nome}},\n\nFicamos muito felizes em informar que você foi aprovado(a) para {{vaga}}!\n\nEm breve nosso time entrará em contato para os próximos passos.",
  },
  final_reprovado: {
    assunto: "Sobre sua candidatura para {{vaga}}",
    corpo:
      "Olá {{nome}},\n\nAgradecemos muito seu interesse em {{vaga}} e o tempo investido no nosso processo.\n\nDessa vez optamos por seguir com outro perfil, mas seu currículo ficará no nosso banco de talentos.\n\nDesejamos sucesso na sua jornada!",
  },
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
  onSave: (p: EstagioPayload) => void;
}) => {
  const [nome, setNome] = useState("");
  const [cor, setCor] = useState(ESTAGIO_CORES_PRESET[0]);
  const [tipo, setTipo] = useState<EstagioTipo>("intermediario");
  const [ordem, setOrdem] = useState<number>(nextOrdem);
  const [autoScore, setAutoScore] = useState(false);
  const [emailAtivo, setEmailAtivo] = useState(false);
  const [emailAssunto, setEmailAssunto] = useState("");
  const [emailCorpo, setEmailCorpo] = useState("");

  useEffect(() => {
    if (open) {
      setNome(estagio?.nome ?? "");
      setCor(estagio?.cor ?? ESTAGIO_CORES_PRESET[0]);
      setTipo(estagio?.tipo ?? "intermediario");
      setOrdem(estagio?.ordem ?? nextOrdem);
      setAutoScore(estagio?.auto_score_ativo ?? false);
      setEmailAtivo(estagio?.email_ativo ?? false);
      setEmailAssunto(estagio?.email_assunto ?? "");
      setEmailCorpo(estagio?.email_corpo ?? "");
    }
  }, [open, estagio, nextOrdem]);

  const sugerirTemplate = () => {
    const tpl = PLACEHOLDERS_BY_TIPO[tipo];
    if (!emailAssunto) setEmailAssunto(tpl.assunto);
    if (!emailCorpo) setEmailCorpo(tpl.corpo);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{estagio ? "Editar estágio" : "Novo estágio"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
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
                  <SelectItem value="final_reprovado">Final · Reprovado</SelectItem>
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

          {/* Auto-score */}
          <div className="rounded-lg border border-sidebar-border p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2">
                <Bot className="h-4 w-4 text-pleno mt-0.5" />
                <div>
                  <Label className="text-sm">Auto-score com IA</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Roda a avaliação automaticamente quando o candidato chega
                    neste estágio.
                  </p>
                </div>
              </div>
              <Switch checked={autoScore} onCheckedChange={setAutoScore} />
            </div>
          </div>

          {/* E-mail automático */}
          <div className="rounded-lg border border-sidebar-border p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2">
                <Mail className="h-4 w-4 text-gold mt-0.5" />
                <div>
                  <Label className="text-sm">E-mail automático ao entrar no estágio</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Variáveis disponíveis:{" "}
                    <code className="text-[11px] px-1 rounded bg-sidebar-border/30">
                      {"{{nome}}"}
                    </code>
                    {" "}
                    <code className="text-[11px] px-1 rounded bg-sidebar-border/30">
                      {"{{vaga}}"}
                    </code>
                    {" "}
                    <code className="text-[11px] px-1 rounded bg-sidebar-border/30">
                      {"{{estagio}}"}
                    </code>
                  </p>
                </div>
              </div>
              <Switch checked={emailAtivo} onCheckedChange={setEmailAtivo} />
            </div>

            {emailAtivo && (
              <div className="space-y-3 pt-2">
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={sugerirTemplate}
                    className="text-xs h-7"
                  >
                    Sugerir template para "{ESTAGIO_TIPO_LABEL[tipo]}"
                  </Button>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Assunto</Label>
                  <Input
                    value={emailAssunto}
                    onChange={(e) => setEmailAssunto(e.target.value)}
                    placeholder="Ex: Atualização sobre {{vaga}}"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Corpo do e-mail</Label>
                  <Textarea
                    value={emailCorpo}
                    onChange={(e) => setEmailCorpo(e.target.value)}
                    placeholder="Olá {{nome}}, ..."
                    rows={8}
                    className="font-mono text-sm"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={() =>
              onSave({
                nome: nome.trim(),
                cor,
                tipo,
                ordem,
                ativo: true,
                auto_score_ativo: autoScore,
                email_ativo: emailAtivo,
                email_assunto: emailAtivo ? emailAssunto.trim() || null : null,
                email_corpo: emailAtivo ? emailCorpo.trim() || null : null,
              })
            }
            disabled={
              !nome.trim() ||
              saving ||
              (emailAtivo && (!emailAssunto.trim() || !emailCorpo.trim()))
            }
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
