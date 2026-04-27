import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Trophy,
  BarChart3,
  TrendingUp,
  Target,
  Users,
  Heart,
  Sparkles,
  History as HistoryIcon,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  UserPlus,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Quote,
  FileDown,
  Loader2,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  CARGO_LABEL,
  PILARES,
  SENIORIDADE_DESC,
  SENIORIDADE_LABEL,
  Senioridade,
  confidenceColorClass,
  getInitials,
  senioridadeAvatarClasses,
  senioridadeBadgeClasses,
} from "@/lib/seniority";
import {
  pesoForPilar,
  recomputeNotaPonderada,
  useAssessmentPesos,
} from "@/hooks/useAssessmentPesos";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  BarChart3,
  TrendingUp,
  Target,
  Users,
  Heart,
};

const SENIORIDADE_RANK: Record<Senioridade, number> = {
  Junior: 1,
  Pleno: 2,
  Senior: 3,
};

interface PilarData {
  nota: number;
  justificativa: string;
}

interface EvidenciaComportamental {
  trecho: string;
  pergunta?: string;
  trait?: string;
  impacto?: string;
}

interface Assessment {
  id: string;
  senioridade_detectada: Senioridade;
  confidence_score: number;
  nota_ponderada: number;
  analise_pilares: Record<string, PilarData>;
  pontos_fortes: string[];
  gaps_identificados: string[];
  perguntas_entrevista: string[];
  resumo_executivo: string;
  model_used: string;
  created_at: string;
  candidate_id: string;
  evidencias_comportamentais: EvidenciaComportamental[] | null;
  candidates: { id: string; nome: string; cargo: string; origem: string } | null;
}

const Relatorio = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["assessment", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assessments")
        .select("*, candidates(id, nome, cargo, origem)")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as Assessment | null;
    },
    enabled: !!id,
  });

  const candidateId = data?.candidate_id ?? data?.candidates?.id ?? null;

  const { data: history } = useQuery({
    queryKey: ["assessment-history", candidateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assessments")
        .select(
          "id, senioridade_detectada, confidence_score, nota_ponderada, analise_pilares, created_at",
        )
        .eq("candidate_id", candidateId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Array<{
        id: string;
        senioridade_detectada: Senioridade;
        confidence_score: number;
        nota_ponderada: number;
        analise_pilares: Record<string, PilarData>;
        created_at: string;
      }>;
    },
    enabled: !!candidateId,
  });

  const previous = useMemo(() => {
    if (!data || !history) return null;
    const idx = history.findIndex((h) => h.id === data.id);
    if (idx < 0 || idx >= history.length - 1) return null;
    return history[idx + 1];
  }, [data, history]);

  useEffect(() => {
    document.title = data?.candidates?.nome
      ? `${data.candidates.nome} | Seniority Hub`
      : "Relatório | Seniority Hub";
  }, [data]);

  if (isLoading) {
    return (
      <AppShell>
        <div className="space-y-6">
          <Skeleton className="h-32 w-full" />
          <div className="grid gap-4 md:grid-cols-3">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24" />)}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-40" />)}
          </div>
        </div>
      </AppShell>
    );
  }

  if (!data) {
    return (
      <AppShell>
        <div className="text-center py-20">
          <h2 className="font-display text-2xl mb-2">Relatório não encontrado</h2>
          <Link to="/historico">
            <Button variant="outline">Voltar ao histórico</Button>
          </Link>
        </div>
      </AppShell>
    );
  }

  const s = data.senioridade_detectada;

  return (
    <AppShell>
      {/* Section 1 — Header */}
      <header className="surface-card rounded-xl p-6 md:p-8 mb-6 animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          <div
            className={`flex h-20 w-20 items-center justify-center rounded-2xl text-2xl font-bold shrink-0 ${senioridadeAvatarClasses(s)}`}
          >
            {getInitials(data.candidates?.nome ?? "?")}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-3xl md:text-4xl font-semibold">
              {data.candidates?.nome}
            </h1>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-muted-foreground">
              <span>{CARGO_LABEL[data.candidates?.cargo ?? ""] ?? "—"}</span>
              <span>•</span>
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                {new Date(data.created_at).toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </span>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold border ${
                  data.candidates?.origem === "time"
                    ? "bg-gold/10 text-gold border-gold/30"
                    : "bg-surface-elevated text-body border-sidebar-border"
                }`}
              >
                {data.candidates?.origem === "time" ? (
                  <><Users className="h-3 w-3" /> Time</>
                ) : (
                  <><UserPlus className="h-3 w-3" /> Candidato</>
                )}
              </span>
            </div>
          </div>

          <div
            className={`rounded-xl border p-5 text-center md:text-right md:min-w-[220px] ${senioridadeBadgeClasses(s)}`}
          >
            <div className="flex items-center justify-center md:justify-end gap-2 text-xs uppercase tracking-wider mb-2 opacity-80">
              <Trophy className="h-3.5 w-3.5" /> Nível detectado
            </div>
            <div className="font-display text-4xl font-bold">
              {SENIORIDADE_LABEL[s]}
            </div>
          </div>
        </div>
        <p className="mt-5 text-body/90 max-w-3xl">
          {SENIORIDADE_DESC[s]}
        </p>
      </header>

      {/* Histórico de versões + comparação */}
      {history && history.length > 1 && (
        <section className="surface-card rounded-xl p-4 md:p-6 mb-6 animate-fade-in">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="font-display text-lg font-semibold flex items-center gap-2">
                <HistoryIcon className="h-4 w-4 text-gold" />
                Histórico desta pessoa
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {history.length} avaliações registradas. Selecione uma versão para visualizar.
              </p>
            </div>
            <Select value={data.id} onValueChange={(v) => navigate(`/relatorio/${v}`)}>
              <SelectTrigger className="w-full md:w-72">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {history.map((h, idx) => (
                  <SelectItem key={h.id} value={h.id}>
                    {idx === 0 ? "Mais recente · " : `v${history.length - idx} · `}
                    {new Date(h.created_at).toLocaleDateString("pt-BR")} ·{" "}
                    {SENIORIDADE_LABEL[h.senioridade_detectada]} ({h.nota_ponderada.toFixed(1)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {previous && <ComparisonBlock current={data} previous={previous} />}
        </section>
      )}

      {/* Section 2 — Métricas */}
      <section className="grid gap-4 md:grid-cols-3 mb-6">
        <MetricBox
          label="Nota Ponderada Final"
          value={data.nota_ponderada.toFixed(1)}
          suffix=" / 10"
          accent
        />
        <MetricBox
          label="Confiança da IA"
          value={`${data.confidence_score}%`}
          progress={data.confidence_score}
          progressClass={confidenceColorClass(data.confidence_score)}
        />
        <MetricBox
          label="Modelo de IA"
          value={data.model_used.split("/")[1] ?? data.model_used}
          subtle
        />
      </section>

      {/* Section 3 — Pilares (técnicos + comportamental) */}
      <section className="mb-6">
        <h2 className="font-display text-2xl font-semibold mb-4">
          Análise por Pilar
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          {PILARES.map((p) => {
            const pilar = data.analise_pilares[p.key];
            if (!pilar) return null;
            const Icon = ICONS[p.icon];
            return (
              <div key={p.key} className="surface-card rounded-xl p-6">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-pleno-bg text-gold">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-semibold">{p.label}</div>
                      <div className="text-xs text-muted-foreground">
                        Peso {p.weight}%
                      </div>
                    </div>
                  </div>
                  <div className="font-display text-3xl font-semibold text-gold">
                    {pilar.nota.toFixed(1)}
                  </div>
                </div>
                <div className="h-2 rounded-full bg-secondary overflow-hidden mb-4">
                  <div
                    className="h-full bg-gradient-gold rounded-full"
                    style={{ width: `${(pilar.nota / 10) * 100}%` }}
                  />
                </div>
                <p className="text-sm text-body/85 leading-relaxed">
                  {pilar.justificativa}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Section 4 — Pontos Fortes & Gaps */}
      <section className="grid gap-4 md:grid-cols-2 mb-6">
        <div className="surface-card rounded-xl p-6">
          <h3 className="font-display text-xl font-semibold mb-4 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-senior" />
            Pontos Fortes
          </h3>
          <ul className="space-y-3">
            {data.pontos_fortes.map((p, i) => (
              <li key={i} className="flex gap-3 text-sm text-body/90">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-senior shrink-0" />
                {p}
              </li>
            ))}
          </ul>
        </div>
        <div className="surface-card rounded-xl p-6">
          <h3 className="font-display text-xl font-semibold mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Gaps Identificados
          </h3>
          <ul className="space-y-3">
            {data.gaps_identificados.map((g, i) => (
              <li key={i} className="flex gap-3 text-sm text-body/90">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-destructive shrink-0" />
                {g}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Section 5 — Perguntas */}
      <section className="mb-6">
        <h2 className="font-display text-2xl font-semibold mb-4">
          Perguntas Sugeridas para Entrevista
        </h2>
        <div className="grid gap-3">
          {data.perguntas_entrevista.map((q, i) => (
            <div
              key={i}
              className="surface-card rounded-xl p-5 flex gap-4 items-start"
            >
              <div className="font-display text-2xl font-bold text-gradient-gold shrink-0 w-8">
                {i + 1}
              </div>
              <p className="text-body/90 pt-1">{q}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Section 6 — Resumo */}
      <section className="rounded-xl p-6 md:p-8 mb-8 bg-gradient-surface border-2 border-gold/40 shadow-gold">
        <h2 className="font-display text-2xl font-semibold mb-3 text-gradient-gold">
          Resumo Executivo
        </h2>
        <p className="text-body/95 leading-relaxed whitespace-pre-line">
          {data.resumo_executivo}
        </p>
      </section>

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Link to="/nova-avaliacao" className="flex-1">
          <Button className="w-full bg-gradient-gold text-gold-foreground hover:opacity-90 shadow-gold h-11">
            <Sparkles className="h-4 w-4 mr-2" /> Nova Avaliação
          </Button>
        </Link>
        <Link to="/historico" className="flex-1">
          <Button variant="outline" className="w-full h-11 border-gold/40 hover:text-gold hover:border-gold">
            <HistoryIcon className="h-4 w-4 mr-2" /> Ver Histórico
          </Button>
        </Link>
      </div>
    </AppShell>
  );
};

const MetricBox = ({
  label,
  value,
  suffix,
  progress,
  progressClass,
  accent,
  subtle,
}: {
  label: string;
  value: string;
  suffix?: string;
  progress?: number;
  progressClass?: string;
  accent?: boolean;
  subtle?: boolean;
}) => (
  <div
    className={`surface-card rounded-xl p-5 ${accent ? "ring-1 ring-gold/30 shadow-gold" : ""}`}
  >
    <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
      {label}
    </div>
    <div className={`font-display text-3xl font-semibold ${accent ? "text-gradient-gold" : subtle ? "text-body" : ""}`}>
      {value}
      {suffix && <span className="text-base text-muted-foreground font-normal">{suffix}</span>}
    </div>
    {progress !== undefined && (
      <div className="mt-3 h-1.5 rounded-full bg-secondary overflow-hidden">
        <div className={`h-full ${progressClass}`} style={{ width: `${progress}%` }} />
      </div>
    )}
  </div>
);

const ComparisonBlock = ({
  current,
  previous,
}: {
  current: { senioridade_detectada: Senioridade; nota_ponderada: number; analise_pilares: Record<string, PilarData>; created_at: string };
  previous: { senioridade_detectada: Senioridade; nota_ponderada: number; analise_pilares: Record<string, PilarData>; created_at: string };
}) => {
  const deltaNota = current.nota_ponderada - previous.nota_ponderada;
  const deltaRank =
    SENIORIDADE_RANK[current.senioridade_detectada] -
    SENIORIDADE_RANK[previous.senioridade_detectada];

  const trendIcon = (delta: number) => {
    if (delta > 0.05) return <ArrowUpRight className="h-4 w-4 text-senior" />;
    if (delta < -0.05) return <ArrowDownRight className="h-4 w-4 text-destructive" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const trendClass = (delta: number) =>
    delta > 0.05
      ? "text-senior"
      : delta < -0.05
        ? "text-destructive"
        : "text-muted-foreground";

  return (
    <div className="rounded-lg border border-sidebar-border bg-surface-elevated/60 p-4">
      <div className="text-xs text-muted-foreground mb-3">
        Comparando com a avaliação de{" "}
        <strong>
          {new Date(previous.created_at).toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })}
        </strong>
      </div>

      <div className="grid gap-3 md:grid-cols-2 mb-4">
        <div className="rounded-md border border-sidebar-border bg-background p-3">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Nível
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm">
              {SENIORIDADE_LABEL[previous.senioridade_detectada]}
            </span>
            <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground rotate-45" />
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border ${senioridadeBadgeClasses(current.senioridade_detectada)}`}
            >
              {SENIORIDADE_LABEL[current.senioridade_detectada]}
            </span>
            {deltaRank !== 0 && (
              <span
                className={`text-[11px] font-medium ${deltaRank > 0 ? "text-senior" : "text-destructive"}`}
              >
                {deltaRank > 0
                  ? `Subiu ${deltaRank} nível${deltaRank > 1 ? "s" : ""}`
                  : `Desceu ${Math.abs(deltaRank)} nível${Math.abs(deltaRank) > 1 ? "s" : ""}`}
              </span>
            )}
            {deltaRank === 0 && (
              <span className="text-[11px] text-muted-foreground">
                Mesmo nível
              </span>
            )}
          </div>
        </div>

        <div className="rounded-md border border-sidebar-border bg-background p-3">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Nota ponderada
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm">{previous.nota_ponderada.toFixed(1)}</span>
            <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground rotate-45" />
            <span className="font-display text-lg">
              {current.nota_ponderada.toFixed(1)}
            </span>
            <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${trendClass(deltaNota)}`}>
              {trendIcon(deltaNota)}
              {deltaNota >= 0 ? "+" : ""}
              {deltaNota.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
        Evolução por pilar
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        {PILARES.map((p) => {
          const cur = current.analise_pilares?.[p.key]?.nota;
          const prev = previous.analise_pilares?.[p.key]?.nota;
          if (typeof cur !== "number" || typeof prev !== "number") return null;
          const d = cur - prev;
          return (
            <div
              key={p.key}
              className="flex items-center justify-between rounded-md border border-sidebar-border bg-background px-3 py-2 text-xs"
            >
              <span className="truncate">{p.label}</span>
              <span className="flex items-center gap-2 shrink-0">
                <span className="text-muted-foreground">
                  {prev.toFixed(1)} → {cur.toFixed(1)}
                </span>
                <span className={`inline-flex items-center gap-0.5 font-medium ${trendClass(d)}`}>
                  {trendIcon(d)}
                  {d >= 0 ? "+" : ""}
                  {d.toFixed(2)}
                </span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Relatorio;

