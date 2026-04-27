import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Sparkles,
  Loader2,
  Info,
  Users,
  UserPlus,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  ArrowRight,
  RefreshCw,
  Eye,
  FileText,
} from "lucide-react";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CARGO_LABEL,
  CARGOS,
  CARGO_HINTS,
  SENIORIDADE_LABEL,
  Senioridade,
  senioridadeBadgeClasses,
} from "@/lib/seniority";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Origem = "candidato" | "time";

interface PersonRow {
  id: string;
  nome: string;
  cargo: string;
  origem: Origem;
  created_at: string;
  assessmentsCount: number;
  lastAssessment: {
    id: string;
    senioridade_detectada: Senioridade;
    nota_ponderada: number;
    created_at: string;
  } | null;
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const NovaAvaliacao = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Origem>("candidato");
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [confirmReassess, setConfirmReassess] = useState<PersonRow | null>(null);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [viewing, setViewing] = useState<PersonRow | null>(null);

  useEffect(() => {
    document.title = "Nova Avaliação | Seniority Hub";
  }, []);

  const { data: people, isLoading } = useQuery({
    queryKey: ["people-with-assessments"],
    queryFn: async () => {
      const [{ data: cands, error }, { data: candidaturas, error: candErr }, { data: vagas }] =
        await Promise.all([
          supabase
            .from("candidates")
            .select("id, nome, cargo, origem, created_at")
            .order("created_at", { ascending: false }),
          supabase
            .from("candidaturas")
            .select("id, nome, email, candidate_id, vaga_id, created_at")
            .is("candidate_id", null)
            .order("created_at", { ascending: false }),
          supabase.from("vagas").select("id, cargo"),
        ]);
      if (error) throw error;
      if (candErr) throw candErr;

      const ids = (cands ?? []).map((c) => c.id);
      let assessmentsByCandidate = new Map<
        string,
        Array<{
          id: string;
          senioridade_detectada: string;
          nota_ponderada: number;
          created_at: string;
        }>
      >();
      if (ids.length > 0) {
        const { data: assessments, error: assErr } = await supabase
          .from("assessments")
          .select("id, candidate_id, senioridade_detectada, nota_ponderada, created_at")
          .in("candidate_id", ids)
          .order("created_at", { ascending: false });
        if (assErr) throw assErr;
        for (const a of assessments ?? []) {
          const arr = assessmentsByCandidate.get(a.candidate_id) ?? [];
          arr.push({
            id: a.id,
            senioridade_detectada: a.senioridade_detectada,
            nota_ponderada: Number(a.nota_ponderada),
            created_at: a.created_at,
          });
          assessmentsByCandidate.set(a.candidate_id, arr);
        }
      }

      const fromCandidates = (cands ?? []).map<PersonRow>((c) => {
        const list = assessmentsByCandidate.get(c.id) ?? [];
        const last = list[0] ?? null;
        return {
          id: c.id,
          nome: c.nome,
          cargo: c.cargo,
          origem: (c.origem === "time" ? "time" : "candidato") as Origem,
          created_at: c.created_at,
          assessmentsCount: list.length,
          lastAssessment: last
            ? {
                id: last.id,
                senioridade_detectada: last.senioridade_detectada as Senioridade,
                nota_ponderada: last.nota_ponderada,
                created_at: last.created_at,
              }
            : null,
        };
      });

      // Talentos do banco que ainda não viraram "candidate"
      const vagaCargo = new Map((vagas ?? []).map((v) => [v.id, v.cargo]));
      const fromCandidaturas = (candidaturas ?? []).map<PersonRow>((c) => ({
        id: `cand:${c.id}`,
        nome: c.nome,
        cargo: vagaCargo.get(c.vaga_id) ?? "copywriter",
        origem: "candidato" as Origem,
        created_at: c.created_at,
        assessmentsCount: 0,
        lastAssessment: null,
      }));

      return [...fromCandidates, ...fromCandidaturas];
    },
  });

  const filtered = useMemo(() => {
    const list = (people ?? []).filter((p) => p.origem === tab);
    if (!search.trim()) return list;
    const q = search.trim().toLowerCase();
    return list.filter(
      (p) =>
        p.nome.toLowerCase().includes(q) ||
        (CARGO_LABEL[p.cargo] ?? p.cargo).toLowerCase().includes(q),
    );
  }, [people, tab, search]);

  const counts = useMemo(() => {
    const list = people ?? [];
    return {
      time: list.filter((p) => p.origem === "time").length,
      candidato: list.filter((p) => p.origem === "candidato").length,
      pendentes: list.filter((p) => !p.lastAssessment).length,
    };
  }, [people]);

  const runAssessment = async (
    candidateId: string,
    expectReassess: boolean,
  ) => {
    setRunningId(candidateId);
    try {
      let realCandidateId = candidateId;

      // Promover candidatura → candidate quando id virtual
      if (candidateId.startsWith("cand:")) {
        const candidaturaId = candidateId.slice(5);
        const { data: cand, error: cErr } = await supabase
          .from("candidaturas")
          .select(
            "id, nome, email, dados_profissionais, informacoes_adicionais, vaga_id, vagas(cargo)",
          )
          .eq("id", candidaturaId)
          .single();
        if (cErr || !cand) throw new Error("Talento não encontrado.");

        const { data: userRes } = await supabase.auth.getUser();
        const userId = userRes.user?.id;
        if (!userId) throw new Error("Sessão expirada.");

        const cargo = (cand as any).vagas?.cargo ?? "copywriter";
        const { data: created, error: insErr } = await supabase
          .from("candidates")
          .insert({
            nome: cand.nome,
            cargo,
            dados_profissionais: cand.dados_profissionais,
            informacoes_adicionais: cand.informacoes_adicionais,
            origem: "candidato",
            created_by: userId,
          })
          .select("id")
          .single();
        if (insErr || !created) throw insErr ?? new Error("Falha ao criar candidato.");

        realCandidateId = created.id;
        await supabase
          .from("candidaturas")
          .update({ candidate_id: realCandidateId })
          .eq("id", candidaturaId);
      }

      const { data, error } = await supabase.functions.invoke("assess-candidate", {
        body: { candidateId: realCandidateId },
      });
      if (error) throw error;
      if (!data?.assessment?.id) throw new Error("Resposta inválida da IA.");
      toast.success(expectReassess ? "Reavaliação concluída!" : "Avaliação concluída!");
      queryClient.invalidateQueries({ queryKey: ["people-with-assessments"] });
      navigate(`/relatorio/${data.assessment.id}`);
    } catch (err: any) {
      console.error(err);
      const msg =
        err?.context?.error || err?.message || "Erro ao processar avaliação.";
      toast.error(typeof msg === "string" ? msg : "Erro ao avaliar.");
    } finally {
      setRunningId(null);
      setConfirmReassess(null);
    }
  };

  const handleEvaluateClick = (person: PersonRow) => {
    if (person.lastAssessment) {
      setConfirmReassess(person);
    } else {
      runAssessment(person.id, false);
    }
  };

  return (
    <AppShell>
      <header className="mb-6 animate-fade-in flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pleno-bg text-gold text-xs font-medium mb-3 border border-gold/30">
            <Sparkles className="h-3 w-3" /> Powered by IA
          </div>
          <h1 className="font-display text-4xl font-semibold">Avaliações</h1>
          <p className="text-muted-foreground mt-1">
            Selecione uma pessoa para avaliar ou reavaliar. Cada análise fica
            salva no histórico para acompanhar a evolução.
          </p>
        </div>
        <Button
          onClick={() => setCreateOpen(true)}
          className="bg-gradient-gold text-gold-foreground hover:opacity-90 shadow-gold"
        >
          <Plus className="h-4 w-4 mr-2" /> Cadastrar novo
        </Button>
      </header>

      <div className="surface-card rounded-xl p-4 md:p-6">
        <Tabs value={tab} onValueChange={(v) => setTab(v as Origem)}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
            <TabsList>
              <TabsTrigger value="candidato" className="gap-2">
                <UserPlus className="h-4 w-4" /> Candidatos
                <span className="ml-1 text-[10px] rounded-full bg-secondary text-muted-foreground px-1.5 py-0.5">
                  {counts.candidato}
                </span>
              </TabsTrigger>
              <TabsTrigger value="time" className="gap-2">
                <Users className="h-4 w-4" /> Time
                <span className="ml-1 text-[10px] rounded-full bg-secondary text-muted-foreground px-1.5 py-0.5">
                  {counts.time}
                </span>
              </TabsTrigger>
            </TabsList>
            <div className="relative w-full md:w-72">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nome ou cargo"
                className="pl-9"
              />
            </div>
          </div>

          <TabsContent value="candidato" className="mt-0">
            <PersonList
              people={filtered}
              isLoading={isLoading}
              runningId={runningId}
              onEvaluate={handleEvaluateClick}
              onView={(id) => navigate(`/relatorio/${id}`)}
              onViewAnswers={(p) => setViewing(p)}
              emptyHint="Nenhum candidato cadastrado nesta categoria. Use 'Cadastrar novo' ou aguarde candidaturas pelo portal de vagas."
            />
          </TabsContent>
          <TabsContent value="time" className="mt-0">
            <PersonList
              people={filtered}
              isLoading={isLoading}
              runningId={runningId}
              onEvaluate={handleEvaluateClick}
              onView={(id) => navigate(`/relatorio/${id}`)}
              onViewAnswers={(p) => setViewing(p)}
              emptyHint="Nenhum membro do time enviou autoavaliação ainda. Eles podem fazer login e enviar pela página de Autoavaliação."
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Modal cadastrar novo */}
      <CreatePersonDialog
        open={createOpen}
        defaultOrigem={tab}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          setCreateOpen(false);
          queryClient.invalidateQueries({ queryKey: ["people-with-assessments"] });
        }}
        onEvaluate={async (candidateId) => {
          setCreateOpen(false);
          await runAssessment(candidateId, false);
        }}
      />

      {/* Confirmação de reavaliação */}
      <Dialog
        open={!!confirmReassess}
        onOpenChange={(o) => !o && setConfirmReassess(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-gold" /> Refazer avaliação?
            </DialogTitle>
            <DialogDescription>
              <strong>{confirmReassess?.nome}</strong> já tem{" "}
              {confirmReassess?.assessmentsCount} avaliação
              {(confirmReassess?.assessmentsCount ?? 0) > 1 ? "ões" : ""} no
              histórico. Uma nova análise será criada e a anterior continuará
              salva, permitindo comparar a evolução ao longo do tempo.
            </DialogDescription>
          </DialogHeader>
          {confirmReassess?.lastAssessment && (
            <div className="rounded-lg border border-sidebar-border bg-surface-elevated p-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Última avaliação</span>
                <span>
                  {formatDate(confirmReassess.lastAssessment.created_at)}
                </span>
              </div>
              <div className="flex items-center justify-between mt-1.5">
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border ${senioridadeBadgeClasses(confirmReassess.lastAssessment.senioridade_detectada)}`}
                >
                  {SENIORIDADE_LABEL[confirmReassess.lastAssessment.senioridade_detectada]}
                </span>
                <span className="font-display text-base">
                  {confirmReassess.lastAssessment.nota_ponderada.toFixed(1)} / 10
                </span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                if (confirmReassess?.lastAssessment) {
                  navigate(`/relatorio/${confirmReassess.lastAssessment.id}`);
                  setConfirmReassess(null);
                }
              }}
              disabled={runningId !== null}
            >
              Ver relatório atual
            </Button>
            <Button
              onClick={() =>
                confirmReassess && runAssessment(confirmReassess.id, true)
              }
              disabled={runningId !== null}
              className="bg-gradient-gold text-gold-foreground hover:opacity-90 shadow-gold"
            >
              {runningId ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Refazer agora
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
};

const PersonList = ({
  people,
  isLoading,
  runningId,
  onEvaluate,
  onView,
  onViewAnswers,
  emptyHint,
}: {
  people: PersonRow[];
  isLoading: boolean;
  runningId: string | null;
  onEvaluate: (p: PersonRow) => void;
  onView: (assessmentId: string) => void;
  onViewAnswers: (p: PersonRow) => void;
  emptyHint: string;
}) => {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }
  if (people.length === 0) {
    return (
      <div className="text-center py-12 text-sm text-muted-foreground">
        {emptyHint}
      </div>
    );
  }
  return (
    <div className="divide-y divide-sidebar-border">
      {people.map((p) => {
        const isRunning = runningId === p.id;
        const hasAssessment = !!p.lastAssessment;
        return (
          <div
            key={p.id}
            className="flex flex-col md:flex-row md:items-center gap-3 py-4"
          >
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => onViewAnswers(p)}
                  className="font-medium truncate text-left hover:text-gold underline-offset-4 hover:underline transition-colors"
                  title="Ver respostas e dados enviados"
                >
                  {p.nome}
                </button>
                {hasAssessment ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-senior-bg text-senior border border-senior/30 px-2 py-0.5 text-[10px] font-semibold">
                    <CheckCircle2 className="h-3 w-3" /> Avaliada
                    {p.assessmentsCount > 1 && (
                      <span className="ml-1 opacity-80">×{p.assessmentsCount}</span>
                    )}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-surface-elevated text-muted-foreground border border-sidebar-border px-2 py-0.5 text-[10px] font-semibold">
                    <Clock className="h-3 w-3" /> Pendente
                  </span>
                )}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5 flex flex-wrap gap-x-3 gap-y-1">
                <span>{CARGO_LABEL[p.cargo] ?? p.cargo}</span>
                <span>Cadastrada em {formatDate(p.created_at)}</span>
                {p.lastAssessment && (
                  <span>
                    Última avaliação em {formatDate(p.lastAssessment.created_at)}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => onViewAnswers(p)}
                  className="inline-flex items-center gap-1 text-gold hover:text-gold-bright"
                >
                  <Eye className="h-3 w-3" /> Ver respostas
                </button>
              </div>
            </div>

            {p.lastAssessment && (
              <div className="flex items-center gap-3 md:px-4">
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border ${senioridadeBadgeClasses(p.lastAssessment.senioridade_detectada)}`}
                >
                  {SENIORIDADE_LABEL[p.lastAssessment.senioridade_detectada]}
                </span>
                <span className="font-display text-base">
                  {p.lastAssessment.nota_ponderada.toFixed(1)}
                </span>
              </div>
            )}

            <div className="flex gap-2">
              {p.lastAssessment && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onView(p.lastAssessment!.id)}
                  disabled={isRunning}
                >
                  Ver relatório
                  <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              )}
              <Button
                size="sm"
                onClick={() => onEvaluate(p)}
                disabled={isRunning}
                className="bg-gradient-gold text-gold-foreground hover:opacity-90 shadow-gold"
              >
                {isRunning ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                ) : hasAssessment ? (
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                )}
                {isRunning ? "Avaliando..." : hasAssessment ? "Reavaliar" : "Avaliar"}
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const CreatePersonDialog = ({
  open,
  defaultOrigem,
  onClose,
  onCreated,
  onEvaluate,
}: {
  open: boolean;
  defaultOrigem: Origem;
  onClose: () => void;
  onCreated: () => void;
  onEvaluate: (candidateId: string) => Promise<void>;
}) => {
  const [origem, setOrigem] = useState<Origem>(defaultOrigem);
  const [nome, setNome] = useState("");
  const [cargo, setCargo] = useState("");
  const [dados, setDados] = useState("");
  const [info, setInfo] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [evaluateAfter, setEvaluateAfter] = useState(true);

  useEffect(() => {
    if (open) setOrigem(defaultOrigem);
  }, [open, defaultOrigem]);

  useEffect(() => {
    if (!open) {
      setNome("");
      setCargo("");
      setDados("");
      setInfo("");
      setErrors({});
      setEvaluateAfter(true);
    }
  }, [open]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!nome.trim()) e.nome = "Informe o nome.";
    if (!cargo) e.cargo = "Selecione o cargo.";
    if (dados.trim().length < 50)
      e.dados = "Inclua pelo menos 50 caracteres descrevendo a experiência.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const userId = userRes.user?.id;
      if (!userId) throw new Error("Sessão expirada.");
      const { data, error } = await supabase
        .from("candidates")
        .insert({
          nome: nome.trim(),
          cargo,
          dados_profissionais: dados.trim(),
          informacoes_adicionais: info.trim() || null,
          origem,
          created_by: userId,
        })
        .select("id")
        .single();
      if (error) throw error;
      toast.success("Cadastro salvo!");
      if (evaluateAfter && data?.id) {
        await onEvaluate(data.id);
      } else {
        onCreated();
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Erro ao salvar cadastro.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !submitting && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cadastrar novo</DialogTitle>
          <DialogDescription>
            Adicione uma pessoa na base. Você pode rodar a avaliação logo em
            seguida ou apenas salvar para depois.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setOrigem("candidato")}
              disabled={submitting}
              className={`rounded-lg border p-3 text-left transition-all ${
                origem === "candidato"
                  ? "border-gold/60 bg-pleno-bg/30 shadow-gold"
                  : "border-sidebar-border bg-surface-elevated hover:border-gold/30"
              }`}
            >
              <div className="text-sm font-semibold flex items-center gap-2">
                <UserPlus className="h-4 w-4" /> Candidato
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                Pessoa em processo seletivo
              </div>
            </button>
            <button
              type="button"
              onClick={() => setOrigem("time")}
              disabled={submitting}
              className={`rounded-lg border p-3 text-left transition-all ${
                origem === "time"
                  ? "border-gold/60 bg-pleno-bg/30 shadow-gold"
                  : "border-sidebar-border bg-surface-elevated hover:border-gold/30"
              }`}
            >
              <div className="text-sm font-semibold flex items-center gap-2">
                <Users className="h-4 w-4" /> Membro do time
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                Avaliação interna
              </div>
            </button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="nome">Nome <span className="text-destructive">*</span></Label>
            <Input
              id="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              disabled={submitting}
            />
            {errors.nome && <p className="text-xs text-destructive">{errors.nome}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="cargo">Cargo <span className="text-destructive">*</span></Label>
            <Select value={cargo} onValueChange={setCargo} disabled={submitting}>
              <SelectTrigger id="cargo">
                <SelectValue placeholder="Selecione o cargo" />
              </SelectTrigger>
              <SelectContent>
                {CARGOS.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.cargo && <p className="text-xs text-destructive">{errors.cargo}</p>}
            {cargo && (
              <div className="mt-1 flex gap-2 rounded-md bg-surface-elevated border border-gold/20 p-2.5 text-xs text-body">
                <Info className="h-4 w-4 text-gold shrink-0 mt-0.5" />
                <span>{CARGO_HINTS[cargo]}</span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="dados">
              Dados profissionais <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="dados"
              value={dados}
              onChange={(e) => setDados(e.target.value)}
              rows={6}
              disabled={submitting}
              className="resize-none"
              placeholder="Currículo, experiência, ferramentas, conquistas mensuráveis..."
            />
            <div className="flex justify-between text-xs">
              <p className="text-muted-foreground">Mínimo 50 caracteres.</p>
              <span className={dados.length < 50 ? "text-muted-foreground" : "text-senior"}>
                {dados.length} chars
              </span>
            </div>
            {errors.dados && <p className="text-xs text-destructive">{errors.dados}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="info">Informações adicionais (opcional)</Label>
            <Textarea
              id="info"
              value={info}
              onChange={(e) => setInfo(e.target.value)}
              rows={2}
              disabled={submitting}
              className="resize-none"
            />
          </div>

          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={evaluateAfter}
              onChange={(e) => setEvaluateAfter(e.target.checked)}
              disabled={submitting}
              className="rounded border-sidebar-border"
            />
            Rodar avaliação com IA logo após salvar
          </label>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-gradient-gold text-gold-foreground hover:opacity-90 shadow-gold"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              {submitting
                ? "Processando..."
                : evaluateAfter
                  ? "Salvar e avaliar"
                  : "Apenas salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default NovaAvaliacao;
