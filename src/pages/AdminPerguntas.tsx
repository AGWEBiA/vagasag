import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
import { HelpCircle, Plus, Pencil, Trash2, Loader2, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CARGOS, CARGO_LABEL } from "@/lib/seniority";
import { TIPO_LABEL, type QuestionBankItem, type PerguntaTipo } from "@/lib/perguntas";

const empty = {
  texto: "",
  tipo: "texto" as PerguntaTipo,
  opcoes: "",
  cargos_sugeridos: [] as string[],
  ativa: true,
};

const AdminPerguntas = () => {
  const [items, setItems] = useState<QuestionBankItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<QuestionBankItem | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [cargoFilter, setCargoFilter] = useState<string>("__all");

  useEffect(() => {
    document.title = "Banco de Perguntas | Seniority Hub";
    void load();
  }, []);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("question_bank")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error("Erro ao carregar perguntas.");
    else setItems((data ?? []) as QuestionBankItem[]);
    setLoading(false);
  };

  const filtered = useMemo(() => {
    return items.filter((q) => {
      if (cargoFilter !== "__all" && !q.cargos_sugeridos.includes(cargoFilter)) return false;
      if (search.trim() && !q.texto.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [items, search, cargoFilter]);

  const openNew = () => {
    setEditing(null);
    setForm(empty);
    setOpen(true);
  };

  const openEdit = (q: QuestionBankItem) => {
    setEditing(q);
    setForm({
      texto: q.texto,
      tipo: q.tipo,
      opcoes: q.opcoes.join("\n"),
      cargos_sugeridos: q.cargos_sugeridos,
      ativa: q.ativa,
    });
    setOpen(true);
  };

  const toggleCargo = (cargo: string) => {
    setForm((f) => ({
      ...f,
      cargos_sugeridos: f.cargos_sugeridos.includes(cargo)
        ? f.cargos_sugeridos.filter((c) => c !== cargo)
        : [...f.cargos_sugeridos, cargo],
    }));
  };

  const save = async () => {
    if (form.texto.trim().length < 5) {
      toast.error("Texto da pergunta muito curto.");
      return;
    }
    if (form.tipo === "escolha") {
      const opts = form.opcoes
        .split("\n")
        .map((o) => o.trim())
        .filter(Boolean);
      if (opts.length < 2) {
        toast.error("Múltipla escolha requer ao menos 2 opções (1 por linha).");
        return;
      }
    }
    setSaving(true);
    const payload = {
      texto: form.texto.trim(),
      tipo: form.tipo,
      opcoes:
        form.tipo === "escolha"
          ? form.opcoes
              .split("\n")
              .map((o) => o.trim())
              .filter(Boolean)
          : [],
      cargos_sugeridos: form.cargos_sugeridos,
      ativa: form.ativa,
    };
    let error;
    if (editing) {
      ({ error } = await supabase.from("question_bank").update(payload).eq("id", editing.id));
    } else {
      ({ error } = await supabase.from("question_bank").insert(payload));
    }
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar.");
      console.error(error);
    } else {
      toast.success(editing ? "Pergunta atualizada." : "Pergunta criada.");
      setOpen(false);
      void load();
    }
  };

  const remove = async (q: QuestionBankItem) => {
    if (!confirm(`Excluir a pergunta "${q.texto.slice(0, 60)}..."?`)) return;
    const { error } = await supabase.from("question_bank").delete().eq("id", q.id);
    if (error) toast.error("Erro ao excluir.");
    else {
      toast.success("Pergunta removida.");
      void load();
    }
  };

  return (
    <AppShell>
      <header className="mb-8 animate-fade-in flex flex-wrap gap-4 items-start justify-between">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pleno-bg text-gold text-xs font-medium mb-3 border border-gold/30">
            <HelpCircle className="h-3 w-3" /> Banco de Perguntas
          </div>
          <h1 className="font-display text-4xl font-semibold">Perguntas reutilizáveis</h1>
          <p className="text-muted-foreground mt-1">
            Crie perguntas que poderão ser anexadas a qualquer vaga.
          </p>
        </div>
        <Button
          onClick={openNew}
          className="bg-gradient-gold text-gold-foreground hover:opacity-90 shadow-gold"
        >
          <Plus className="h-4 w-4 mr-2" /> Nova pergunta
        </Button>
      </header>

      <div className="surface-card rounded-xl p-4 mb-6 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[220px]">
          <Label className="text-xs">Buscar</Label>
          <div className="relative mt-1">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Texto da pergunta..."
              className="pl-9"
            />
          </div>
        </div>
        <div className="w-[220px]">
          <Label className="text-xs">Cargo</Label>
          <Select value={cargoFilter} onValueChange={setCargoFilter}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">Todos os cargos</SelectItem>
              {CARGOS.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-gold" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="surface-card rounded-xl p-10 text-center">
          <HelpCircle className="h-10 w-10 text-gold mx-auto mb-3" />
          <h3 className="font-display text-xl font-semibold mb-1">Nenhuma pergunta</h3>
          <p className="text-sm text-muted-foreground">
            Crie perguntas para reutilizar nas suas vagas.
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((q) => (
            <div
              key={q.id}
              className="surface-card rounded-lg p-4 flex items-start justify-between gap-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-pleno-bg text-gold border border-gold/30">
                    {TIPO_LABEL[q.tipo]}
                  </span>
                  {!q.ativa && (
                    <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-junior-bg text-junior border border-junior/40">
                      Inativa
                    </span>
                  )}
                </div>
                <p className="text-sm font-medium">{q.texto}</p>
                {q.cargos_sugeridos.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {q.cargos_sugeridos.map((c) => (
                      <span
                        key={c}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-surface-elevated text-muted-foreground"
                      >
                        {CARGO_LABEL[c] ?? c}
                      </span>
                    ))}
                  </div>
                )}
                {q.tipo === "escolha" && q.opcoes.length > 0 && (
                  <div className="text-xs text-muted-foreground mt-2">
                    Opções: {q.opcoes.join(" · ")}
                  </div>
                )}
              </div>
              <div className="flex gap-1 shrink-0">
                <Button size="sm" variant="ghost" onClick={() => openEdit(q)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => remove(q)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">
              {editing ? "Editar pergunta" : "Nova pergunta"}
            </DialogTitle>
            <DialogDescription>
              Esta pergunta ficará disponível para ser anexada a qualquer vaga.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Texto da pergunta</Label>
              <Textarea
                rows={2}
                value={form.texto}
                onChange={(e) => setForm({ ...form, texto: e.target.value })}
                placeholder="Ex: Quantos anos de experiência você tem com Meta Ads?"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Tipo de resposta</Label>
                <Select
                  value={form.tipo}
                  onValueChange={(v) => setForm({ ...form, tipo: v as PerguntaTipo })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="texto">Texto livre</SelectItem>
                    <SelectItem value="escolha">Múltipla escolha</SelectItem>
                    <SelectItem value="escala">Escala 1–5</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={form.ativa ? "ativa" : "inativa"}
                  onValueChange={(v) => setForm({ ...form, ativa: v === "ativa" })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativa">Ativa</SelectItem>
                    <SelectItem value="inativa">Inativa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {form.tipo === "escolha" && (
              <div className="space-y-2">
                <Label>Opções (uma por linha)</Label>
                <Textarea
                  rows={4}
                  value={form.opcoes}
                  onChange={(e) => setForm({ ...form, opcoes: e.target.value })}
                  placeholder={"Sim\nNão\nÀs vezes"}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Cargos sugeridos</Label>
              <p className="text-xs text-muted-foreground">
                Selecione em quais cargos esta pergunta faz sentido.
              </p>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {CARGOS.map((c) => (
                  <label
                    key={c.value}
                    className="flex items-center gap-2 text-sm cursor-pointer"
                  >
                    <Checkbox
                      checked={form.cargos_sugeridos.includes(c.value)}
                      onCheckedChange={() => toggleCargo(c.value)}
                    />
                    <span>{c.label}</span>
                  </label>
                ))}
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

export default AdminPerguntas;
