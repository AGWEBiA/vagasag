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
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { CARGO_LABEL } from "@/lib/seniority";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { RespostasCandidato } from "@/components/RespostasCandidato";
import { CandidaturaTimeline } from "@/components/CandidaturaTimeline";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { PipelineEstagio } from "@/lib/pipeline";
import { dispararAutoScoreSeNecessario, enviarEmailEstagio } from "@/lib/emails";

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
}

const InboxCandidaturas = () => {
  const { vagaId } = useParams<{ vagaId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const candParam = searchParams.get("cand");
  const [vaga, setVaga] = useState<Vaga | null>(null);
  const [items, setItems] = useState<Candidatura[]>([]);
  const [estagios, setEstagios] = useState<PipelineEstagio[]>([]);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState<string | null>(null);
  const [selected, setSelected] = useState<Candidatura | null>(null);

  useEffect(() => {
    document.title = "Candidaturas | Seniority Hub";
    void load();
  }, [vagaId]);

  const load = async () => {
    if (!vagaId) return;
    setLoading(true);
    const [{ data: v }, { data: cs }, { data: es }] = await Promise.all([
      supabase.from("vagas").select("id,titulo,cargo").eq("id", vagaId).maybeSingle(),
      supabase
        .from("candidaturas")
        .select("*")
        .eq("vaga_id", vagaId)
        .order("created_at", { ascending: false }),
      supabase
        .from("pipeline_estagios")
        .select("*")
        .eq("ativo", true)
        .order("ordem", { ascending: true }),
    ]);
    setVaga(v as Vaga | null);
    const list = (cs ?? []) as Candidatura[];
    setItems(list);
    setEstagios((es ?? []) as PipelineEstagio[]);
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
    } else {
      toast.success("Estágio atualizado");
    }
  };

  const evaluate = async (c: Candidatura) => {
    if (!vaga) return;
    setEvaluating(c.id);
    try {
      const { data, error } = await supabase.functions.invoke("assess-candidate", {
        body: {
          nome: c.nome,
          cargo: vaga.cargo,
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
            <Inbox className="h-3 w-3" /> Candidaturas
          </div>
          <h1 className="font-display text-3xl font-semibold">
            {vaga?.titulo ?? "Carregando..."}
          </h1>
          {vaga && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {CARGO_LABEL[vaga.cargo]} · {items.length} candidatura(s)
            </p>
          )}
        </div>
        <Button asChild variant="outline">
          <Link to={`/vagas-admin/${vagaId}/pipeline`}>
            <Layers className="h-4 w-4 mr-2" /> Visão Kanban
          </Link>
        </Button>
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
        <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
          <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
            {items.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelected(c)}
                className={cn(
                  "w-full text-left surface-card rounded-lg p-4 transition border",
                  selected?.id === c.id
                    ? "ring-1 ring-gold/40 border-gold/30"
                    : "border-transparent hover:border-gold/20",
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="font-medium truncate">{c.nome}</div>
                  <StatusBadge status={c.status} />
                </div>
                <div className="text-xs text-muted-foreground truncate">{c.email}</div>
                <div className="text-[10px] text-muted-foreground mt-1">
                  {new Date(c.created_at).toLocaleString("pt-BR")}
                </div>
              </button>
            ))}
          </div>

          {selected && (
            <div className="surface-card rounded-xl p-6 space-y-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-2xl font-semibold">{selected.nome}</h2>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Inscrito em {new Date(selected.created_at).toLocaleString("pt-BR")}
                  </div>
                </div>
                <StatusBadge status={selected.status} />
              </div>

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

              <Tabs defaultValue="detalhes" className="w-full">
                <TabsList className="grid w-full grid-cols-2 max-w-xs">
                  <TabsTrigger value="detalhes">Detalhes</TabsTrigger>
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

                  <div>
                    <h3 className="font-display text-sm uppercase tracking-widest text-gold mb-2">
                      Respostas do candidato
                    </h3>
                    <RespostasCandidato candidaturaId={selected.id} />
                  </div>
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
