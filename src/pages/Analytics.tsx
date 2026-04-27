import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
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
  ArrowRight,
  X,
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

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
  nome: string;
  email: string;
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
  const [drillEstagio, setDrillEstagio] = useState<{ id: string; nome: string } | null>(
    null,
  );

  // 1) Vagas (cache longo, raramente muda)
  const { data: vagas = [] } = useQuery({
    queryKey: ["analytics-vagas"],
    queryFn: async () => {
      const { data } = await supabase.from("vagas").select("id, titulo, status");
      return (data ?? []) as VagaRow[];
    },
    staleTime: 5 * 60 * 1000,
  });

  // 2) Estágios (cache longo)
  const { data: estagios = [] } = useQuery({
    queryKey: ["analytics-estagios"],
    queryFn: async () => {
      const { data } = await supabase
        .from("pipeline_estagios")
        .select("id, nome, ordem, cor, tipo")
        .order("ordem");
      return (data ?? []) as EstagioRow[];
    },
    staleTime: 5 * 60 * 1000,
  });

  // 3) Dataset principal — varia com período + vaga (filtrado no servidor)
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["analytics-data", periodoDias, vagaFiltro],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const desde = new Date(Date.now() - periodoDias * 24 * 60 * 60 * 1000).toISOString();

      // Candidaturas (filtro server-side)
      let candQ = supabase
        .from("candidaturas")
        .select("id, vaga_id, estagio_id, estagio_atualizado_em, created_at, candidate_id, nome, email")
        .gte("created_at", desde);
      if (vagaFiltro !== "all") candQ = candQ.eq("vaga_id", vagaFiltro);
      const { data: candidaturas } = await candQ;
      const candList = (candidaturas ?? []) as CandidaturaRow[];

      const candIds = candList.map((c) => c.id);
      const candidateIds = candList.map((c) => c.candidate_id).filter(Boolean) as string[];

      // Eventos (filtrados pelo conjunto de candidaturas — feito server-side via .in())
      let eventos: EventoRow[] = [];
      if (candIds.length > 0) {
        const { data: ev } = await supabase
          .from("candidatura_eventos")
          .select("candidatura_id, tipo, created_at, dados")
          .eq("tipo", "mudou_estagio")
          .in("candidatura_id", candIds);
        eventos = (ev ?? []) as EventoRow[];
      }

      // Assessments só dos candidatos relevantes
      let assessments: AssessmentRow[] = [];
      if (candidateIds.length > 0) {
        const { data: a } = await supabase
          .from("assessments")
          .select("id, nota_ponderada, confidence_score, created_at, candidate_id")
          .in("candidate_id", candidateIds)
          .gte("created_at", desde);
        assessments = (a ?? []) as AssessmentRow[];
      }

      return { candidaturas: candList, eventos, assessments };
    },
  });

  const candidaturas = data?.candidaturas ?? [];
  const eventos = data?.eventos ?? [];
  const assessments = data?.assessments ?? [];

  // Funil: nº de candidaturas por estágio
  const funil = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of candidaturas) {
      if (!c.estagio_id) continue;
      map.set(c.estagio_id, (map.get(c.estagio_id) ?? 0) + 1);
    }
    return estagios
      .filter((e) => e.tipo !== "final_reprovado")
      .map((e) => ({
        id: e.id,
        nome: e.nome,
        count: map.get(e.id) ?? 0,
        cor: e.cor,
        tipo: e.tipo,
      }));
  }, [estagios, candidaturas]);

  // Tempo médio por estágio (em dias)
  const tempoMedioEstagio = useMemo(() => {
    const porCand = new Map<string, EventoRow[]>();
    for (const ev of eventos) {
      const arr = porCand.get(ev.candidatura_id) ?? [];
      arr.push(ev);
      porCand.set(ev.candidatura_id, arr);
    }
    const tempos: Record<string, { soma: number; count: number }> = {};
    const candByid = new Map(candidaturas.map((c) => [c.id, c]));
    for (const [candId, evs] of porCand) {
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
          : new Date(candByid.get(candId)?.created_at ?? ev.created_at).getTime();
        const fim = new Date(ev.created_at).getTime();
        const dias = Math.max(0, (fim - inicio) / (1000 * 60 * 60 * 24));
        if (!tempos[estId]) tempos[estId] = { soma: 0, count: 0 };
        tempos[estId].soma += dias;
        tempos[estId].count += 1;
      }
    }
    return estagios.map((e) => ({
      nome: e.nome,
      diasMedio: tempos[e.id] ? Number((tempos[e.id].soma / tempos[e.id].count).toFixed(1)) : 0,
      cor: e.cor,
    }));
  }, [estagios, candidaturas, eventos]);

  // KPIs
  const kpis = useMemo(() => {
    const finais = new Set(estagios.filter((e) => e.tipo === "final_aprovado").map((e) => e.id));
    const reps = new Set(estagios.filter((e) => e.tipo === "final_reprovado").map((e) => e.id));
    const total = candidaturas.length;
    const aprovados = candidaturas.filter((c) => c.estagio_id && finais.has(c.estagio_id)).length;
    const reprovados = candidaturas.filter((c) => c.estagio_id && reps.has(c.estagio_id)).length;
    const decididos = aprovados + reprovados;
    const taxaAprov = decididos > 0 ? Math.round((aprovados / decididos) * 100) : 0;

    const aFiltrados = assessments.filter((a) => a.nota_ponderada != null);
    const scoreMedio =
      aFiltrados.length > 0
        ? Number(
            (aFiltrados.reduce((s, a) => s + (a.nota_ponderada ?? 0), 0) / aFiltrados.length).toFixed(1),
          )
        : 0;

    const vagasAtivas =
      vagaFiltro === "all"
        ? vagas.filter((v) => v.status === "aberta").length
        : vagas.filter((v) => v.id === vagaFiltro && v.status === "aberta").length;

    return { total, aprovados, reprovados, taxaAprov, scoreMedio, vagasAtivas };
  }, [estagios, candidaturas, assessments, vagas, vagaFiltro]);

  // Tendência
  const tendencia = useMemo(() => {
    const buckets: Record<string, number> = {};
    for (let i = periodoDias - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const k = d.toISOString().slice(0, 10);
      buckets[k] = 0;
    }
    for (const c of candidaturas) {
      const k = c.created_at.slice(0, 10);
      if (k in buckets) buckets[k] += 1;
    }
    return Object.entries(buckets).map(([data, count]) => ({
      data: data.slice(5).split("-").reverse().join("/"),
      count,
    }));
  }, [candidaturas, periodoDias]);

  // Drill-down: candidaturas do estágio selecionado
  const drillList = useMemo(() => {
    if (!drillEstagio) return [];
    const vagaMap = new Map(vagas.map((v) => [v.id, v.titulo]));
    return candidaturas
      .filter((c) => c.estagio_id === drillEstagio.id)
      .map((c) => ({
        id: c.id,
        nome: c.nome,
        email: c.email,
        vaga_id: c.vaga_id,
        vaga_titulo: vagaMap.get(c.vaga_id) ?? "—",
        atualizado: c.estagio_atualizado_em,
      }))
      .sort((a, b) => new Date(b.atualizado).getTime() - new Date(a.atualizado).getTime());
  }, [drillEstagio, candidaturas, vagas]);

  return (
    <AppShell>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3 animate-fade-in">
        <div>
          <h1 className="font-display text-4xl font-semibold">Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Funil, tempos e performance do recrutamento.
            {isFetching && !isLoading && (
              <span className="ml-2 text-xs text-gold animate-pulse">atualizando…</span>
            )}
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
              {vagas.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.titulo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(periodoDias)} onValueChange={(v) => setPeriodoDias(Number(v))}>
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
        <Kpi icon={<Users className="h-5 w-5" />} label="Candidaturas" value={isLoading ? "—" : String(kpis.total)} />
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
          label={vagaFiltro === "all" ? "Vagas ativas" : "Vaga ativa"}
          value={isLoading ? "—" : String(kpis.vagasAtivas)}
        />
      </section>

      {/* Funil + Tempo médio */}
      <section className="grid gap-6 lg:grid-cols-2 mb-8">
        <Card title="Funil por estágio" icon={<Activity className="h-4 w-4 text-gold" />}>
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : funil.length === 0 || funil.every((f) => f.count === 0) ? (
            <Empty text="Sem dados de funil para o período" />
          ) : (
            <>
              <p className="text-xs text-muted-foreground mb-2">
                Clique em uma barra para ver as candidaturas.
              </p>
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
                    <Bar
                      dataKey="count"
                      radius={[0, 6, 6, 0]}
                      cursor="pointer"
                      onClick={(d: { id: string; nome: string }) =>
                        setDrillEstagio({ id: d.id, nome: d.nome })
                      }
                    >
                      {funil.map((d, i) => (
                        <Cell key={i} fill={d.cor} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
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

      {/* Drill-down modal */}
      <Dialog open={!!drillEstagio} onOpenChange={(open) => !open && setDrillEstagio(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>
                Estágio: <span className="text-gold">{drillEstagio?.nome}</span>
              </span>
              <span className="text-sm font-normal text-muted-foreground">
                {drillList.length} candidatura(s)
              </span>
            </DialogTitle>
          </DialogHeader>
          {drillList.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              Nenhuma candidatura neste estágio.
            </p>
          ) : (
            <div className="max-h-[60vh] overflow-y-auto -mx-6 px-6">
              <ul className="divide-y divide-border">
                {drillList.map((c) => (
                  <li key={c.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{c.nome}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {c.email} · <span className="text-foreground/70">{c.vaga_titulo}</span>
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Atualizado em {new Date(c.atualizado).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    <Button asChild variant="ghost" size="sm" className="shrink-0">
                      <Link to={`/admin/candidaturas/${c.vaga_id}`}>
                        Abrir <ArrowRight className="h-3.5 w-3.5 ml-1" />
                      </Link>
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </DialogContent>
      </Dialog>
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
