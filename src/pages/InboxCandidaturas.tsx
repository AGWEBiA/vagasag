import { useEffect, useState } from "react";
import { Link, useParams, useNavigate, useSearchParams } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Inbox,
  Layers,
  Loader2,
  Mail,
  Phone,
  Linkedin,
  Globe,
  Sparkles,
  CheckCircle2,
  ExternalLink,
  Trash2,
  AlertCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { CARGO_LABEL } from "@/lib/seniority";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { RespostasCandidato } from "@/components/RespostasCandidato";
import { CandidaturaTimeline } from "@/components/CandidaturaTimeline";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { PipelineEstagio } from "@/lib/pipeline";
import { dispararAutoScoreSeNecessario, enviarEmailEstagio } from "@/lib/emails";
import { NotasInternas } from "@/components/NotasInternas";
import { AtribuicaoRecrutador } from "@/components/AtribuicaoRecrutador";
import { EntrevistasCandidatura } from "@/components/EntrevistasCandidatura";

interface Vaga {
  id: string;
  titulo: string;
  cargo: string;
}
interface Candidatura {
  id: string;
  vaga_id: string;
  nome: string;
  email: string;
  telefone: string | null;
  linkedin: string | null;
  portfolio: string | null;
  dados_profissionais: string;
  informacoes_adicionais: string | null;
  status: string;
  candidate_id: string | null;
  created_at: string;
  estagio_id: string | null;
  visualizada: boolean;
  vagas?: { titulo: string; cargo: string };
}

const InboxCandidaturas = () => {
  const { vagaId } = useParams<{ vagaId: string }>();
  const navigate = useNavigate();
  const { isAdminMaster } = useUserRole();
  const [searchParams] = useSearchParams();
  const candParam = searchParams.get("cand");
  const [vaga, setVaga] = useState<Vaga | null>(null);
  const [items, setItems] = useState<Candidatura[]>([]);
  const [estagios, setEstagios] = useState<PipelineEstagio[]>([]);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState<string | null>(null);
  const [selected, setSelected] = useState<Candidatura | null>(null);

  useEffect(() => {
    if (selected && !selected.visualizada) {
      void markAsViewed(selected.id);
    }
  }, [selected?.id]);

  const markAsViewed = async (id: string) => {
    const { error } = await supabase
      .from("candidaturas")
      .update({ visualizada: true })
      .eq("id", id);
    if (!error) {
      setItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, visualizada: true } : item,
        ),
      );
      if (selected?.id === id) {
        setSelected((prev) => (prev ? { ...prev, visualizada: true } : null));
      }
    }
  };

  const handleDelete = async () => {
    if (!selected || !isAdminMaster) return;
    if (
      !confirm(
        `Tem certeza que deseja excluir a candidatura de "${selected.nome}" permanentemente?`,
      )
    )
      return;

    const { error } = await supabase
      .from("candidaturas")
      .delete()
      .eq("id", selected.id);

    if (error) {
      toast.error("Erro ao excluir candidatura: " + error.message);
    } else {
      toast.success("Candidatura excluída com sucesso.");
      setItems((prev) => prev.filter((i) => i.id !== selected.id));
      setSelected(null);
    }
  };

  useEffect(() => {
    document.title = "Candidaturas | Seniority Hub";
    void load();
  }, [vagaId]);

  const load = async () => {
    setLoading(true);
    
    let csQuery = supabase
      .from("candidaturas")
      .select("*, vagas(titulo, cargo)")
      .order("created_at", { ascending: false });

    if (vagaId) {
      csQuery = csQuery.eq("vaga_id", vagaId);
    }

    const [vagaRes, csRes, esRes] = await Promise.all([
      vagaId 
        ? supabase.from("vagas").select("id,titulo,cargo").eq("id", vagaId).maybeSingle()
        : Promise.resolve({ data: null }),
      csQuery,
      supabase
        .from("pipeline_estagios")
        .select("*")
        .eq("ativo", true)
        .order("ordem", { ascending: true }),
    ]);

    setVaga(vagaRes.data as Vaga | null);
    const list = (csRes.data ?? []) as Candidatura[];
    setItems(list);
    setEstagios((esRes.data ?? []) as PipelineEstagio[]);
    
    if (candParam) {
      const found = list.find((c) => c.id === candParam);
      setSelected(found ?? list[0] ?? null);
    } else if (list.length > 0) {
      setSelected((prev) => prev ?? list[0]);
    }
    setLoading(false);
  };

  const changeEstagio = async (cand: Candidatura, estagioId: string) => {
    setItems((prev) =>
      prev.map((c) => (c.id === cand.id ? { ...c, estagio_id: estagioId } : c)),
    );
    if (selected?.id === cand.id) {
      setSelected({ ...cand, estagio_id: estagioId });
    }
    const { error } = await supabase
      .from("candidaturas")
      .update({ estagio_id: estagioId })
      .eq("id", cand.id);
    if (error) {
      toast.error("Não foi possível atualizar estágio");
      void load();
      return;
    }
    toast.success("Estágio atualizado");

    const estagio = estagios.find((e) => e.id === estagioId);
    if (!estagio) return;

    // E-mail por estágio (best-effort)
    if (estagio.email_ativo && estagio.email_assunto?.trim() && estagio.email_corpo?.trim()) {
      const r = await enviarEmailEstagio({
        candidaturaId: cand.id,
        estagio,
        nome: cand.nome,
        email: cand.email,
        vaga: vaga?.titulo ?? cand.vagas?.titulo ?? "",
      });
      if ("ok" in r && r.ok) toast.success("E-mail enviado ao candidato");
      else if ("error" in r) toast.error("Falha ao enviar e-mail");
    }

    // Auto-score (best-effort, em background)
    if (estagio.auto_score_ativo) {
      toast.info("Iniciando avaliação automática por IA...");
      void dispararAutoScoreSeNecessario(cand.id, estagio).then((r) => {
        if ("ok" in r && r.ok) {
          toast.success("Avaliação automática concluída");
          void load();
        } else if ("error" in r) {
          console.warn("auto-score falhou", r.error);
        }
      });
    }
  };

  const evaluate = async (c: Candidatura) => {
    const cargo = vaga?.cargo || c.vagas?.cargo;
    if (!cargo) {
      toast.error("Cargo não identificado para esta vaga");
      return;
    }
    setEvaluating(c.id);
    try {
      const { data, error } = await supabase.functions.invoke("assess-candidate", {
        body: {
          nome: c.nome,
          cargo: cargo,
          dadosProfissionais: c.dados_profissionais,
          informacoesAdicionais:
            c.informacoes_adicionais ||
            [
              c.email && `E-mail: ${c.email}`,
              c.telefone && `Telefone: ${c.telefone}`,
              c.linkedin && `LinkedIn: ${c.linkedin}`,
              c.portfolio && `Portfólio: ${c.portfolio}`,
            ]
              .filter(Boolean)
              .join("\n"),
          candidaturaId: c.id,
        },
      });
      if (error) throw error;
      toast.success("Avaliação concluída!");
      navigate(`/relatorio/${data.assessment.id}`);
    } catch (err: any) {
      const msg = err?.context?.error || err?.message || "Erro ao avaliar.";
      toast.error(typeof msg === "string" ? msg : "Erro ao avaliar.");
    } finally {
      setEvaluating(null);
    }
  };

  return (
    <AppShell>
      <header className="mb-6 animate-fade-in flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
            <Link to="/vagas-admin">
              <ArrowLeft className="h-4 w-4 mr-1" /> Voltar para vagas
            </Link>
          </Button>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pleno-bg text-gold text-xs font-medium mb-2 border border-gold/30">
            <Inbox className="h-3 w-3" /> {vagaId ? "Candidaturas" : "Todas as Candidaturas"}
          </div>
          <h1 className="font-display text-3xl font-semibold">
            {vaga?.titulo ?? "Novas Candidaturas"}
          </h1>
          {(vaga || items.length > 0) && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {vaga ? `${CARGO_LABEL[vaga.cargo]} · ` : ""} {items.length} candidatura(s)
            </p>
          )}
        </div>
        {vagaId && (
          <Button asChild variant="outline">
            <Link to={`/vagas-admin/${vagaId}/pipeline`}>
              <Layers className="h-4 w-4 mr-2" /> Visão Kanban
            </Link>
          </Button>
        )}
      </header>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-gold" />
        </div>
      ) : items.length === 0 ? (
        <div className="surface-card rounded-xl p-10 text-center">
          <Inbox className="h-10 w-10 text-gold mx-auto mb-3" />
          <h3 className="font-display text-xl font-semibold mb-1">
            Nenhuma candidatura ainda
          </h3>
          <p className="text-sm text-muted-foreground">
            Compartilhe o link da vaga no portal público para começar a receber inscrições.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-[280px_1fr]">
          <div className="space-y-2 max-h-[40vh] md:max-h-[75vh] overflow-y-auto pr-1">
            {items.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelected(c)}
                className={cn(
                  "w-full text-left surface-card rounded-xl p-4 transition-all duration-300 border relative overflow-hidden group",
                  selected?.id === c.id
                    ? "ring-2 ring-gold/40 border-gold/40 shadow-gold"
                    : "border-white/5 hover:border-gold/30 hover:shadow-lg",
                )}
              >
                {selected?.id === c.id && (
                  <div className="absolute top-0 left-0 w-1 h-full bg-gold" />
                )}
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 truncate">
                    <div className="font-medium truncate">{c.nome}</div>
                    {!c.visualizada && (
                      <span className="flex h-2 w-2 rounded-full bg-red-500 animate-pulse shrink-0" title="Nova inscrição" />
                    )}
                  </div>
                  <StatusBadge status={c.status} />
                </div>
                <div className="text-xs text-muted-foreground truncate">{c.email}</div>
                {!vagaId && c.vagas && (
                  <div className="text-[10px] text-gold mt-1 font-medium truncate">
                    Vaga: {c.vagas.titulo}
                  </div>
                )}
                <div className="text-[10px] text-muted-foreground mt-1">
                  {new Date(c.created_at).toLocaleString("pt-BR")}
                </div>
              </button>
            ))}
          </div>

          {selected && (
            <div className="surface-card rounded-2xl p-4 sm:p-7 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h2 className="font-display text-xl sm:text-2xl font-semibold truncate">{selected.nome}</h2>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground mt-0.5">
                    <span>Inscrito em {new Date(selected.created_at).toLocaleString("pt-BR")}</span>
                    {selected.vagas && (
                      <>
                        <span className="hidden sm:inline text-gold/30">•</span>
                        <span className="text-gold font-medium">Vaga: {selected.vagas.titulo}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <StatusBadge status={selected.status} />
                  {isAdminMaster && (
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleDelete}
                      className="h-8 w-8 text-destructive border-destructive/30 hover:bg-destructive/10"
                      title="Excluir candidatura"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-gold" />
                  <span className="text-xs uppercase tracking-wider text-muted-foreground">
                    Estágio
                  </span>
                  <Select
                    value={selected.estagio_id ?? ""}
                    onValueChange={(v) => changeEstagio(selected, v)}
                  >
                    <SelectTrigger className="h-8 w-56">
                      <SelectValue placeholder="Sem estágio" />
                    </SelectTrigger>
                    <SelectContent>
                      {estagios.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          <span className="inline-flex items-center gap-2">
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: e.cor }}
                            />
                            {e.nome}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <AtribuicaoRecrutador candidaturaId={selected.id} />
              </div>

              <Tabs defaultValue="detalhes" className="w-full">
                <TabsList className="grid w-full grid-cols-4 max-w-lg">
                  <TabsTrigger value="detalhes">Detalhes</TabsTrigger>
                  <TabsTrigger value="entrevistas">Entrevistas</TabsTrigger>
                  <TabsTrigger value="notas">Notas</TabsTrigger>
                  <TabsTrigger value="historico">Histórico</TabsTrigger>
                </TabsList>

                <TabsContent value="detalhes" className="space-y-5 mt-4">
                  <div className="grid gap-2 text-sm">
                    <Contact icon={Mail} label={selected.email} />
                    {selected.telefone && <Contact icon={Phone} label={selected.telefone} />}
                    {selected.linkedin && (
                      <Contact icon={Linkedin} label={selected.linkedin} link />
                    )}
                    {selected.portfolio && (
                      <Contact icon={Globe} label={selected.portfolio} link />
                    )}
                  </div>

                  <div>
                    <h3 className="font-display text-sm uppercase tracking-widest text-gold mb-2">
                      Experiência profissional
                    </h3>
                    <p className="text-sm text-body whitespace-pre-line leading-relaxed">
                      {selected.dados_profissionais}
                    </p>
                  </div>

                  {selected.informacoes_adicionais && (
                    <div>
                      <h3 className="font-display text-sm uppercase tracking-widest text-gold mb-2">
                        Informações adicionais
                      </h3>
                      <p className="text-sm text-body whitespace-pre-line leading-relaxed">
                        {selected.informacoes_adicionais}
                      </p>
                    </div>
                  )}

                  <div className="bg-black/20 rounded-xl p-4 border border-white/5">
                    <h3 className="font-display text-sm uppercase tracking-widest text-gold mb-4 flex items-center gap-2">
                      <Sparkles className="h-4 w-4" /> Respostas do candidato
                    </h3>
                    <RespostasCandidato candidaturaId={selected.id} />
                  </div>
                </TabsContent>

                <TabsContent value="entrevistas" className="mt-4">
                  <EntrevistasCandidatura
                    candidaturaId={selected.id}
                    vagaId={selected.vaga_id}
                    candidatoNome={selected.nome}
                    candidatoEmail={selected.email}
                    vagaTitulo={vaga?.titulo ?? selected.vagas?.titulo ?? ""}
                  />
                </TabsContent>

                <TabsContent value="notas" className="mt-4">
                  <NotasInternas candidaturaId={selected.id} />
                </TabsContent>

                <TabsContent value="historico" className="mt-4">
                  <CandidaturaTimeline candidaturaId={selected.id} />
                </TabsContent>
              </Tabs>

              <div className="flex gap-2 pt-3 border-t border-sidebar-border">
                {selected.candidate_id ? (
                  <Button asChild className="bg-gradient-gold text-gold-foreground hover:opacity-90">
                    <Link to={`/historico`}>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Já avaliado · Ver no histórico
                    </Link>
                  </Button>
                ) : (
                  <Button
                    onClick={() => evaluate(selected)}
                    disabled={evaluating === selected.id}
                    className="bg-gradient-gold text-gold-foreground hover:opacity-90 shadow-gold"
                  >
                    {evaluating === selected.id ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4 mr-2" />
                    )}
                    Avaliar com IA
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </AppShell>
  );
};

const Contact = ({
  icon: Icon,
  label,
  link,
}: {
  icon: any;
  label: string;
  link?: boolean;
}) => (
  <div className="flex items-center gap-2 text-sm">
    <Icon className="h-4 w-4 text-gold shrink-0" />
    {link ? (
      <a
        href={label.startsWith("http") ? label : `https://${label}`}
        target="_blank"
        rel="noreferrer"
        className="text-gold hover:underline inline-flex items-center gap-1"
      >
        {label} <ExternalLink className="h-3 w-3" />
      </a>
    ) : (
      <span className="text-body">{label}</span>
    )}
  </div>
);

const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, string> = {
    novo: "bg-pleno-bg text-gold border-gold/40",
    avaliado: "bg-senior-bg text-senior border-senior/40",
    rejeitado: "bg-junior-bg text-junior border-junior/40",
  };
  return (
    <span
      className={cn(
        "text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider border",
        map[status] ?? "bg-surface-elevated text-muted-foreground border-sidebar-border",
      )}
    >
      {status}
    </span>
  );
};

export default InboxCandidaturas;
