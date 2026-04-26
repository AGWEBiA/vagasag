import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { z } from "zod";
import {
  Gem,
  Briefcase,
  MapPin,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  Send,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CARGO_LABEL } from "@/lib/seniority";
import { ESCALA_LABEL, type VagaPergunta } from "@/lib/perguntas";
import { toast } from "sonner";

interface Vaga {
  id: string;
  titulo: string;
  cargo: string;
  descricao: string;
  requisitos: string | null;
  beneficios: string | null;
  modalidade: string;
  localizacao: string | null;
  faixa_salarial: string | null;
  status: string;
}

const candidaturaSchema = z.object({
  nome: z.string().trim().min(2, "Informe seu nome.").max(120),
  email: z.string().trim().email("E-mail inválido.").max(160),
  telefone: z.string().trim().max(40).optional().or(z.literal("")),
  linkedin: z.string().trim().max(200).optional().or(z.literal("")),
  portfolio: z.string().trim().max(200).optional().or(z.literal("")),
  dados_profissionais: z
    .string()
    .trim()
    .min(80, "Inclua pelo menos 80 caracteres descrevendo sua experiência.")
    .max(8000),
  informacoes_adicionais: z.string().trim().max(2000).optional().or(z.literal("")),
});

const VagaPublica = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [vaga, setVaga] = useState<Vaga | null>(null);
  const [perguntas, setPerguntas] = useState<VagaPergunta[]>([]);
  const [respostas, setRespostas] = useState<Record<string, { texto?: string; numero?: number }>>(
    {},
  );
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({
    nome: "",
    email: "",
    telefone: "",
    linkedin: "",
    portfolio: "",
    dados_profissionais: "",
    informacoes_adicionais: "",
  });

  useEffect(() => {
    void load();
  }, [id]);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    const { data } = await supabase
      .from("vagas")
      .select("*")
      .eq("id", id)
      .eq("status", "aberta")
      .maybeSingle();
    setVaga((data as Vaga) ?? null);
    if (data) document.title = `${(data as Vaga).titulo} | Seniority Hub`;

    const { data: ps } = await supabase
      .from("vaga_perguntas")
      .select("*")
      .eq("vaga_id", id)
      .order("ordem", { ascending: true });
    setPerguntas((ps ?? []) as VagaPergunta[]);

    setLoading(false);
  };

  const setResposta = (pid: string, patch: { texto?: string; numero?: number }) => {
    setRespostas((r) => ({ ...r, [pid]: { ...r[pid], ...patch } }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vaga) return;
    const parsed = candidaturaSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message ?? "Dados inválidos.");
      return;
    }
    // Validar perguntas obrigatórias
    for (const p of perguntas) {
      if (!p.obrigatoria) continue;
      const r = respostas[p.id];
      const ok =
        p.tipo === "escala"
          ? typeof r?.numero === "number"
          : (r?.texto ?? "").trim().length > 0;
      if (!ok) {
        toast.error(`Responda: "${p.texto}"`);
        return;
      }
    }
    setSubmitting(true);
    const { data: cand, error } = await supabase
      .from("candidaturas")
      .insert({
        vaga_id: vaga.id,
        nome: parsed.data.nome,
        email: parsed.data.email,
        telefone: parsed.data.telefone || null,
        linkedin: parsed.data.linkedin || null,
        portfolio: parsed.data.portfolio || null,
        dados_profissionais: parsed.data.dados_profissionais,
        informacoes_adicionais: parsed.data.informacoes_adicionais || null,
      })
      .select("id")
      .single();
    if (error || !cand) {
      setSubmitting(false);
      console.error(error);
      toast.error("Não foi possível enviar sua candidatura.");
      return;
    }
    // Inserir respostas
    const respostasRows = perguntas
      .map((p) => {
        const r = respostas[p.id];
        if (!r) return null;
        const hasText = (r.texto ?? "").trim().length > 0;
        const hasNum = typeof r.numero === "number";
        if (!hasText && !hasNum) return null;
        return {
          candidatura_id: cand.id,
          vaga_pergunta_id: p.id,
          resposta_texto: hasText ? r.texto!.trim() : null,
          resposta_numero: hasNum ? r.numero! : null,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
    if (respostasRows.length > 0) {
      const { error: rErr } = await supabase
        .from("candidatura_respostas")
        .insert(respostasRows);
      if (rErr) console.error("Erro respostas:", rErr);
    }
    setSubmitting(false);
    setSuccess(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-gradient-hero">
      <header className="border-b border-sidebar-border bg-sidebar/60 backdrop-blur">
        <div className="mx-auto max-w-4xl px-6 py-5 flex items-center justify-between">
          <Link to="/vagas" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-gold shadow-gold">
              <Gem className="h-4 w-4 text-gold-foreground" />
            </div>
            <span className="font-display font-semibold">
              Seniority <span className="text-gradient-gold">Hub</span>
            </span>
          </Link>
          <Button asChild variant="ghost" size="sm">
            <Link to="/vagas">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Todas as vagas
            </Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-gold" />
          </div>
        ) : !vaga ? (
          <div className="surface-card rounded-xl p-10 text-center">
            <h2 className="font-display text-2xl font-semibold mb-2">Vaga não encontrada</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Pode ter sido encerrada ou removida.
            </p>
            <Button onClick={() => navigate("/vagas")}>Ver outras vagas</Button>
          </div>
        ) : success ? (
          <div className="surface-card rounded-xl p-10 text-center animate-fade-in">
            <CheckCircle2 className="h-12 w-12 text-senior mx-auto mb-3" />
            <h2 className="font-display text-3xl font-semibold mb-2">Candidatura enviada!</h2>
            <p className="text-muted-foreground mb-6">
              Recebemos seus dados. Nossa equipe vai analisar e entrar em contato pelo e-mail
              informado.
            </p>
            <div className="flex justify-center gap-2">
              <Button asChild variant="outline" className="border-gold/40">
                <Link to="/vagas">Ver outras vagas</Link>
              </Button>
            </div>
          </div>
        ) : (
          <>
            <article className="surface-card rounded-xl p-8 mb-6 animate-fade-in">
              <div className="text-xs text-gold uppercase tracking-widest font-semibold mb-2">
                {CARGO_LABEL[vaga.cargo]}
              </div>
              <h1 className="font-display text-3xl md:text-4xl font-semibold mb-3">
                {vaga.titulo}
              </h1>
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mb-6">
                <span className="inline-flex items-center gap-1">
                  <Briefcase className="h-3 w-3" /> {vaga.modalidade}
                </span>
                {vaga.localizacao && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {vaga.localizacao}
                  </span>
                )}
                {vaga.faixa_salarial && (
                  <span className="text-gold font-medium">{vaga.faixa_salarial}</span>
                )}
              </div>

              <Section title="Sobre a vaga">{vaga.descricao}</Section>
              {vaga.requisitos && <Section title="Requisitos">{vaga.requisitos}</Section>}
              {vaga.beneficios && <Section title="Benefícios">{vaga.beneficios}</Section>}
            </article>

            <form
              onSubmit={submit}
              className="surface-card rounded-xl p-8 space-y-5 animate-fade-in"
            >
              <div>
                <h2 className="font-display text-2xl font-semibold mb-1">
                  Candidate-se a esta vaga
                </h2>
                <p className="text-sm text-muted-foreground">
                  Preencha os dados abaixo. Não é necessário criar conta.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Field
                  label="Nome completo *"
                  value={form.nome}
                  onChange={(v) => setForm({ ...form, nome: v })}
                  placeholder="Seu nome"
                />
                <Field
                  label="E-mail *"
                  type="email"
                  value={form.email}
                  onChange={(v) => setForm({ ...form, email: v })}
                  placeholder="voce@email.com"
                />
                <Field
                  label="Telefone / WhatsApp"
                  value={form.telefone}
                  onChange={(v) => setForm({ ...form, telefone: v })}
                  placeholder="(11) 99999-0000"
                />
                <Field
                  label="LinkedIn"
                  value={form.linkedin}
                  onChange={(v) => setForm({ ...form, linkedin: v })}
                  placeholder="https://linkedin.com/in/..."
                />
              </div>

              <Field
                label="Portfólio / Site"
                value={form.portfolio}
                onChange={(v) => setForm({ ...form, portfolio: v })}
                placeholder="https://..."
              />

              <div className="space-y-2">
                <Label>Sua experiência profissional *</Label>
                <Textarea
                  rows={8}
                  value={form.dados_profissionais}
                  onChange={(e) =>
                    setForm({ ...form, dados_profissionais: e.target.value })
                  }
                  placeholder="Conte sobre sua experiência: empresas, projetos, ferramentas, conquistas mensuráveis e tempo de atuação."
                />
                <p className="text-[11px] text-muted-foreground">
                  Quanto mais detalhes, melhor a análise. Inclua métricas e resultados.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Algo mais que gostaria de adicionar?</Label>
                <Textarea
                  rows={3}
                  value={form.informacoes_adicionais}
                  onChange={(e) =>
                    setForm({ ...form, informacoes_adicionais: e.target.value })
                  }
                  placeholder="Disponibilidade, pretensão salarial, observações..."
                />
              </div>

              {perguntas.length > 0 && (
                <div className="space-y-4 pt-4 border-t border-sidebar-border">
                  <div>
                    <h3 className="font-display text-sm uppercase tracking-widest text-gold mb-1">
                      Perguntas adicionais
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Suas respostas ajudam na avaliação.
                    </p>
                  </div>
                  {perguntas.map((p) => (
                    <div key={p.id} className="space-y-2">
                      <Label>
                        {p.texto}
                        {p.obrigatoria && <span className="text-gold ml-1">*</span>}
                      </Label>
                      {p.tipo === "texto" && (
                        <Textarea
                          rows={3}
                          value={respostas[p.id]?.texto ?? ""}
                          onChange={(e) =>
                            setResposta(p.id, { texto: e.target.value })
                          }
                        />
                      )}
                      {p.tipo === "escolha" && (
                        <div className="space-y-1.5">
                          {p.opcoes.map((opt) => (
                            <label
                              key={opt}
                              className="flex items-center gap-2 text-sm cursor-pointer"
                            >
                              <input
                                type="radio"
                                name={`q-${p.id}`}
                                value={opt}
                                checked={respostas[p.id]?.texto === opt}
                                onChange={() => setResposta(p.id, { texto: opt })}
                                className="accent-gold"
                              />
                              {opt}
                            </label>
                          ))}
                        </div>
                      )}
                      {p.tipo === "escala" && (
                        <div className="flex gap-2">
                          {[1, 2, 3, 4, 5].map((n) => {
                            const active = respostas[p.id]?.numero === n;
                            return (
                              <button
                                key={n}
                                type="button"
                                onClick={() => setResposta(p.id, { numero: n })}
                                className={`flex-1 rounded-md border py-2 text-sm font-medium transition ${
                                  active
                                    ? "bg-gradient-gold text-gold-foreground border-transparent shadow-gold"
                                    : "border-sidebar-border bg-surface-elevated text-body hover:border-gold/40"
                                }`}
                                title={ESCALA_LABEL[n]}
                              >
                                {n}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <Button
                type="submit"
                disabled={submitting}
                className="w-full bg-gradient-gold text-gold-foreground hover:opacity-90 shadow-gold h-12 text-base font-semibold"
              >
                {submitting ? (
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                ) : (
                  <Send className="h-5 w-5 mr-2" />
                )}
                Enviar candidatura
              </Button>
            </form>
          </>
        )}
      </main>
    </div>
  );
};

const Section = ({ title, children }: { title: string; children: string }) => (
  <div className="mb-5">
    <h3 className="font-display text-sm uppercase tracking-widest text-gold mb-2">
      {title}
    </h3>
    <p className="text-body whitespace-pre-line leading-relaxed">{children}</p>
  </div>
);

const Field = ({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) => (
  <div className="space-y-2">
    <Label>{label}</Label>
    <Input
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  </div>
);

export default VagaPublica;
