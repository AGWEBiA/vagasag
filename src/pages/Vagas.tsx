import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Briefcase, Plus, ExternalLink, Pencil, Loader2, Trash2, Inbox, Layers, Link2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { CARGOS, CARGO_LABEL } from "@/lib/seniority";
import { cn, stripHtml, slugify } from "@/lib/utils";
import {
  VagaPerguntasEditor,
  savePerguntasForVaga,
  type DraftPergunta,
} from "@/components/VagaPerguntasEditor";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

interface Vaga {
  id: string;
  slug: string;
  titulo: string;
  cargo: string;
  descricao: string;
  requisitos: string | null;
  beneficios: string | null;
  modalidade: string;
  localizacao: string | null;
  faixa_salarial: string | null;
  status: string;
  created_by: string;
  created_at: string;
}

const empty = {
  titulo: "",
  cargo: "",
  descricao: "",
  requisitos: "",
  beneficios: "",
  modalidade: "remoto",
  localizacao: "",
  faixa_salarial: "",
  status: "aberta",
};

const Vagas = () => {
  const { user } = useAuth();
  const [vagas, setVagas] = useState<Vaga[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Vaga | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [generatingIA, setGeneratingIA] = useState(false);
  const [perguntasDraft, setPerguntasDraft] = useState<DraftPergunta[]>([]);

  useEffect(() => {
    document.title = "Vagas | Seniority Hub";
    void load();
  }, []);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("vagas")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error("Erro ao carregar vagas.");
    else setVagas((data ?? []) as Vaga[]);

    const { data: cs } = await supabase.from("candidaturas").select("vaga_id, visualizada");
    const map: Record<string, number> = {};
    const unreadMap: Record<string, number> = {};
    (cs ?? []).forEach((c: any) => {
      map[c.vaga_id] = (map[c.vaga_id] ?? 0) + 1;
      if (!c.visualizada) {
        unreadMap[c.vaga_id] = (unreadMap[c.vaga_id] ?? 0) + 1;
      }
    });
    setCounts(map);
    setUnreadCounts(unreadMap);

    setLoading(false);
  };

  const openNew = () => {
    setEditing(null);
    setForm(empty);
    setPerguntasDraft([]);
    setOpen(true);
  };

  const openEdit = (v: Vaga) => {
    setEditing(v);
    
    let fullDesc = v.descricao;
    if (!/<[a-z][\s\S]*>/i.test(fullDesc)) {
      if (v.requisitos) fullDesc += `\n\nRequisitos:\n${v.requisitos}`;
      if (v.beneficios) fullDesc += `\n\nBenefícios:\n${v.beneficios}`;
      // Replace newlines with <br> and wrap in <p> so Quill interprets it well
      fullDesc = `<p>${fullDesc.replace(/\n/g, '<br>')}</p>`;
    }

    setForm({
      titulo: v.titulo,
      cargo: v.cargo,
      descricao: fullDesc,
      requisitos: "",
      beneficios: "",
      modalidade: v.modalidade,
      localizacao: v.localizacao ?? "",
      faixa_salarial: v.faixa_salarial ?? "",
      status: v.status,
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.titulo.trim() || !form.cargo || form.descricao.trim().length < 20) {
      toast.error("Preencha título, cargo e descrição (mín. 20 caracteres).");
      return;
    }
    if (!user) return;
    setSaving(true);
    const slug = slugify(form.titulo);
    const payload = {
      ...form,
      slug,
      requisitos: form.requisitos.trim() || null,
      beneficios: form.beneficios.trim() || null,
      localizacao: form.localizacao.trim() || null,
      faixa_salarial: form.faixa_salarial.trim() || null,
    };
    let error;
    let vagaId = editing?.id;
    if (editing) {
      ({ error } = await supabase.from("vagas").update(payload).eq("id", editing.id));
    } else {
      const { data: inserted, error: insErr } = await supabase
        .from("vagas")
        .insert({ ...payload, created_by: user.id })
        .select("id")
        .single();
      error = insErr;
      vagaId = inserted?.id;
    }
    if (error || !vagaId) {
      setSaving(false);
      toast.error("Erro ao salvar vaga.");
      console.error(error);
      return;
    }
    const { error: pErr } = await savePerguntasForVaga(vagaId, perguntasDraft);
    setSaving(false);
    if (pErr) {
      toast.error("Vaga salva, mas falhou ao salvar perguntas.");
      console.error(pErr);
    } else {
      toast.success(editing ? "Vaga atualizada!" : "Vaga publicada!", {
        description: "As alterações foram registradas e o commit de migração será gerado.",
        duration: 5000,
      });
    }
    setOpen(false);
    void load();
  };

  const generateWithIA = async () => {
    if (!form.titulo.trim()) {
      toast.error("Informe pelo menos o título para a IA gerar a descrição.");
      return;
    }

    setGeneratingIA(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-job-description", {
        body: {
          titulo: form.titulo,
          cargo: form.cargo ? CARGO_LABEL[form.cargo] : "",
          modalidade: form.modalidade,
        },
      });

      if (error) throw error;

      if (data?.content) {
        setForm((prev) => ({ ...prev, descricao: data.content }));
        toast.success("Descrição gerada pela IA!");
      } else {
        throw new Error("Resposta vazia da IA.");
      }
    } catch (e) {
      console.error(e);
      toast.error("Falha ao gerar descrição com IA.");
    } finally {
      setGeneratingIA(false);
    }
  };

  const remove = async (v: Vaga) => {
    if (!confirm(`Excluir a vaga "${v.titulo}"? Todas as candidaturas serão removidas.`)) return;
    const { error } = await supabase.from("vagas").delete().eq("id", v.id);
    if (error) toast.error("Erro ao excluir.");
    else {
      toast.success("Vaga excluída.");
      void load();
    }
  };

  const copyLink = (v: Vaga) => {
    const url = `${window.location.origin}/vagas/${v.slug || v.id}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copiado!");
  };

  return (
    <AppShell>
      <header className="mb-8 animate-fade-in flex flex-wrap gap-4 items-start justify-between">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pleno-bg text-gold text-xs font-medium mb-3 border border-gold/30">
            <Briefcase className="h-3 w-3" /> Gestão de Vagas
          </div>
          <h1 className="font-display text-4xl font-semibold">Gestão de Vagas</h1>
          <p className="text-muted-foreground mt-1">
            Crie descrições detalhadas e configure os formulários de inscrição.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" className="border-gold/40 hover:text-gold">
            <Link to="/vagas" target="_blank" rel="noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" />
              Ver portal público
            </Link>
          </Button>
          <Button
            onClick={openNew}
            className="bg-gradient-gold text-gold-foreground hover:opacity-90 shadow-gold"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nova vaga
          </Button>
        </div>
      </header>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-gold" />
        </div>
      ) : vagas.length === 0 ? (
        <div className="surface-card rounded-xl p-10 text-center">
          <Briefcase className="h-10 w-10 text-gold mx-auto mb-3" />
          <h3 className="font-display text-xl font-semibold mb-1">Nenhuma vaga publicada</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Crie sua primeira vaga para começar a receber candidaturas.
          </p>
          <Button
            onClick={openNew}
            className="bg-gradient-gold text-gold-foreground hover:opacity-90"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nova vaga
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {vagas.map((v) => (
            <div
              key={v.id}
              className="surface-card rounded-xl p-5 flex flex-col gap-3 hover:ring-1 hover:ring-gold/30 transition"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-display text-lg font-semibold leading-tight">
                  {v.titulo}
                </h3>
                <span
                  className={cn(
                    "text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider border",
                    v.status === "aberta"
                      ? "bg-senior-bg text-senior border-senior/40"
                      : "bg-junior-bg text-junior border-junior/40",
                  )}
                >
                  {v.status}
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                {CARGO_LABEL[v.cargo]} · {v.modalidade}
                {v.localizacao ? ` · ${v.localizacao}` : ""}
              </div>
              <p className="text-sm text-body line-clamp-3">{stripHtml(v.descricao)}</p>
              <div className="flex flex-col gap-2 pt-2 border-t border-sidebar-border mt-auto">
                <Button
                  asChild
                  size="sm"
                  className="bg-gradient-gold text-gold-foreground hover:opacity-90 shadow-gold w-full"
                >
                  <Link to={`/vagas-admin/${v.id}/pipeline`}>
                    <Layers className="h-3.5 w-3.5 mr-1.5" />
                    Abrir Kanban
                  </Link>
                </Button>
                <div className="flex items-center justify-between">
                  <Link
                    to={`/admin/candidaturas/${v.id}`}
                    className="inline-flex items-center gap-1.5 text-xs text-gold hover:underline"
                  >
                    <Inbox className="h-3.5 w-3.5" />
                    {counts[v.id] ?? 0} candidatura{(counts[v.id] ?? 0) === 1 ? "" : "s"}
                    {(unreadCounts[v.id] ?? 0) > 0 && (
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white animate-pulse">
                        {unreadCounts[v.id]}
                      </span>
                    )}
                  </Link>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => copyLink(v)} title="Copiar link público">
                      <Link2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => openEdit(v)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => remove(v)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">
              {editing ? "Editar vaga" : "Nova vaga"}
            </DialogTitle>
            <DialogDescription>
              Vagas com status "aberta" aparecem no portal público.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div className="space-y-4">
              <h4 className="text-sm font-semibold uppercase tracking-wider text-gold/80 border-b border-gold/20 pb-1">Informações Básicas</h4>
              <div className="space-y-2">
                <Label>Título da Vaga</Label>
                <Input
                  value={form.titulo}
                  onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                  placeholder="Ex: Gestor de Tráfego Sênior"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Cargo / Área</Label>
                  <Select
                    value={form.cargo}
                    onValueChange={(v) => setForm({ ...form, cargo: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {CARGOS.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Modalidade</Label>
                  <Select
                    value={form.modalidade}
                    onValueChange={(v) => setForm({ ...form, modalidade: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="remoto">Remoto</SelectItem>
                      <SelectItem value="hibrido">Híbrido</SelectItem>
                      <SelectItem value="presencial">Presencial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Localização (opcional)</Label>
                  <Input
                    value={form.localizacao}
                    onChange={(e) => setForm({ ...form, localizacao: e.target.value })}
                    placeholder="Ex: São Paulo / SP"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Faixa salarial (opcional)</Label>
                  <Input
                    value={form.faixa_salarial}
                    onChange={(e) => setForm({ ...form, faixa_salarial: e.target.value })}
                    placeholder="Ex: R$ 8k–12k"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-semibold uppercase tracking-wider text-gold/80 border-b border-gold/20 pb-1">Descrição e Requisitos</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Conteúdo da Vaga (Dica: Use títulos para separar seções)</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={generateWithIA}
                    disabled={generatingIA}
                    className="h-7 text-[10px] border-gold/40 text-gold hover:bg-gold/10"
                  >
                    {generatingIA ? (
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    ) : (
                      <Sparkles className="h-3 w-3 mr-1" />
                    )}
                    Gerar com IA
                  </Button>
                </div>
                <ReactQuill 
                  theme="snow" 
                  value={form.descricao} 
                  onChange={(value) => setForm({ ...form, descricao: value })}
                  className="bg-background rounded-md [&_.ql-container]:h-80 [&_.ql-editor]:text-body"
                  modules={{
                    toolbar: [
                      [{ header: [2, 3, false] }],
                      ["bold", "italic", "underline"],
                      [{ list: "ordered" }, { list: "bullet" }],
                      ["link"],
                      ["clean"],
                    ],
                  }}
                  placeholder="Descreva a oportunidade, responsabilidades, requisitos e benefícios..."
                />
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-semibold uppercase tracking-wider text-gold/80 border-b border-gold/20 pb-1">Configurações do Formulário</h4>
              <div className="space-y-2">
                <Label>Status da Vaga</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aberta">Aberta (Visível no Portal)</SelectItem>
                    <SelectItem value="pausada">Pausada</SelectItem>
                    <SelectItem value="encerrada">Encerrada</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="pt-2">
                <VagaPerguntasEditor
                  vagaId={editing?.id ?? null}
                  cargo={form.cargo || null}
                  onDraftChange={setPerguntasDraft}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={save}
              disabled={saving}
              className="bg-gradient-gold text-gold-foreground hover:opacity-90"
            >
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
};

export default Vagas;
