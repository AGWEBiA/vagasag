import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  TrendingUp,
  Filter,
  Briefcase,
  Clock,
  CheckCircle2,
  Users,
  Activity,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface VagaRow {
  id: string;
  titulo: string;
  status: string;
}

interface CandidaturaRow {
  id: string;
  vaga_id: string;
  estagio_id: string | null;
  estagio_atualizado_em: string;
  created_at: string;
  candidate_id: string | null;
}

interface EstagioRow {
  id: string;
  nome: string;
  ordem: number;
  cor: string;
  tipo: "inicial" | "intermediario" | "final_aprovado" | "final_reprovado";
}

interface EventoRow {
  candidatura_id: string;
  tipo: string;
  created_at: string;
  dados: { estagio_anterior_id?: string; estagio_novo_id?: string } | null;
}

interface AssessmentRow {
  id: string;
  nota_ponderada: number | null;
  confidence_score: number | null;
  created_at: string;
  candidate_id: string | null;
}

const Analytics = () => {
  useEffect(() => {
    document.title = "Analytics | Seniority Hub";
  }, []);

  const [vagaFiltro, setVagaFiltro] = useState<string>("all");
  const [periodoDias, setPeriodoDias] = useState<number>(30);

  const { data, isLoading } = useQuery({
    queryKey: ["analytics-data", periodoDias],
    queryFn: async () => {
      const desde = new Date(Date.now() - periodoDias * 24 * 60 * 60 * 1000).toISOString();
      const [v, c, e, ev, a] = await Promise.all([
        supabase.from("vagas").select("id, titulo, status"),
        supabase
          .from("candidaturas")
          .select("id, vaga_id, estagio_id, estagio_atualizado_em, created_at, candidate_id")
          .gte("created_at", desde),
        supabase.from("pipeline_estagios").select("id, nome, ordem, cor, tipo").order("ordem"),
        supabase
          .from("candidatura_eventos")
          .select("candidatura_id, tipo, created_at, dados")
          .eq("tipo", "mudou_estagio")
          .gte("created_at", desde),
        supabase
          .from("assessments")
          .select("id, nota_ponderada, confidence_score, created_at, candidate_id")
          .gte("created_at", desde),
      ]);
      return {
        vagas: (v.data ?? []) as VagaRow[],
        candidaturas: (c.data ?? []) as CandidaturaRow[],
        estagios: (e.data ?? []) as EstagioRow[],
        eventos: (ev.data ?? []) as EventoRow[],
        assessments: (a.data ?? []) as AssessmentRow[],
      };
    },
  });

  const candidaturasFiltradas = useMemo(() => {
    if (!data) return [];
    if (vagaFiltro === "all") return data.candidaturas;
    return data.candidaturas.filter((c) => c.vaga_id === vagaFiltro);
  }, [data, vagaFiltro]);

  // Funil: nº de candidaturas por estágio
  const funil = useMemo(() => {
    if (!data) return [];
    const map = new Map<string, number>();
    for (const c of candidaturasFiltradas) {
      if (!c.estagio_id) continue;
      map.set(c.estagio_id, (map.get(c.estagio_id) ?? 0) + 1);
    }
    return data.estagios
      .filter((e) => e.tipo !== "final_reprovado")
      .map((e) => ({
        nome: e.nome,
        count: map.get(e.id) ?? 0,
        cor: e.cor,
        tipo: e.tipo,
      }));
  }, [data, candidaturasFiltradas]);

  // Tempo médio por estágio (em dias) — calcula transições no histórico
  const tempoMedioEstagio = useMemo(() => {
    if (!data) return [];
    // Agrupa eventos por candidatura
    const porCand = new Map<string, EventoRow[]>();
    const candIds = new Set(candidaturasFiltradas.map((c) => c.id));
    for (const ev of data.eventos) {
      if (!candIds.has(ev.candidatura_id)) continue;
      const arr = porCand.get(ev.candidatura_id) ?? [];
      arr.push(ev);
      porCand.set(ev.candidatura_id, arr);
    }
    // Para cada estágio, soma tempos de permanência (entre eventos)
    const tempos: Record<string, { soma: number; count: number }> = {};
    for (const [, evs] of porCand) {
      const sorted = [...evs].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      );
      for (let i = 0; i < sorted.length; i++) {
        const ev = sorted[i];
        const estId = ev.dados?.estagio_anterior_id;
        if (!estId) continue;
        const prev = i === 0 ? null : sorted[i - 1];
        const inicio = prev
          ? new Date(prev.created_at).getTime()
          : new Date(
              data.candidaturas.find((c) => c.id === ev.candidatura_id)?.created_at ?? ev.created_at,
            ).getTime();
        const fim = new Date(ev.created_at).getTime();
        const dias = Math.max(0, (fim - inicio) / (1000 * 60 * 60 * 24));
        if (!tempos[estId]) tempos[estId] = { soma: 0, count: 0 };
        tempos[estId].soma += dias;
        tempos[estId].count += 1;
      }
    }
    return data.estagios.map((e) => ({
      nome: e.nome,
      diasMedio: tempos[e.id] ? Number((tempos[e.id].soma / tempos[e.id].count).toFixed(1)) : 0,
      cor: e.cor,
    }));
  }, [data, candidaturasFiltradas]);

  // KPIs gerais
  const kpis = useMemo(() => {
    if (!data) {
      return { total: 0, aprovados: 0, reprovados: 0, taxaAprov: 0, scoreMedio: 0, vagasAtivas: 0 };
    }
    const finais = new Set(
      data.estagios
        .filter((e) => e.tipo === "final_aprovado")
        .map((e) => e.id),
    );
    const reps = new Set(
      data.estagios
        .filter((e) => e.tipo === "final_reprovado")
        .map((e) => e.id),
    );
    const total = candidaturasFiltradas.length;
    const aprovados = candidaturasFiltradas.filter(
      (c) => c.estagio_id && finais.has(c.estagio_id),
    ).length;
    const reprovados = candidaturasFiltradas.filter(
      (c) => c.estagio_id && reps.has(c.estagio_id),
    ).length;
    const decididos = aprovados + reprovados;
    const taxaAprov = decididos > 0 ? Math.round((aprovados / decididos) * 100) : 0;

    const candIds = new Set(candidaturasFiltradas.map((c) => c.candidate_id).filter(Boolean));
    const aFiltrados = data.assessments.filter(
      (a) => a.candidate_id && candIds.has(a.candidate_id) && a.nota_ponderada != null,
    );
    const scoreMedio =
      aFiltrados.length > 0
        ? Number(
            (aFiltrados.reduce((s, a) => s + (a.nota_ponderada ?? 0), 0) / aFiltrados.length).toFixed(
              1,
            ),
          )
        : 0;

    const vagasAtivas = data.vagas.filter((v) => v.status === "aberta").length;

    return { total, aprovados, reprovados, taxaAprov, scoreMedio, vagasAtivas };
  }, [data, candidaturasFiltradas]);

  // Tendência: candidaturas por dia
  const tendencia = useMemo(() => {
    const buckets: Record<string, number> = {};
    for (let i = periodoDias - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const k = d.toISOString().slice(0, 10);
      buckets[k] = 0;
    }
    for (const c of candidaturasFiltradas) {
      const k = c.created_at.slice(0, 10);
      if (k in buckets) buckets[k] += 1;
    }
    return Object.entries(buckets).map(([data, count]) => ({
      data: data.slice(5).split("-").reverse().join("/"),
      count,
    }));
  }, [candidaturasFiltradas, periodoDias]);

  return (
    <AppShell>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3 animate-fade-in">
        <div>
          <h1 className="font-display text-4xl font-semibold">Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Funil, tempos e performance do recrutamento.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={vagaFiltro} onValueChange={setVagaFiltro}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Vaga" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as vagas</SelectItem>
              {data?.vagas.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.titulo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={String(periodoDias)}
            onValueChange={(v) => setPeriodoDias(Number(v))}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Últimos 7d</SelectItem>
              <SelectItem value="30">Últimos 30d</SelectItem>
              <SelectItem value="90">Últimos 90d</SelectItem>
              <SelectItem value="365">Último ano</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </header>

      {/* KPIs */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <Kpi
          icon={<Users className="h-5 w-5" />}
          label="Candidaturas"
          value={isLoading ? "—" : String(kpis.total)}
        />
        <Kpi
          icon={<CheckCircle2 className="h-5 w-5" />}
          label="Taxa de aprovação"
          value={isLoading ? "—" : `${kpis.taxaAprov}%`}
          accent
        />
        <Kpi
          icon={<TrendingUp className="h-5 w-5" />}
          label="Score médio"
          value={isLoading ? "—" : kpis.scoreMedio ? `${kpis.scoreMedio}` : "—"}
        />
        <Kpi
          icon={<Briefcase className="h-5 w-5" />}
          label="Vagas ativas"
          value={isLoading ? "—" : String(kpis.vagasAtivas)}
        />
      </section>

      {/* Funil */}
      <section className="grid gap-6 lg:grid-cols-2 mb-8">
        <Card title="Funil por estágio" icon={<Activity className="h-4 w-4 text-gold" />}>
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : funil.length === 0 ? (
            <Empty text="Sem dados de funil para o período" />
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funil} layout="vertical" margin={{ left: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                  <YAxis dataKey="nome" type="category" stroke="hsl(var(--muted-foreground))" width={120} />
                  <RechartsTooltip
                    contentStyle={{
                      background: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      color: "hsl(var(--foreground))",
                    }}
                  />
                  <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                    {funil.map((d, i) => (
                      <Cell key={i} fill={d.cor} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card title="Tempo médio por estágio (dias)" icon={<Clock className="h-4 w-4 text-gold" />}>
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : tempoMedioEstagio.every((t) => t.diasMedio === 0) ? (
            <Empty text="Ainda sem transições suficientes" />
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={tempoMedioEstagio}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="nome" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <RechartsTooltip
                    contentStyle={{
                      background: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      color: "hsl(var(--foreground))",
                    }}
                  />
                  <Bar dataKey="diasMedio" radius={[6, 6, 0, 0]}>
                    {tempoMedioEstagio.map((d, i) => (
                      <Cell key={i} fill={d.cor} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </section>

      {/* Tendência */}
      <Card title="Candidaturas por dia" icon={<TrendingUp className="h-4 w-4 text-gold" />}>
        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={tendencia}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="data" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
                <YAxis stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                <RechartsTooltip
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    color: "hsl(var(--foreground))",
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="count"
                  name="Candidaturas"
                  stroke="hsl(var(--gold))"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>
    </AppShell>
  );
};

const Kpi = ({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: boolean;
}) => (
  <div
    className={`surface-card rounded-xl p-5 transition-all hover:border-gold/30 ${
      accent ? "ring-1 ring-gold/20 shadow-gold" : ""
    }`}
  >
    <div className="flex items-center justify-between mb-3">
      <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
      <span
        className={`flex h-8 w-8 items-center justify-center rounded-lg ${
          accent ? "bg-gradient-gold text-gold-foreground" : "bg-surface-elevated text-gold"
        }`}
      >
        {icon}
      </span>
    </div>
    <div className="font-display text-3xl font-semibold">{value}</div>
  </div>
);

const Card = ({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) => (
  <div className="surface-card rounded-xl p-6">
    <div className="flex items-center justify-between mb-4">
      <h2 className="font-display text-lg font-semibold">{title}</h2>
      {icon}
    </div>
    {children}
  </div>
);

const Empty = ({ text }: { text: string }) => (
  <div className="h-32 flex items-center justify-center text-sm text-muted-foreground">{text}</div>
);

export default Analytics;
