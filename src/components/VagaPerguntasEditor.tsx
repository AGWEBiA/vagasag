import { useEffect, useMemo, useState } from "react";
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
import {
  ArrowDown,
  ArrowUp,
  Heart,
  HelpCircle,
  Library,
  Loader2,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  TIPO_LABEL,
  type PerguntaTipo,
  type QuestionBankItem,
  type VagaPergunta,
} from "@/lib/perguntas";
import { PERGUNTAS_COMPORTAMENTAIS_TEXTOS } from "@/lib/perguntasComportamentais";

interface DraftPergunta {
  id?: string;
  question_bank_id: string | null;
  texto: string;
  tipo: PerguntaTipo;
  opcoes: string[];
  obrigatoria: boolean;
  usar_na_ia: boolean;
}

interface ReviewItem extends DraftPergunta {
  selecionada: boolean;
  jaExiste: boolean;
}

interface Props {
  /** ID da vaga (null quando ainda não foi criada). Quando null, persistência é diferida ao caller. */
  vagaId: string | null;
  cargo: string | null;
  /** Permite ao caller salvar as perguntas após criar uma vaga nova. */
  onDraftChange?: (drafts: DraftPergunta[]) => void;
}

export const VagaPerguntasEditor = ({ vagaId, cargo, onDraftChange }: Props) => {
  const [drafts, setDrafts] = useState<DraftPergunta[]>([]);
  const [bank, setBank] = useState<QuestionBankItem[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [bankSearch, setBankSearch] = useState("");
  const [filterByCargo, setFilterByCargo] = useState(true);

  // Estado do modal "Revisar pacote comportamental"
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewSaving, setReviewSaving] = useState(false);
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);

  const [customForm, setCustomForm] = useState<DraftPergunta>({
    question_bank_id: null,
    texto: "",
    tipo: "texto",
    opcoes: [],
    obrigatoria: true,
    usar_na_ia: true,
  });
  const [customOpcoesText, setCustomOpcoesText] = useState("");

  // Carrega perguntas existentes da vaga
  useEffect(() => {
    if (!vagaId) {
      setDrafts([]);
      return;
    }
    void (async () => {
      const { data } = await supabase
        .from("vaga_perguntas")
        .select("*")
        .eq("vaga_id", vagaId)
        .order("ordem", { ascending: true });
      const loaded = ((data ?? []) as VagaPergunta[]).map((p) => ({
        id: p.id,
        question_bank_id: p.question_bank_id,
        texto: p.texto,
        tipo: p.tipo,
        opcoes: Array.isArray(p.opcoes) ? p.opcoes : [],
        obrigatoria: p.obrigatoria,
        usar_na_ia: p.usar_na_ia,
      }));
      setDrafts(loaded);
    })();
  }, [vagaId]);

  // Carrega banco quando abre o picker
  useEffect(() => {
    if (!pickerOpen || bank.length > 0) return;
    void (async () => {
      const { data } = await supabase
        .from("question_bank")
        .select("*")
        .eq("ativa", true)
        .order("created_at", { ascending: false });
      setBank((data ?? []) as QuestionBankItem[]);
    })();
  }, [pickerOpen, bank.length]);

  useEffect(() => {
    onDraftChange?.(drafts);
  }, [drafts, onDraftChange]);

  const filteredBank = useMemo(() => {
    return bank.filter((q) => {
      if (filterByCargo && cargo && !q.cargos_sugeridos.includes(cargo)) return false;
      if (bankSearch.trim() && !q.texto.toLowerCase().includes(bankSearch.toLowerCase()))
        return false;
      // já está adicionada?
      if (drafts.some((d) => d.question_bank_id === q.id)) return false;
      return true;
    });
  }, [bank, bankSearch, filterByCargo, cargo, drafts]);

  /**
   * Agrupa o banco filtrado em:
   * - especificas: perguntas que listam o cargo atual em cargos_sugeridos
   * - genericas: perguntas sem cargos_sugeridos (servem para qualquer cargo)
   * - outrosCargos: perguntas com cargos_sugeridos ≠ atual (visíveis quando filterByCargo=false)
   */
  const grupos = useMemo(() => {
    const especificas: QuestionBankItem[] = [];
    const genericas: QuestionBankItem[] = [];
    const outrosCargos: QuestionBankItem[] = [];
    for (const q of filteredBank) {
      const lista = q.cargos_sugeridos ?? [];
      if (lista.length === 0) {
        genericas.push(q);
      } else if (cargo && lista.includes(cargo)) {
        especificas.push(q);
      } else {
        outrosCargos.push(q);
      }
    }
    return { especificas, genericas, outrosCargos };
  }, [filteredBank, cargo]);

  const addFromBank = (q: QuestionBankItem) => {
    setDrafts((d) => [
      ...d,
      {
        question_bank_id: q.id,
        texto: q.texto,
        tipo: q.tipo,
        opcoes: q.opcoes,
        obrigatoria: true,
        usar_na_ia: true,
      },
    ]);
  };

  const addCustom = () => {
    if (customForm.texto.trim().length < 5) {
      toast.error("Texto da pergunta muito curto.");
      return;
    }
    let opcoes: string[] = [];
    if (customForm.tipo === "escolha") {
      opcoes = customOpcoesText
        .split("\n")
        .map((o) => o.trim())
        .filter(Boolean);
      if (opcoes.length < 2) {
        toast.error("Múltipla escolha requer ao menos 2 opções.");
        return;
      }
    }
    setDrafts((d) => [...d, { ...customForm, opcoes }]);
    setCustomForm({
      question_bank_id: null,
      texto: "",
      tipo: "texto",
      opcoes: [],
      obrigatoria: true,
      usar_na_ia: true,
    });
    setCustomOpcoesText("");
    setCustomOpen(false);
  };

  const openBehavioralReview = async () => {
    setReviewLoading(true);
    setReviewOpen(true);
    try {
      const { data, error } = await supabase
        .from("question_bank")
        .select("*")
        .eq("ativa", true)
        .in("texto", PERGUNTAS_COMPORTAMENTAIS_TEXTOS as unknown as string[]);
      if (error) {
        toast.error("Não foi possível carregar o pacote comportamental.");
        setReviewOpen(false);
        return;
      }
      const items = (data ?? []) as QuestionBankItem[];
      if (items.length === 0) {
        toast.error("Pacote comportamental não encontrado no banco de perguntas.");
        setReviewOpen(false);
        return;
      }
      const existingBankIds = new Set(
        drafts.map((d) => d.question_bank_id).filter((v): v is string => !!v),
      );
      const existingTextos = new Set(
        drafts.map((d) => d.texto.trim().toLowerCase()),
      );
      const review: ReviewItem[] = items.map((q) => {
        const jaExiste =
          existingBankIds.has(q.id) || existingTextos.has(q.texto.trim().toLowerCase());
        return {
          question_bank_id: q.id,
          texto: q.texto,
          tipo: q.tipo,
          opcoes: q.opcoes,
          obrigatoria: true,
          usar_na_ia: true,
          selecionada: !jaExiste,
          jaExiste,
        };
      });
      setReviewItems(review);
    } finally {
      setReviewLoading(false);
    }
  };

  const updateReviewItem = (idx: number, patch: Partial<ReviewItem>) => {
    setReviewItems((items) =>
      items.map((it, i) => (i === idx ? { ...it, ...patch } : it)),
    );
  };

  const confirmBehavioralReview = async () => {
    const selecionadas = reviewItems.filter((it) => it.selecionada);
    if (selecionadas.length === 0) {
      toast.error("Selecione ao menos uma pergunta para adicionar.");
      return;
    }

    if (vagaId) {
      // Vaga já existe → usa edge function (validação server-side anti-duplicata)
      setReviewSaving(true);
      try {
        const { data, error } = await supabase.functions.invoke(
          "add-question-package",
          {
            body: {
              vagaId,
              perguntas: selecionadas.map((s) => ({
                question_bank_id: s.question_bank_id,
                texto: s.texto,
                tipo: s.tipo,
                opcoes: s.opcoes,
                obrigatoria: s.obrigatoria,
                usar_na_ia: s.usar_na_ia,
              })),
            },
          },
        );
        if (error) throw error;
        const result = data as {
          inseridas?: number;
          ignoradas?: number;
          error?: string;
        };
        if (result?.error) {
          toast.error(result.error);
          return;
        }
        const ins = result.inseridas ?? 0;
        toast.success(
          `${ins} pergunta${ins === 1 ? "" : "s"} adicionada${ins === 1 ? "" : "s"}.${
            result.ignoradas ? ` ${result.ignoradas} ignorada(s) (duplicadas).` : ""
          }`,
        );
        const { data: refreshed } = await supabase
          .from("vaga_perguntas")
          .select("*")
          .eq("vaga_id", vagaId)
          .order("ordem", { ascending: true });
        const loaded = ((refreshed ?? []) as VagaPergunta[]).map((p) => ({
          id: p.id,
          question_bank_id: p.question_bank_id,
          texto: p.texto,
          tipo: p.tipo,
          opcoes: Array.isArray(p.opcoes) ? p.opcoes : [],
          obrigatoria: p.obrigatoria,
          usar_na_ia: p.usar_na_ia,
        }));
        setDrafts(loaded);
        setReviewOpen(false);
      } catch (e) {
        console.error(e);
        toast.error(`Erro: ${e instanceof Error ? e.message : "falha ao adicionar."}`);
      } finally {
        setReviewSaving(false);
      }
      return;
    }

    // Vaga ainda não existe → adiciona somente em drafts locais (com dedup local)
    const existingBankIds = new Set(drafts.map((d) => d.question_bank_id));
    const existingTextos = new Set(drafts.map((d) => d.texto.trim().toLowerCase()));
    const novos: DraftPergunta[] = [];
    for (const s of selecionadas) {
      if (s.question_bank_id && existingBankIds.has(s.question_bank_id)) continue;
      if (existingTextos.has(s.texto.trim().toLowerCase())) continue;
      novos.push({
        question_bank_id: s.question_bank_id,
        texto: s.texto,
        tipo: s.tipo,
        opcoes: s.opcoes,
        obrigatoria: s.obrigatoria,
        usar_na_ia: s.usar_na_ia,
      });
    }
    if (novos.length === 0) {
      toast.info("Todas as perguntas selecionadas já estão na vaga.");
      setReviewOpen(false);
      return;
    }
    setDrafts((d) => [...d, ...novos]);
    toast.success(
      `${novos.length} pergunta${novos.length > 1 ? "s" : ""} adicionada${novos.length > 1 ? "s" : ""}.`,
    );
    setReviewOpen(false);
  };

  const move = (idx: number, dir: -1 | 1) => {
    setDrafts((d) => {
      const next = [...d];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return next;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  };

  const remove = (idx: number) => {
    setDrafts((d) => d.filter((_, i) => i !== idx));
  };

  const update = (idx: number, patch: Partial<DraftPergunta>) => {
    setDrafts((d) => d.map((p, i) => (i === idx ? { ...p, ...patch } : p)));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <Label>Perguntas para o candidato</Label>
          <p className="text-xs text-muted-foreground mt-0.5">
            Selecione do banco ou crie perguntas específicas para esta vaga.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={openBehavioralReview}
            className="border-gold/40 hover:text-gold"
            title="Adiciona um conjunto de perguntas situacionais para avaliar perfil comportamental, proatividade e trabalho em equipe."
          >
            <Heart className="h-4 w-4 mr-1.5" /> Pacote comportamental
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setPickerOpen(true)}
            className="border-gold/40 hover:text-gold"
          >
            <Library className="h-4 w-4 mr-1.5" /> Do banco
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setCustomOpen(true)}
          >
            <Plus className="h-4 w-4 mr-1.5" /> Customizada
          </Button>
        </div>
      </div>

      {drafts.length === 0 ? (
        <div className="rounded-lg border border-dashed border-sidebar-border p-6 text-center text-sm text-muted-foreground">
          <HelpCircle className="h-6 w-6 text-gold mx-auto mb-2" />
          Nenhuma pergunta. Os candidatos verão apenas os campos padrão.
        </div>
      ) : (
        <div className="space-y-2">
          {drafts.map((p, idx) => (
            <div
              key={p.id ?? `draft-${idx}`}
              className="rounded-lg border border-sidebar-border bg-surface-elevated p-3"
            >
              <div className="flex items-start gap-2">
                <div className="flex flex-col gap-1 pt-1">
                  <button
                    type="button"
                    onClick={() => move(idx, -1)}
                    disabled={idx === 0}
                    className="text-muted-foreground hover:text-gold disabled:opacity-30"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(idx, 1)}
                    disabled={idx === drafts.length - 1}
                    className="text-muted-foreground hover:text-gold disabled:opacity-30"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-pleno-bg text-gold border border-gold/30">
                      {TIPO_LABEL[p.tipo]}
                    </span>
                    {p.question_bank_id ? (
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Do banco
                      </span>
                    ) : (
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Customizada
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium">{p.texto}</p>
                  {p.tipo === "escolha" && p.opcoes.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {p.opcoes.join(" · ")}
                    </p>
                  )}
                  <div className="flex gap-4 mt-2 text-xs">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <Checkbox
                        checked={p.obrigatoria}
                        onCheckedChange={(v) => update(idx, { obrigatoria: !!v })}
                      />
                      Obrigatória
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <Checkbox
                        checked={p.usar_na_ia}
                        onCheckedChange={(v) => update(idx, { usar_na_ia: !!v })}
                      />
                      Enviar à IA
                    </label>
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => remove(idx)}
                  className="text-destructive hover:text-destructive shrink-0"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Revisar pacote comportamental */}
      <Dialog open={reviewOpen} onOpenChange={(o) => !reviewSaving && setReviewOpen(o)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-xl flex items-center gap-2">
              <Heart className="h-5 w-5 text-gold" /> Revisar pacote comportamental
            </DialogTitle>
            <DialogDescription>
              Selecione, edite ou remova perguntas antes de adicioná-las à vaga.
              Itens já presentes vêm desmarcados.
            </DialogDescription>
          </DialogHeader>
          {reviewLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-gold" />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {reviewItems.filter((i) => i.selecionada).length} de {reviewItems.length} selecionadas
                </span>
                <div className="flex gap-3">
                  <button
                    type="button"
                    className="text-gold hover:underline"
                    onClick={() =>
                      setReviewItems((items) =>
                        items.map((i) => ({ ...i, selecionada: !i.jaExiste })),
                      )
                    }
                  >
                    Selecionar todas (não duplicadas)
                  </button>
                  <button
                    type="button"
                    className="text-muted-foreground hover:underline"
                    onClick={() =>
                      setReviewItems((items) => items.map((i) => ({ ...i, selecionada: false })))
                    }
                  >
                    Limpar seleção
                  </button>
                </div>
              </div>
              <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-1">
                {reviewItems.map((it, idx) => (
                  <div
                    key={idx}
                    className={`rounded-lg border p-3 transition ${
                      it.jaExiste
                        ? "border-sidebar-border bg-surface-elevated/50 opacity-75"
                        : it.selecionada
                          ? "border-gold/40 bg-pleno-bg/30"
                          : "border-sidebar-border bg-surface-elevated"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={it.selecionada}
                        onCheckedChange={(v) => updateReviewItem(idx, { selecionada: !!v })}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-pleno-bg text-gold border border-gold/30">
                            {TIPO_LABEL[it.tipo]}
                          </span>
                          {it.jaExiste && (
                            <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-destructive/10 text-destructive border border-destructive/30">
                              Já existe na vaga
                            </span>
                          )}
                        </div>
                        <Textarea
                          rows={2}
                          value={it.texto}
                          onChange={(e) => updateReviewItem(idx, { texto: e.target.value })}
                          className="text-sm"
                        />
                        <div className="flex gap-4 text-xs">
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <Checkbox
                              checked={it.obrigatoria}
                              onCheckedChange={(v) => updateReviewItem(idx, { obrigatoria: !!v })}
                            />
                            Obrigatória
                          </label>
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <Checkbox
                              checked={it.usar_na_ia}
                              onCheckedChange={(v) => updateReviewItem(idx, { usar_na_ia: !!v })}
                            />
                            Enviar à IA
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setReviewOpen(false)} disabled={reviewSaving}>
              Cancelar
            </Button>
            <Button
              onClick={confirmBehavioralReview}
              disabled={reviewSaving || reviewLoading}
              className="bg-gradient-gold text-gold-foreground hover:opacity-90"
            >
              {reviewSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Adicionando...
                </>
              ) : (
                <>Adicionar à vaga</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Picker do banco */}
      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">
              Selecionar do banco
            </DialogTitle>
            <DialogDescription>
              Clique em uma pergunta para adicioná-la a esta vaga.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              value={bankSearch}
              onChange={(e) => setBankSearch(e.target.value)}
              placeholder="Buscar..."
            />
            {cargo && (
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <Checkbox
                  checked={filterByCargo}
                  onCheckedChange={(v) => setFilterByCargo(!!v)}
                />
                Mostrar apenas perguntas sugeridas para este cargo
              </label>
            )}
            {filteredBank.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                Nenhuma pergunta disponível.
              </p>
            ) : (
              <div className="space-y-1.5 max-h-[50vh] overflow-y-auto pr-1">
                {filteredBank.map((q) => (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => addFromBank(q)}
                    className="w-full text-left rounded-md border border-sidebar-border bg-surface-elevated p-3 hover:border-gold/40 transition"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-pleno-bg text-gold border border-gold/30">
                        {TIPO_LABEL[q.tipo]}
                      </span>
                    </div>
                    <p className="text-sm">{q.texto}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPickerOpen(false)}>
              <X className="h-4 w-4 mr-1" /> Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Custom */}
      <Dialog open={customOpen} onOpenChange={setCustomOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">
              Pergunta customizada
            </DialogTitle>
            <DialogDescription>
              Esta pergunta ficará vinculada apenas a esta vaga.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Texto</Label>
              <Textarea
                rows={2}
                value={customForm.texto}
                onChange={(e) =>
                  setCustomForm({ ...customForm, texto: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={customForm.tipo}
                onValueChange={(v) =>
                  setCustomForm({ ...customForm, tipo: v as PerguntaTipo })
                }
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
            {customForm.tipo === "escolha" && (
              <div className="space-y-2">
                <Label>Opções (uma por linha)</Label>
                <Textarea
                  rows={4}
                  value={customOpcoesText}
                  onChange={(e) => setCustomOpcoesText(e.target.value)}
                  placeholder={"Sim\nNão"}
                />
              </div>
            )}
            <div className="flex gap-4 text-sm">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <Checkbox
                  checked={customForm.obrigatoria}
                  onCheckedChange={(v) =>
                    setCustomForm({ ...customForm, obrigatoria: !!v })
                  }
                />
                Obrigatória
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <Checkbox
                  checked={customForm.usar_na_ia}
                  onCheckedChange={(v) =>
                    setCustomForm({ ...customForm, usar_na_ia: !!v })
                  }
                />
                Enviar à IA
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCustomOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={addCustom}
              className="bg-gradient-gold text-gold-foreground hover:opacity-90"
            >
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

/** Persiste o conjunto de perguntas-vaga, substituindo o atual. */
export async function savePerguntasForVaga(
  vagaId: string,
  drafts: DraftPergunta[],
): Promise<{ error?: unknown }> {
  const { error: delErr } = await supabase
    .from("vaga_perguntas")
    .delete()
    .eq("vaga_id", vagaId);
  if (delErr) return { error: delErr };
  if (drafts.length === 0) return {};
  const rows = drafts.map((d, i) => ({
    vaga_id: vagaId,
    question_bank_id: d.question_bank_id,
    texto: d.texto,
    tipo: d.tipo,
    opcoes: d.opcoes,
    ordem: i,
    obrigatoria: d.obrigatoria,
    usar_na_ia: d.usar_na_ia,
  }));
  const { error } = await supabase.from("vaga_perguntas").insert(rows);
  return { error };
}

export type { DraftPergunta };
