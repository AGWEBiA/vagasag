import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, Loader2, Info } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CARGOS, CARGO_HINTS } from "@/lib/seniority";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Origem = "candidato" | "time";

const NovaAvaliacao = () => {
  const navigate = useNavigate();
  const [nome, setNome] = useState("");
  const [cargo, setCargo] = useState("");
  const [dados, setDados] = useState("");
  const [info, setInfo] = useState("");
  const [origem, setOrigem] = useState<Origem>("candidato");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    document.title = "Nova Avaliação | Seniority Hub";
  }, []);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!nome.trim()) e.nome = "Informe o nome do candidato.";
    if (!cargo) e.cargo = "Selecione um cargo.";
    if (dados.trim().length < 50)
      e.dados = "Inclua pelo menos 50 caracteres de dados profissionais.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("assess-candidate", {
        body: {
          nome: nome.trim(),
          cargo,
          dadosProfissionais: dados.trim(),
          informacoesAdicionais: info.trim() || undefined,
          origem,
        },
      });
      if (error) throw error;
      if (!data?.assessment?.id) throw new Error("Resposta inválida");
      toast.success("Avaliação concluída!");
      navigate(`/relatorio/${data.assessment.id}`);
    } catch (err: any) {
      console.error(err);
      const msg = err?.context?.error || err?.message || "Erro ao processar avaliação. Tente novamente.";
      toast.error(typeof msg === "string" ? msg : "Erro ao processar avaliação.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell>
      <header className="mb-8 animate-fade-in">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pleno-bg text-gold text-xs font-medium mb-3 border border-gold/30">
          <Sparkles className="h-3 w-3" /> Powered by IA
        </div>
        <h1 className="font-display text-4xl font-semibold">Nova Avaliação</h1>
        <p className="text-muted-foreground mt-1">
          Preencha os dados do candidato — a IA fará a análise nos 4 pilares de senioridade.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="surface-card rounded-xl p-6 md:p-8 space-y-6 max-w-3xl">
        <div className="space-y-2">
          <Label>Tipo de avaliação</Label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setOrigem("candidato")}
              disabled={submitting}
              className={`rounded-lg border p-3 text-left transition-all ${
                origem === "candidato"
                  ? "border-gold/60 bg-pleno-bg/30 shadow-gold"
                  : "border-sidebar-border bg-surface-elevated hover:border-gold/30"
              }`}
            >
              <div className="text-sm font-semibold">Candidato externo</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                Pessoa em processo seletivo
              </div>
            </button>
            <button
              type="button"
              onClick={() => setOrigem("time")}
              disabled={submitting}
              className={`rounded-lg border p-3 text-left transition-all ${
                origem === "time"
                  ? "border-gold/60 bg-pleno-bg/30 shadow-gold"
                  : "border-sidebar-border bg-surface-elevated hover:border-gold/30"
              }`}
            >
              <div className="text-sm font-semibold">Membro do time</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                Avaliação interna do colaborador
              </div>
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="nome">
            Nome <span className="text-destructive">*</span>
          </Label>
          <Input
            id="nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex: João Silva"
            disabled={submitting}
          />
          {errors.nome && <p className="text-xs text-destructive">{errors.nome}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="cargo">
            Cargo <span className="text-destructive">*</span>
          </Label>
          <Select value={cargo} onValueChange={setCargo} disabled={submitting}>
            <SelectTrigger id="cargo">
              <SelectValue placeholder="Selecione o cargo a avaliar" />
            </SelectTrigger>
            <SelectContent>
              {CARGOS.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.cargo && <p className="text-xs text-destructive">{errors.cargo}</p>}
          {cargo && (
            <div className="mt-2 flex gap-2 rounded-md bg-surface-elevated border border-gold/20 p-3 text-xs text-body animate-fade-in">
              <Info className="h-4 w-4 text-gold shrink-0 mt-0.5" />
              <span>{CARGO_HINTS[cargo]}</span>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="dados">
            Dados Profissionais <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="dados"
            value={dados}
            onChange={(e) => setDados(e.target.value)}
            rows={8}
            placeholder="Cole aqui o currículo, experiência profissional, habilidades, ferramentas dominadas, conquistas mensuráveis e certificações do candidato..."
            disabled={submitting}
            className="resize-none"
          />
          <div className="flex justify-between text-xs">
            <p className="text-muted-foreground">
              Quanto mais detalhado, mais precisa será a avaliação. Inclua métricas e resultados concretos.
            </p>
            <span className={dados.length < 50 ? "text-muted-foreground" : "text-senior"}>
              {dados.length} chars
            </span>
          </div>
          {errors.dados && <p className="text-xs text-destructive">{errors.dados}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="info">Informações Adicionais (opcional)</Label>
          <Textarea
            id="info"
            value={info}
            onChange={(e) => setInfo(e.target.value)}
            rows={3}
            placeholder="Portfólio, links de projetos, observações do recrutador, contexto da vaga..."
            disabled={submitting}
            className="resize-none"
          />
        </div>

        {submitting && (
          <div className="flex items-start gap-3 rounded-lg bg-pleno-bg border border-gold/30 p-4 animate-fade-in">
            <Loader2 className="h-5 w-5 text-gold animate-spin shrink-0 mt-0.5" />
            <div className="text-sm">
              <div className="font-medium text-gold">Analisando com IA...</div>
              <div className="text-body/80 mt-0.5">
                A IA está analisando o perfil com base nos 4 pilares de senioridade. Isso pode levar alguns segundos...
              </div>
            </div>
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
            <Sparkles className="h-5 w-5 mr-2" />
          )}
          {submitting ? "Analisando com IA..." : "Avaliar Candidato"}
        </Button>
      </form>
    </AppShell>
  );
};

export default NovaAvaliacao;
