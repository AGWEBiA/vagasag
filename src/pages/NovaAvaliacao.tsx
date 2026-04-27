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
  Download,
  Filter,
} from "lucide-react";
import jsPDF from "jspdf";
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

import { TIPO_LABEL, ESCALA_LABEL, type PerguntaTipo } from "@/lib/perguntas";

type Origem = "candidato" | "time";
type SubCategoria = "todos" | "candidato_registrado" | "time" | "candidatura_virtual";

interface PersonRow {
  id: string;
  nome: string;
  email: string | null;
  cargo: string;
  origem: Origem;
  isVirtual: boolean;
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
  const [subCategoria, setSubCategoria] = useState<SubCategoria>("todos");
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
      const [{ data: cands, error }, { data: candidaturasNoCand, error: candErr }, { data: vagas }, { data: candidaturasComCand }] =
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
          supabase
            .from("candidaturas")
            .select("candidate_id, email")
            .not("candidate_id", "is", null),
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

      // Map candidate_id -> email (de candidaturas relacionadas)
      const emailByCandidateId = new Map<string, string>();
      for (const c of candidaturasComCand ?? []) {
        if (c.candidate_id && c.email && !emailByCandidateId.has(c.candidate_id)) {
          emailByCandidateId.set(c.candidate_id, c.email);
        }
      }

      const fromCandidates = (cands ?? []).map<PersonRow>((c) => {
        const list = assessmentsByCandidate.get(c.id) ?? [];
        const last = list[0] ?? null;
        return {
          id: c.id,
          nome: c.nome,
          email: emailByCandidateId.get(c.id) ?? null,
          cargo: c.cargo,
          origem: (c.origem === "time" ? "time" : "candidato") as Origem,
          isVirtual: false,
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
      const fromCandidaturas = (candidaturasNoCand ?? []).map<PersonRow>((c) => ({
        id: `cand:${c.id}`,
        nome: c.nome,
        email: c.email ?? null,
        cargo: vagaCargo.get(c.vaga_id) ?? "copywriter",
        origem: "candidato" as Origem,
        isVirtual: true,
        created_at: c.created_at,
        assessmentsCount: 0,
        lastAssessment: null,
      }));

      return [...fromCandidates, ...fromCandidaturas];
    },
  });

  const filtered = useMemo(() => {
    let list = (people ?? []).filter((p) => p.origem === tab);
    // sub-categoria só faz sentido em "candidato"
    if (tab === "candidato" && subCategoria !== "todos") {
      if (subCategoria === "candidato_registrado") {
        list = list.filter((p) => !p.isVirtual);
      } else if (subCategoria === "candidatura_virtual") {
        list = list.filter((p) => p.isVirtual);
      }
    }
    if (!search.trim()) return list;
    const q = search.trim().toLowerCase();
    return list.filter(
      (p) =>
        p.nome.toLowerCase().includes(q) ||
        (p.email ?? "").toLowerCase().includes(q) ||
        (CARGO_LABEL[p.cargo] ?? p.cargo).toLowerCase().includes(q),
    );
  }, [people, tab, search, subCategoria]);

  const counts = useMemo(() => {
    const list = people ?? [];
    const candidatoList = list.filter((p) => p.origem === "candidato");
    return {
      time: list.filter((p) => p.origem === "time").length,
      candidato: candidatoList.length,
      candidato_registrado: candidatoList.filter((p) => !p.isVirtual).length,
      candidatura_virtual: candidatoList.filter((p) => p.isVirtual).length,
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
        <Tabs
          value={tab}
          onValueChange={(v) => {
            setTab(v as Origem);
            setSubCategoria("todos");
          }}
        >
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
            <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
              {tab === "candidato" && (
                <Select
                  value={subCategoria}
                  onValueChange={(v) => setSubCategoria(v as SubCategoria)}
                >
                  <SelectTrigger className="w-full sm:w-56">
                    <Filter className="h-4 w-4 mr-1 text-muted-foreground" />
                    <SelectValue placeholder="Categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">
                      Todos ({counts.candidato})
                    </SelectItem>
                    <SelectItem value="candidato_registrado">
                      Candidatos registrados ({counts.candidato_registrado})
                    </SelectItem>
                    <SelectItem value="candidatura_virtual">
                      Candidaturas virtuais ({counts.candidatura_virtual})
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}
              <div className="relative w-full md:w-72">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por nome ou e-mail"
                  className="pl-9"
                />
              </div>
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

      {/* Modal: ver respostas */}
      <ViewAnswersDialog
        person={viewing}
        onClose={() => setViewing(null)}
        onEvaluate={(p) => {
          setViewing(null);
          handleEvaluateClick(p);
        }}
        runningId={runningId}
      />
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
                {p.isVirtual && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-gold/10 text-gold border border-gold/30 px-2 py-0.5 text-[10px] font-semibold">
                    Candidatura virtual
                  </span>
                )}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5 flex flex-wrap gap-x-3 gap-y-1">
                <span>{CARGO_LABEL[p.cargo] ?? p.cargo}</span>
                {p.email && <span className="truncate max-w-[260px]">{p.email}</span>}
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

type AnswerDetail = {
  source: "candidate" | "candidatura";
  nome: string;
  email?: string | null;
  cargo?: string | null;
  vaga_titulo?: string | null;
  dados_profissionais?: string | null;
  informacoes_adicionais?: string | null;
  perguntas: Array<{
    pergunta: string;
    tipo: string;
    resposta: string | number | null;
  }>;
};

const ViewAnswersDialog = ({
  person,
  onClose,
  onEvaluate,
  runningId,
}: {
  person: PersonRow | null;
  onClose: () => void;
  onEvaluate: (p: PersonRow) => void;
  runningId: string | null;
}) => {
  const open = !!person;
  const { data, isLoading } = useQuery({
    queryKey: ["person-answers", person?.id],
    enabled: open && !!person,
    queryFn: async (): Promise<AnswerDetail> => {
      if (!person) throw new Error("no person");

      if (person.id.startsWith("cand:")) {
        const candidaturaId = person.id.slice(5);
        const { data: cand, error } = await supabase
          .from("candidaturas")
          .select(
            "id, nome, email, dados_profissionais, informacoes_adicionais, vaga_id, vagas(titulo, cargo)",
          )
          .eq("id", candidaturaId)
          .single();
        if (error) throw error;

        const { data: respostas } = await supabase
          .from("candidatura_respostas")
          .select(
            "vaga_pergunta_id, resposta_texto, resposta_numero, vaga_perguntas(texto, tipo, ordem)",
          )
          .eq("candidatura_id", candidaturaId);

        const perguntas = (respostas ?? [])
          .map((r: any) => ({
            pergunta: r.vaga_perguntas?.texto ?? "Pergunta",
            tipo: r.vaga_perguntas?.tipo ?? "texto",
            ordem: r.vaga_perguntas?.ordem ?? 0,
            resposta: r.resposta_texto ?? r.resposta_numero ?? null,
          }))
          .sort((a: any, b: any) => a.ordem - b.ordem)
          .map(({ ordem, ...rest }: any) => rest);

        return {
          source: "candidatura",
          nome: cand.nome,
          email: cand.email,
          cargo: (cand as any).vagas?.cargo ?? null,
          vaga_titulo: (cand as any).vagas?.titulo ?? null,
          dados_profissionais: cand.dados_profissionais,
          informacoes_adicionais: cand.informacoes_adicionais,
          perguntas,
        };
      }

      const { data: c, error } = await supabase
        .from("candidates")
        .select("id, nome, cargo, dados_profissionais, informacoes_adicionais")
        .eq("id", person.id)
        .single();
      if (error) throw error;

      const { data: candidatura } = await supabase
        .from("candidaturas")
        .select("id, email, vaga_id, vagas(titulo)")
        .eq("candidate_id", person.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      let perguntas: AnswerDetail["perguntas"] = [];
      let email: string | null = null;
      let vaga_titulo: string | null = null;
      if (candidatura) {
        email = (candidatura as any).email ?? null;
        vaga_titulo = (candidatura as any).vagas?.titulo ?? null;
        const { data: respostas } = await supabase
          .from("candidatura_respostas")
          .select(
            "vaga_pergunta_id, resposta_texto, resposta_numero, vaga_perguntas(texto, tipo, ordem)",
          )
          .eq("candidatura_id", (candidatura as any).id);
        perguntas = (respostas ?? [])
          .map((r: any) => ({
            pergunta: r.vaga_perguntas?.texto ?? "Pergunta",
            tipo: r.vaga_perguntas?.tipo ?? "texto",
            ordem: r.vaga_perguntas?.ordem ?? 0,
            resposta: r.resposta_texto ?? r.resposta_numero ?? null,
          }))
          .sort((a: any, b: any) => a.ordem - b.ordem)
          .map(({ ordem, ...rest }: any) => rest);
      }

      return {
        source: "candidate",
        nome: c.nome,
        email,
        cargo: c.cargo,
        vaga_titulo,
        dados_profissionais: c.dados_profissionais,
        informacoes_adicionais: c.informacoes_adicionais,
        perguntas,
      };
    },
  });

  const isRunning = person ? runningId === person.id : false;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-gold" />
            {person?.nome ?? "Respostas"}
          </DialogTitle>
          <DialogDescription>
            Dados e respostas enviados antes da avaliação.
          </DialogDescription>
        </DialogHeader>

        {isLoading && (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-gold" />
          </div>
        )}

        {!isLoading && data && (
          <div className="space-y-5">
            <div className="rounded-lg border border-sidebar-border bg-surface-elevated p-3 text-xs grid grid-cols-1 md:grid-cols-2 gap-2">
              {data.cargo && (
                <div>
                  <span className="text-muted-foreground">Cargo: </span>
                  <span>{CARGO_LABEL[data.cargo] ?? data.cargo}</span>
                </div>
              )}
              {data.email && (
                <div>
                  <span className="text-muted-foreground">E-mail: </span>
                  <span>{data.email}</span>
                </div>
              )}
              {data.vaga_titulo && (
                <div className="md:col-span-2">
                  <span className="text-muted-foreground">Vaga: </span>
                  <span>{data.vaga_titulo}</span>
                </div>
              )}
            </div>

            {data.dados_profissionais && (
              <section>
                <h4 className="font-display text-sm font-semibold mb-1.5">
                  Dados profissionais
                </h4>
                <div className="rounded-lg border border-sidebar-border bg-background p-3 text-sm whitespace-pre-wrap break-words">
                  {data.dados_profissionais}
                </div>
              </section>
            )}

            {data.informacoes_adicionais && (
              <section>
                <h4 className="font-display text-sm font-semibold mb-1.5">
                  Informações adicionais
                </h4>
                <div className="rounded-lg border border-sidebar-border bg-background p-3 text-sm whitespace-pre-wrap break-words">
                  {data.informacoes_adicionais}
                </div>
              </section>
            )}

            {data.perguntas.length > 0 && (
              <section>
                <h4 className="font-display text-sm font-semibold mb-1.5">
                  Respostas do formulário ({data.perguntas.length})
                </h4>
                <div className="space-y-2">
                  {data.perguntas.map((q, i) => {
                    const tipo = (q.tipo as PerguntaTipo) ?? "texto";
                    const tipoLabel = TIPO_LABEL[tipo] ?? "Texto";
                    const isEscala = tipo === "escala";
                    const numero = typeof q.resposta === "number" ? q.resposta : null;
                    return (
                      <div
                        key={i}
                        className="rounded-lg border border-sidebar-border bg-background p-3"
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="text-xs text-muted-foreground">
                            {i + 1}. {q.pergunta}
                          </div>
                          <span
                            className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                              isEscala
                                ? "bg-pleno-bg text-gold border-gold/30"
                                : tipo === "escolha"
                                  ? "bg-senior-bg text-senior border-senior/30"
                                  : "bg-surface-elevated text-muted-foreground border-sidebar-border"
                            }`}
                          >
                            {tipoLabel}
                          </span>
                        </div>
                        {isEscala && numero !== null ? (
                          <div className="text-sm">
                            <span className="font-display text-lg text-gold">
                              {numero}
                            </span>
                            <span className="text-muted-foreground">
                              {" / 5"}
                              {ESCALA_LABEL[numero] && ` · ${ESCALA_LABEL[numero]}`}
                            </span>
                          </div>
                        ) : (
                          <div className="text-sm whitespace-pre-wrap break-words">
                            {q.resposta === null || q.resposta === ""
                              ? "—"
                              : String(q.resposta)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {!data.dados_profissionais &&
              !data.informacoes_adicionais &&
              data.perguntas.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Nenhum dado disponível.
                </p>
              )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
          {person && (
            <Button
              onClick={() => onEvaluate(person)}
              disabled={isRunning || isLoading}
              className="bg-gradient-gold text-gold-foreground hover:opacity-90 shadow-gold"
            >
              {isRunning ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : person.lastAssessment ? (
                <RefreshCw className="h-4 w-4 mr-2" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              {person.lastAssessment ? "Reavaliar" : "Avaliar agora"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NovaAvaliacao;
