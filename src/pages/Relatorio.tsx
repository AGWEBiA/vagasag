import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Trophy,
  BarChart3,
  TrendingUp,
  Target,
  Users,
  Sparkles,
  History as HistoryIcon,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  UserPlus,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
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

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  BarChart3,
  TrendingUp,
  Target,
  Users,
};

interface PilarData {
  nota: number;
  justificativa: string;
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
  candidates: { id: string; nome: string; cargo: string } | null;
}

const Relatorio = () => {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading } = useQuery({
    queryKey: ["assessment", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assessments")
        .select("*, candidates(id, nome, cargo)")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as Assessment | null;
    },
    enabled: !!id,
  });

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

      {/* Section 3 — 4 Pilares */}
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

export default Relatorio;
