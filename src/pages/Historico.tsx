import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search, Sparkles, History as HistoryIcon, Users, UserPlus, Layers } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import {
  CARGOS,
  CARGO_LABEL,
  SENIORIDADE_LABEL,
  Senioridade,
  getInitials,
  senioridadeAvatarClasses,
  senioridadeBadgeClasses,
  confidenceColorClass,
} from "@/lib/seniority";

interface Row {
  id: string;
  senioridade_detectada: Senioridade;
  confidence_score: number;
  created_at: string;
  candidates: { id: string; nome: string; cargo: string; origem: string } | null;
}

const Historico = () => {
  const [search, setSearch] = useState("");
  const [cargoFilter, setCargoFilter] = useState("all");
  const [seniorityFilter, setSeniorityFilter] = useState("all");
  const [origemFilter, setOrigemFilter] = useState("all");

  useEffect(() => {
    document.title = "Histórico | Seniority Hub";
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ["historico-assessments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assessments")
        .select("id, senioridade_detectada, confidence_score, created_at, candidates(id, nome, cargo, origem)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as Row[];
    },
  });

  const filtered = useMemo(() => {
    return (data ?? []).filter((r) => {
      if (search && !r.candidates?.nome.toLowerCase().includes(search.toLowerCase())) return false;
      if (cargoFilter !== "all" && r.candidates?.cargo !== cargoFilter) return false;
      if (seniorityFilter !== "all" && r.senioridade_detectada !== seniorityFilter) return false;
      if (origemFilter !== "all" && r.candidates?.origem !== origemFilter) return false;
      return true;
    });
  }, [data, search, cargoFilter, seniorityFilter, origemFilter]);

  const counts = useMemo(() => {
    const all = data ?? [];
    return {
      all: all.length,
      time: all.filter((r) => r.candidates?.origem === "time").length,
      candidato: all.filter((r) => r.candidates?.origem === "candidato").length,
    };
  }, [data]);

  return (
    <AppShell>
      <header className="mb-8 animate-fade-in">
        <h1 className="font-display text-4xl font-semibold">Histórico</h1>
        <p className="text-muted-foreground mt-1">
          Todas as avaliações realizadas pela equipe.
        </p>
      </header>

      <Tabs value={origemFilter} onValueChange={setOrigemFilter} className="mb-4">
        <TabsList className="bg-surface-elevated border border-sidebar-border h-auto p-1">
          <TabsTrigger value="all" className="data-[state=active]:bg-gradient-gold data-[state=active]:text-gold-foreground gap-2 px-4 py-2">
            <Layers className="h-4 w-4" />
            Todos
            <span className="ml-1 text-[10px] font-mono opacity-70">({counts.all})</span>
          </TabsTrigger>
          <TabsTrigger value="time" className="data-[state=active]:bg-gradient-gold data-[state=active]:text-gold-foreground gap-2 px-4 py-2">
            <Users className="h-4 w-4" />
            Time
            <span className="ml-1 text-[10px] font-mono opacity-70">({counts.time})</span>
          </TabsTrigger>
          <TabsTrigger value="candidato" className="data-[state=active]:bg-gradient-gold data-[state=active]:text-gold-foreground gap-2 px-4 py-2">
            <UserPlus className="h-4 w-4" />
            Candidatos
            <span className="ml-1 text-[10px] font-mono opacity-70">({counts.candidato})</span>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="surface-card rounded-xl p-4 mb-6 grid gap-3 md:grid-cols-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={cargoFilter} onValueChange={setCargoFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Todos os cargos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os cargos</SelectItem>
            {CARGOS.map((c) => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={seniorityFilter} onValueChange={setSeniorityFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Todas senioridades" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas senioridades</SelectItem>
            <SelectItem value="Junior">Júnior</SelectItem>
            <SelectItem value="Pleno">Pleno</SelectItem>
            <SelectItem value="Senior">Sênior</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="surface-card rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 flex flex-col items-center text-center">
            <div className="h-16 w-16 rounded-full bg-surface-elevated flex items-center justify-center mb-4">
              <HistoryIcon className="h-7 w-7 text-muted-foreground" />
            </div>
            <h3 className="font-display text-xl mb-2">
              {(data?.length ?? 0) === 0
                ? "Nenhuma avaliação realizada ainda"
                : "Nenhuma avaliação encontrada"}
            </h3>
            <p className="text-muted-foreground text-sm mb-6">
              {(data?.length ?? 0) === 0
                ? "Comece a usar a IA para classificar candidatos."
                : "Ajuste os filtros para encontrar o que procura."}
            </p>
            {(data?.length ?? 0) === 0 && (
              <Link to="/nova-avaliacao">
                <Button className="bg-gradient-gold text-gold-foreground hover:opacity-90">
                  <Sparkles className="h-4 w-4 mr-2" /> Criar primeira avaliação
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-border">
                  <th className="px-6 py-3 font-medium">Candidato</th>
                  <th className="px-6 py-3 font-medium">Cargo</th>
                  <th className="px-6 py-3 font-medium">Senioridade</th>
                  <th className="px-6 py-3 font-medium">Confiança</th>
                  <th className="px-6 py-3 font-medium">Data</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => (
                  <tr
                    key={a.id}
                    className="border-b border-border last:border-0 hover:bg-surface-elevated/50 transition-colors cursor-pointer"
                    onClick={() => (window.location.href = `/relatorio/${a.id}`)}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold ${senioridadeAvatarClasses(a.senioridade_detectada)}`}
                        >
                          {getInitials(a.candidates?.nome ?? "?")}
                        </div>
                        <span className="font-medium">{a.candidates?.nome}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {CARGO_LABEL[a.candidates?.cargo ?? ""] ?? "—"}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${senioridadeBadgeClasses(a.senioridade_detectada)}`}
                      >
                        {SENIORIDADE_LABEL[a.senioridade_detectada]}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-24 rounded-full bg-secondary overflow-hidden">
                          <div
                            className={`h-full ${confidenceColorClass(a.confidence_score)}`}
                            style={{ width: `${a.confidence_score}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">{a.confidence_score}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {new Date(a.created_at).toLocaleDateString("pt-BR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
};

export default Historico;
