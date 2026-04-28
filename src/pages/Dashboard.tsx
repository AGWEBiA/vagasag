import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from "recharts";
import {
  Users,
  Sparkles,
  Briefcase,
  Calendar,
  ArrowRight,
  TrendingUp,
  Layers,
  UserPlus,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import {
  CARGO_LABEL,
  SENIORIDADE_LABEL,
  Senioridade,
  getInitials,
  senioridadeAvatarClasses,
  senioridadeBadgeClasses,
  confidenceColorClass,
} from "@/lib/seniority";
import { Skeleton } from "@/components/ui/skeleton";

interface AssessmentRow {
  id: string;
  senioridade_detectada: Senioridade;
  confidence_score: number;
  created_at: string;
  candidates: { id: string; nome: string; cargo: string; origem: string } | null;
}

type OrigemFilter = "all" | "time" | "candidato";

const Dashboard = () => {
  useEffect(() => {
    document.title = "Dashboard | Seniority Hub";
  }, []);

  const [origemFilter, setOrigemFilter] = useState<OrigemFilter>("all");

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-assessments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assessments")
        .select("id, senioridade_detectada, confidence_score, created_at, candidates(id, nome, cargo, origem)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as AssessmentRow[];
    },
  });

  const allList = data ?? [];

  const origemCounts = useMemo(
    () => ({
      all: allList.length,
      time: allList.filter((a) => a.candidates?.origem === "time").length,
      candidato: allList.filter((a) => a.candidates?.origem === "candidato").length,
    }),
    [allList],
  );

  const filteredList = useMemo(() => {
    if (origemFilter === "all") return allList;
    return allList.filter((a) => a.candidates?.origem === origemFilter);
  }, [allList, origemFilter]);

  const stats = useMemo(() => {
    const list = filteredList;
    const total = list.length;
    const avgConfidence =
      total > 0
        ? Math.round(list.reduce((s, a) => s + a.confidence_score, 0) / total)
        : 0;
    const cargos = new Set(list.map((a) => a.candidates?.cargo).filter(Boolean));
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const week = list.filter((a) => new Date(a.created_at).getTime() >= oneWeekAgo).length;

    const dist = { Junior: 0, Pleno: 0, Senior: 0 };
    list.forEach((a) => (dist[a.senioridade_detectada] += 1));

    const cargoCount: Record<string, number> = {};
    list.forEach((a) => {
      const c = a.candidates?.cargo;
      if (c) cargoCount[c] = (cargoCount[c] ?? 0) + 1;
    });
    const topCargos = Object.entries(cargoCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);
    const maxCargo = topCargos[0]?.[1] ?? 1;

    return { total, avgConfidence, cargos: cargos.size, week, dist, topCargos, maxCargo };
  }, [filteredList]);

  const distData = [
    { name: "Júnior", value: stats.dist.Junior, color: "hsl(var(--junior))" },
    { name: "Pleno", value: stats.dist.Pleno, color: "hsl(var(--gold))" },
    { name: "Sênior", value: stats.dist.Senior, color: "hsl(var(--senior))" },
  ];

  const recent = filteredList.slice(0, 5);

  const filterLabel =
    origemFilter === "time"
      ? "Avaliações do time"
      : origemFilter === "candidato"
        ? "Avaliações de candidatos"
        : "Visão geral das avaliações de senioridade.";

  return (
    <AppShell>
      <header className="mb-6 animate-fade-in">
        <h1 className="font-display text-4xl font-semibold">
          Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">
          {filterLabel}
        </p>
      </header>

      <Tabs value={origemFilter} onValueChange={(v) => setOrigemFilter(v as OrigemFilter)} className="mb-6">
        <TabsList className="bg-surface-elevated border border-sidebar-border h-auto p-1">
          <TabsTrigger value="all" className="data-[state=active]:bg-gradient-gold data-[state=active]:text-gold-foreground gap-2 px-4 py-2">
            <Layers className="h-4 w-4" />
            Todos
            <span className="ml-1 text-[10px] font-mono opacity-70">({origemCounts.all})</span>
          </TabsTrigger>
          <TabsTrigger value="time" className="data-[state=active]:bg-gradient-gold data-[state=active]:text-gold-foreground gap-2 px-4 py-2">
            <Users className="h-4 w-4" />
            Time
            <span className="ml-1 text-[10px] font-mono opacity-70">({origemCounts.time})</span>
          </TabsTrigger>
          <TabsTrigger value="candidato" className="data-[state=active]:bg-gradient-gold data-[state=active]:text-gold-foreground gap-2 px-4 py-2">
            <UserPlus className="h-4 w-4" />
            Candidatos
            <span className="ml-1 text-[10px] font-mono opacity-70">({origemCounts.candidato})</span>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <MetricCard
          icon={<Users className="h-5 w-5" />}
          label="Total de Avaliações"
          value={isLoading ? "—" : String(stats.total)}
        />
        <MetricCard
          icon={<Sparkles className="h-5 w-5" />}
          label="Confiança Média"
          value={isLoading ? "—" : `${stats.avgConfidence}%`}
        />
        <MetricCard
          icon={<Briefcase className="h-5 w-5" />}
          label="Cargos Avaliados"
          value={isLoading ? "—" : String(stats.cargos)}
        />
        <MetricCard
          icon={<Calendar className="h-5 w-5" />}
          label="Esta Semana"
          value={isLoading ? "—" : String(stats.week)}
          accent
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-2 mb-8">
        <div className="surface-card rounded-xl p-4 sm:p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-xl font-semibold">
              Distribuição por Senioridade
            </h2>
            <TrendingUp className="h-4 w-4 text-gold" />
          </div>
          {stats.total === 0 ? (
            <EmptyMini text="Sem avaliações ainda" />
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={distData}>
                  <XAxis
                    dataKey="name"
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <RechartsTooltip
                    cursor={{ fill: "hsl(var(--surface-elevated))" }}
                    contentStyle={{
                      background: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      color: "hsl(var(--foreground))",
                    }}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {distData.map((d, i) => (
                      <Cell key={i} fill={d.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="surface-card rounded-xl p-4 sm:p-6">
          <h2 className="font-display text-xl font-semibold mb-6">
            Top Cargos Avaliados
          </h2>
          {stats.topCargos.length === 0 ? (
            <EmptyMini text="Sem cargos avaliados" />
          ) : (
            <ul className="space-y-4">
              {stats.topCargos.map(([cargo, count]) => (
                <li key={cargo}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="font-medium">{CARGO_LABEL[cargo] ?? cargo}</span>
                    <span className="text-muted-foreground">{count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full bg-gradient-gold rounded-full transition-all"
                      style={{ width: `${(count / stats.maxCargo) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="surface-card rounded-xl p-4 sm:p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-xl font-semibold">
            Avaliações Recentes
          </h2>
          <Link
            to="/historico"
            className="text-sm text-gold hover:text-gold-bright inline-flex items-center gap-1"
          >
            Ver todas <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : recent.length === 0 ? (
          <EmptyMini text="Nenhuma avaliação realizada ainda" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-border">
                  <th className="pb-3 font-medium">Candidato</th>
                  <th className="pb-3 font-medium">Cargo</th>
                  <th className="pb-3 font-medium">Senioridade</th>
                  <th className="pb-3 font-medium">Confiança</th>
                  <th className="pb-3 font-medium">Data</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((a) => (
                  <tr
                    key={a.id}
                    className="border-b border-border last:border-0 hover:bg-surface-elevated/50 transition-colors"
                  >
                    <td className="py-3">
                      <Link
                        to={`/relatorio/${a.id}`}
                        className="flex items-center gap-3 hover:text-gold"
                      >
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${senioridadeAvatarClasses(a.senioridade_detectada)}`}
                        >
                          {getInitials(a.candidates?.nome ?? "?")}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-medium leading-tight">{a.candidates?.nome}</span>
                          <span
                            className={`mt-0.5 inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                              a.candidates?.origem === "time"
                                ? "bg-gold/10 text-gold border-gold/30"
                                : "bg-surface-elevated text-muted-foreground border-sidebar-border"
                            }`}
                          >
                            {a.candidates?.origem === "time" ? (
                              <><Users className="h-2.5 w-2.5" /> Time</>
                            ) : (
                              <><UserPlus className="h-2.5 w-2.5" /> Candidato</>
                            )}
                          </span>
                        </div>
                      </Link>
                    </td>
                    <td className="py-3 text-muted-foreground">
                      {CARGO_LABEL[a.candidates?.cargo ?? ""] ?? "—"}
                    </td>
                    <td className="py-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${senioridadeBadgeClasses(a.senioridade_detectada)}`}
                      >
                        {SENIORIDADE_LABEL[a.senioridade_detectada]}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-20 rounded-full bg-secondary overflow-hidden">
                          <div
                            className={`h-full ${confidenceColorClass(a.confidence_score)}`}
                            style={{ width: `${a.confidence_score}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {a.confidence_score}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3 text-muted-foreground">
                      {new Date(a.created_at).toLocaleDateString("pt-BR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AppShell>
  );
};

const MetricCard = ({
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
    className={`surface-card rounded-xl p-5 transition-all hover:border-gold/30 ${accent ? "ring-1 ring-gold/20 shadow-gold" : ""}`}
  >
    <div className="flex items-center justify-between mb-3">
      <span className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span
        className={`flex h-8 w-8 items-center justify-center rounded-lg ${accent ? "bg-gradient-gold text-gold-foreground" : "bg-surface-elevated text-gold"}`}
      >
        {icon}
      </span>
    </div>
    <div className="font-display text-3xl font-semibold">{value}</div>
  </div>
);

const EmptyMini = ({ text }: { text: string }) => (
  <div className="h-32 flex items-center justify-center text-sm text-muted-foreground">
    {text}
  </div>
);

export default Dashboard;
