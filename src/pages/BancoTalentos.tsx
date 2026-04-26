import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
  Loader2,
  Search,
  Users2,
  Filter,
  X,
  Mail,
  Phone,
  Linkedin,
  Globe,
  Pencil,
  Tag as TagIcon,
  Sparkles,
  Briefcase,
  CalendarDays,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Vaga {
  id: string;
  titulo: string;
  cargo: string;
}

interface Talento {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  linkedin: string | null;
  portfolio: string | null;
  dados_profissionais: string;
  informacoes_adicionais: string | null;
  status: string;
  talent_status: string;
  tags: string[];
  skills: string[];
  notes: string | null;
  vaga_id: string;
  candidate_id: string | null;
  created_at: string;
}

interface AssessmentInfo {
  candidate_id: string;
  nota_ponderada: number;
  senioridade_detectada: string;
}

const STATUS_OPTIONS = [
  { value: "candidato", label: "Candidato" },
  { value: "em_processo", label: "Em processo" },
  { value: "contratado", label: "Contratado" },
  { value: "colaborador", label: "Colaborador" },
  { value: "descartado", label: "Descartado" },
];

const STATUS_BADGE: Record<string, string> = {
  candidato: "bg-muted text-muted-foreground",
  em_processo: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  contratado: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  colaborador: "bg-gradient-gold text-gold-foreground border-transparent",
  descartado: "bg-destructive/15 text-destructive border-destructive/30",
};

const SENIORIDADES = ["junior", "pleno", "senior", "especialista"];

const BancoTalentos = () => {
  const { hasPanelAccess, loading: roleLoading } = useUserRole();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Talento[]>([]);
  const [vagas, setVagas] = useState<Vaga[]>([]);
  const [assessmentsByEmail, setAssessmentsByEmail] = useState<
    Record<string, AssessmentInfo>
  >({});

  // Filtros
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [vagaFilter, setVagaFilter] = useState<string>("todos");
  const [senioridadeFilter, setSenioridadeFilter] = useState<string>("todos");
  const [tagFilter, setTagFilter] = useState<string>("");
  const [periodoFilter, setPeriodoFilter] = useState<string>("todos");
  const [showFilters, setShowFilters] = useState(false);

  // Edição
  const [editing, setEditing] = useState<Talento | null>(null);
  const [editForm, setEditForm] = useState({
    talent_status: "candidato",
    tags: "",
    skills: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    document.title = "Banco de Talentos | Seniority Hub";
    if (hasPanelAccess) void load();
  }, [hasPanelAccess]);

  const load = async () => {
    setLoading(true);
    const [{ data: c, error: cErr }, { data: v }, { data: a }] =
      await Promise.all([
        supabase
          .from("candidaturas")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase.from("vagas").select("id,titulo,cargo"),
        supabase
          .from("assessments")
          .select(
            "candidate_id,nota_ponderada,senioridade_detectada,candidates!inner(email:nome)",
          ),
      ]);

    if (cErr) {
      toast.error("Erro ao carregar talentos");
      setLoading(false);
      return;
    }
    setItems((c ?? []) as Talento[]);
    setVagas((v ?? []) as Vaga[]);

    // Map assessments by candidatura.email via candidate_id join
    if (c) {
      const candidateIds = (c as Talento[])
        .map((t) => t.candidate_id)
        .filter(Boolean) as string[];
      if (candidateIds.length > 0) {
        const { data: ass } = await supabase
          .from("assessments")
          .select("candidate_id,nota_ponderada,senioridade_detectada")
          .in("candidate_id", candidateIds);
        const map: Record<string, AssessmentInfo> = {};
        (ass ?? []).forEach((row: any) => {
          map[row.candidate_id] = row as AssessmentInfo;
        });
        setAssessmentsByEmail(map);
      }
    }
    setLoading(false);
  };

  const allTags = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => i.tags?.forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [items]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const tag = tagFilter.trim().toLowerCase();
    const now = Date.now();
    const periodoMs: Record<string, number> = {
      "7d": 7 * 86400_000,
      "30d": 30 * 86400_000,
      "90d": 90 * 86400_000,
    };
    return items.filter((t) => {
      if (term) {
        const blob = `${t.nome} ${t.email} ${t.dados_profissionais} ${(t.skills ?? []).join(" ")}`.toLowerCase();
        if (!blob.includes(term)) return false;
      }
      if (statusFilter !== "todos" && t.talent_status !== statusFilter) return false;
      if (vagaFilter !== "todos" && t.vaga_id !== vagaFilter) return false;
      if (tag) {
        const has = (t.tags ?? []).some((x) => x.toLowerCase().includes(tag));
        if (!has) return false;
      }
      if (senioridadeFilter !== "todos") {
        const a = t.candidate_id ? assessmentsByEmail[t.candidate_id] : undefined;
        if (!a || a.senioridade_detectada !== senioridadeFilter) return false;
      }
      if (periodoFilter !== "todos") {
        const limit = periodoMs[periodoFilter];
        if (limit && now - new Date(t.created_at).getTime() > limit) return false;
      }
      return true;
    });
  }, [
    items,
    search,
    statusFilter,
    vagaFilter,
    tagFilter,
    senioridadeFilter,
    periodoFilter,
    assessmentsByEmail,
  ]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { total: items.length };
    STATUS_OPTIONS.forEach((s) => (c[s.value] = 0));
    items.forEach((t) => {
      c[t.talent_status] = (c[t.talent_status] ?? 0) + 1;
    });
    return c;
  }, [items]);

  const openEdit = (t: Talento) => {
    setEditing(t);
    setEditForm({
      talent_status: t.talent_status,
      tags: (t.tags ?? []).join(", "),
      skills: (t.skills ?? []).join(", "),
      notes: t.notes ?? "",
    });
  };

  const saveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    const tagsArr = editForm.tags
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const skillsArr = editForm.skills
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const { error } = await supabase
      .from("candidaturas")
      .update({
        talent_status: editForm.talent_status,
        tags: tagsArr,
        skills: skillsArr,
        notes: editForm.notes || null,
      })
      .eq("id", editing.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Talento atualizado!");
    setEditing(null);
    void load();
  };

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("todos");
    setVagaFilter("todos");
    setSenioridadeFilter("todos");
    setTagFilter("");
    setPeriodoFilter("todos");
  };

  if (roleLoading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-6 w-6 animate-spin text-gold" />
        </div>
      </AppShell>
    );
  }

  if (!hasPanelAccess) {
    return <Navigate to="/" replace />;
  }

  return (
    <AppShell>
      <header className="mb-6 animate-fade-in">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight">
              Banco de <span className="text-gradient-gold">Talentos</span>
            </h1>
            <p className="text-muted-foreground mt-1">
              Todos os candidatos das suas vagas em um só lugar — busca, tags e classificação.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-gold/30 text-gold">
              {counts.total} talentos
            </Badge>
          </div>
        </div>

        {/* Stats chips */}
        <div className="mt-4 flex flex-wrap gap-2">
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s.value}
              onClick={() => setStatusFilter(statusFilter === s.value ? "todos" : s.value)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                statusFilter === s.value
                  ? "border-gold bg-gold/10 text-gold"
                  : "border-border text-muted-foreground hover:border-gold/40",
              )}
            >
              {s.label} · {counts[s.value] ?? 0}
            </button>
          ))}
        </div>
      </header>

      {/* Search + filters */}
      <div className="mb-6 space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome, e-mail, habilidade ou conteúdo do currículo…"
              className="pl-9"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => setShowFilters((v) => !v)}
            className={cn(showFilters && "border-gold/40 text-gold")}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filtros
          </Button>
          {(statusFilter !== "todos" ||
            vagaFilter !== "todos" ||
            senioridadeFilter !== "todos" ||
            tagFilter ||
            periodoFilter !== "todos" ||
            search) && (
            <Button variant="ghost" onClick={clearFilters}>
              <X className="h-4 w-4 mr-1" /> Limpar
            </Button>
          )}
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 rounded-lg border border-border bg-card/50 p-4 animate-fade-in">
            <div>
              <Label className="text-xs">Vaga de origem</Label>
              <Select value={vagaFilter} onValueChange={setVagaFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas</SelectItem>
                  {vagas.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.titulo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Senioridade (IA)</Label>
              <Select value={senioridadeFilter} onValueChange={setSenioridadeFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas</SelectItem>
                  {SENIORIDADES.map((s) => (
                    <SelectItem key={s} value={s} className="capitalize">
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Tag</Label>
              <Input
                value={tagFilter}
                onChange={(e) => setTagFilter(e.target.value)}
                placeholder={allTags.length ? `ex: ${allTags[0]}` : "ex: react"}
                list="all-tags"
              />
              <datalist id="all-tags">
                {allTags.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
            </div>
            <div>
              <Label className="text-xs">Período</Label>
              <Select value={periodoFilter} onValueChange={setPeriodoFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Qualquer data</SelectItem>
                  <SelectItem value="7d">Últimos 7 dias</SelectItem>
                  <SelectItem value="30d">Últimos 30 dias</SelectItem>
                  <SelectItem value="90d">Últimos 90 dias</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-gold" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-border rounded-lg">
          <Users2 className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-muted-foreground">
            {items.length === 0
              ? "Ainda não há candidaturas no banco de talentos."
              : "Nenhum talento encontrado com esses filtros."}
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((t) => {
            const vaga = vagas.find((v) => v.id === t.vaga_id);
            const ass = t.candidate_id ? assessmentsByEmail[t.candidate_id] : undefined;
            return (
              <article
                key={t.id}
                className="rounded-lg border border-border bg-card p-4 hover:border-gold/30 transition-colors animate-fade-in"
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-display text-lg font-semibold truncate">
                        {t.nome}
                      </h3>
                      <Badge
                        className={cn("border", STATUS_BADGE[t.talent_status])}
                        variant="outline"
                      >
                        {STATUS_OPTIONS.find((s) => s.value === t.talent_status)?.label ??
                          t.talent_status}
                      </Badge>
                      {ass && (
                        <Badge
                          variant="outline"
                          className="border-gold/30 text-gold capitalize"
                        >
                          <Sparkles className="h-3 w-3 mr-1" />
                          {ass.senioridade_detectada} · {Number(ass.nota_ponderada).toFixed(1)}
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" /> {t.email}
                      </span>
                      {t.telefone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" /> {t.telefone}
                        </span>
                      )}
                      {t.linkedin && (
                        <a
                          href={t.linkedin}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 hover:text-gold"
                        >
                          <Linkedin className="h-3 w-3" /> LinkedIn
                        </a>
                      )}
                      {t.portfolio && (
                        <a
                          href={t.portfolio}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 hover:text-gold"
                        >
                          <Globe className="h-3 w-3" /> Portfólio
                        </a>
                      )}
                      {vaga && (
                        <span className="flex items-center gap-1">
                          <Briefcase className="h-3 w-3" /> {vaga.titulo}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <CalendarDays className="h-3 w-3" />
                        {new Date(t.created_at).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                    {(t.tags?.length || t.skills?.length) ? (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {t.tags?.map((tag) => (
                          <Badge
                            key={`tag-${tag}`}
                            variant="outline"
                            className="text-[10px] border-gold/30 text-gold"
                          >
                            <TagIcon className="h-2.5 w-2.5 mr-1" />
                            {tag}
                          </Badge>
                        ))}
                        {t.skills?.map((s) => (
                          <Badge
                            key={`skill-${s}`}
                            variant="secondary"
                            className="text-[10px]"
                          >
                            {s}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                    {t.notes && (
                      <p className="mt-2 text-xs text-muted-foreground italic line-clamp-2">
                        “{t.notes}”
                      </p>
                    )}
                  </div>
                  <Button size="sm" variant="outline" onClick={() => openEdit(t)}>
                    <Pencil className="h-3.5 w-3.5 mr-1" /> Gerir
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Gerir talento</DialogTitle>
            <DialogDescription>
              {editing?.nome} · {editing?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Status no banco</Label>
              <Select
                value={editForm.talent_status}
                onValueChange={(v) => setEditForm((f) => ({ ...f, talent_status: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tags (separadas por vírgula)</Label>
              <Input
                value={editForm.tags}
                onChange={(e) => setEditForm((f) => ({ ...f, tags: e.target.value }))}
                placeholder="ex: top10, react, sênior"
              />
            </div>
            <div>
              <Label>Habilidades (separadas por vírgula)</Label>
              <Input
                value={editForm.skills}
                onChange={(e) => setEditForm((f) => ({ ...f, skills: e.target.value }))}
                placeholder="ex: React, Node.js, AWS"
              />
            </div>
            <div>
              <Label>Anotações internas</Label>
              <Textarea
                value={editForm.notes}
                onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
                rows={4}
                placeholder="Observações sobre este talento…"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={saveEdit} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
};

export default BancoTalentos;
