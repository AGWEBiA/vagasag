import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, Loader2, Info, LogOut, CheckCircle2, Clock } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { useBranding } from "@/hooks/useBranding";
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
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { toast } from "sonner";

const COOLDOWN_SECONDS = 60;
const HOURLY_LIMIT = 5;
const HOUR_MS = 60 * 60 * 1000;

const storageKeyFor = (userId: string) => `autoaval:submissions:${userId}`;

const readSubmissions = (userId: string): number[] => {
  try {
    const raw = localStorage.getItem(storageKeyFor(userId));
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    const now = Date.now();
    return arr.filter((t: unknown) => typeof t === "number" && now - t < HOUR_MS);
  } catch {
    return [];
  }
};

const writeSubmissions = (userId: string, arr: number[]) => {
  try {
    localStorage.setItem(storageKeyFor(userId), JSON.stringify(arr));
  } catch {
    /* ignore */
  }
};

const Autoavaliacao = () => {
  const navigate = useNavigate();
  const { user, signOut, loading: authLoading } = useAuth();
  const { hasPanelAccess, loading: roleLoading } = useUserRole();
  const [nome, setNome] = useState("");
  const [cargo, setCargo] = useState("");
  const [dados, setDados] = useState("");
  const [info, setInfo] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [hourlyCount, setHourlyCount] = useState(0);

  useEffect(() => {
    document.title = "Autoavaliação | Seniority Hub";
  }, []);

  useEffect(() => {
    if (!authLoading && !user) navigate("/login?redirect=/autoavaliacao");
  }, [authLoading, user, navigate]);

  // Recarrega o estado de envios quando usuário muda
  useEffect(() => {
    if (!user) return;
    const subs = readSubmissions(user.id);
    setHourlyCount(subs.length);
    const last = subs[subs.length - 1];
    if (last) {
      const elapsed = Math.floor((Date.now() - last) / 1000);
      const remaining = Math.max(0, COOLDOWN_SECONDS - elapsed);
      setCooldownRemaining(remaining);
    }
  }, [user]);

  // Tick do contador de cooldown
  useEffect(() => {
    if (cooldownRemaining <= 0) return;
    const id = setInterval(() => {
      setCooldownRemaining((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [cooldownRemaining]);

  useEffect(() => {
    if (user) {
      const meta = (user.user_metadata ?? {}) as { full_name?: string };
      if (meta.full_name && !nome) setNome(meta.full_name);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!nome.trim()) e.nome = "Informe seu nome.";
    if (!cargo) e.cargo = "Selecione seu cargo.";
    if (dados.trim().length < 50)
      e.dados = "Inclua pelo menos 50 caracteres descrevendo sua experiência.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!user) return;
    if (!validate()) return;

    // Reavalia limites com dados frescos do localStorage
    const subs = readSubmissions(user.id);
    const last = subs[subs.length - 1];
    if (last) {
      const elapsed = Math.floor((Date.now() - last) / 1000);
      const remaining = COOLDOWN_SECONDS - elapsed;
      if (remaining > 0) {
        setCooldownRemaining(remaining);
        toast.error(
          `Aguarde ${remaining}s antes de enviar outra autoavaliação.`,
        );
        return;
      }
    }
    if (subs.length >= HOURLY_LIMIT) {
      toast.error(
        `Limite de ${HOURLY_LIMIT} envios por hora atingido. Tente novamente mais tarde.`,
      );
      setHourlyCount(subs.length);
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("candidates").insert({
        nome: nome.trim(),
        cargo,
        dados_profissionais: dados.trim(),
        informacoes_adicionais: info.trim() || null,
        origem: "time",
        created_by: user.id,
      });
      if (error) throw error;

      // Registra envio bem-sucedido
      const updated = [...subs, Date.now()];
      writeSubmissions(user.id, updated);
      setHourlyCount(updated.length);
      setCooldownRemaining(COOLDOWN_SECONDS);

      setEnviado(true);
      toast.success("Autoavaliação enviada! A liderança fará a análise em breve.");
    } catch (err: any) {
      console.error(err);
      const msg =
        err?.message || "Erro ao enviar autoavaliação. Tente novamente.";
      toast.error(typeof msg === "string" ? msg : "Erro ao enviar.");
    } finally {
      setSubmitting(false);
    }
  };

  const limitReached = hourlyCount >= HOURLY_LIMIT;
  const inCooldown = cooldownRemaining > 0;
  const blockSubmit = submitting || inCooldown || limitReached;

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-gold" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-sidebar-border bg-surface-elevated/60 backdrop-blur sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <BrandLogo variant="horizontal" className="h-8" />
          <div className="flex items-center gap-3">
            {hasPanelAccess && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/dashboard")}
                className="text-xs"
              >
                Ir para o painel
              </Button>
            )}
            <span className="text-xs text-muted-foreground hidden sm:inline">
              {user?.email}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => signOut().then(() => navigate("/login"))}
              aria-label="Sair"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pleno-bg text-gold text-xs font-medium mb-3 border border-gold/30">
            <Sparkles className="h-3 w-3" /> Autoavaliação do time
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-semibold">
            {branding.autoaval_titulo || "Conte sobre sua trajetória"}
          </h1>
          <p className="text-muted-foreground mt-2 whitespace-pre-line">
            {branding.autoaval_descricao ||
              "Suas respostas vão ajudar a liderança a entender seu nível atual e mapear oportunidades de crescimento. Apenas administradores e líderes verão sua avaliação."}
          </p>
        </div>

        {enviado ? (
          <div className="surface-card rounded-xl p-8 text-center space-y-4 animate-fade-in">
            <CheckCircle2 className="h-12 w-12 text-gold mx-auto" />
            <h2 className="font-display text-2xl font-semibold">Recebido!</h2>
            <p className="text-muted-foreground max-w-md mx-auto text-sm">
              Sua autoavaliação foi registrada. A liderança fará a análise e
              acompanhará seu desenvolvimento. Você pode fechar esta página.
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setEnviado(false);
                setDados("");
                setInfo("");
                setCargo("");
              }}
            >
              Enviar outra
            </Button>
          </div>
        ) : (
          <>
            <div className="surface-card rounded-xl p-5 md:p-6 mb-6 border border-gold/30 bg-gradient-to-br from-pleno-bg/40 to-transparent animate-fade-in">
              <h2 className="font-display text-base font-semibold mb-3 flex items-center gap-2">
                <Info className="h-4 w-4 text-gold" />
                Como preencher para a leitura ser precisa
              </h2>
              <ol className="space-y-2 text-sm text-body/90">
                <li className="flex gap-3">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gold/20 text-gold text-[11px] font-bold shrink-0 mt-0.5">
                    1
                  </span>
                  <span>
                    <strong>Conte seu tempo de experiência</strong> — total de anos na
                    área e nesse cargo específico.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gold/20 text-gold text-[11px] font-bold shrink-0 mt-0.5">
                    2
                  </span>
                  <span>
                    <strong>Descreva projetos relevantes</strong> com contexto: o que
                    fez, qual foi seu papel e o que entregou.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gold/20 text-gold text-[11px] font-bold shrink-0 mt-0.5">
                    3
                  </span>
                  <span>
                    <strong>Use números e resultados</strong> — métricas, percentuais,
                    economia gerada, ROI, prazos batidos. Evidências valem mais que
                    adjetivos.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gold/20 text-gold text-[11px] font-bold shrink-0 mt-0.5">
                    4
                  </span>
                  <span>
                    <strong>Liste ferramentas e stacks</strong> que domina e em que
                    nível (uso diário, ocasional, certificações).
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gold/20 text-gold text-[11px] font-bold shrink-0 mt-0.5">
                    5
                  </span>
                  <span>
                    <strong>Mostre escopo de impacto</strong> — quem você influencia,
                    decisões que tomou sozinho, situações em que liderou ou mentorou
                    pessoas.
                  </span>
                </li>
              </ol>
              <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-sidebar-border">
                💡 Seja honesto. A análise compara contra um framework de 4 pilares
                (técnica, impacto, estratégia, liderança) — exagerar não ajuda você
                nem a liderança.
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              className="surface-card rounded-xl p-6 md:p-8 space-y-6"
            >
            <div className="space-y-2">
              <Label htmlFor="nome">
                Seu nome completo <span className="text-destructive">*</span>
              </Label>
              <Input
                id="nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Maria Souza"
                disabled={submitting}
              />
              {errors.nome && <p className="text-xs text-destructive">{errors.nome}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="cargo">
                Seu cargo atual <span className="text-destructive">*</span>
              </Label>
              <Select value={cargo} onValueChange={setCargo} disabled={submitting}>
                <SelectTrigger id="cargo">
                  <SelectValue placeholder="Selecione o cargo" />
                </SelectTrigger>
                <SelectContent>
                  {CARGOS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.cargo && (
                <p className="text-xs text-destructive">{errors.cargo}</p>
              )}
              {cargo && (
                <div className="mt-2 flex gap-2 rounded-md bg-surface-elevated border border-gold/20 p-3 text-xs text-body animate-fade-in">
                  <Info className="h-4 w-4 text-gold shrink-0 mt-0.5" />
                  <span>{CARGO_HINTS[cargo]}</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="dados">
                Sua experiência profissional{" "}
                <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="dados"
                value={dados}
                onChange={(e) => setDados(e.target.value)}
                rows={10}
                placeholder="Descreva: anos de experiência, projetos relevantes, ferramentas dominadas, métricas e resultados, certificações, contextos onde liderou ou tomou decisões..."
                disabled={submitting}
                className="resize-none"
              />
              <div className="flex justify-between text-xs">
                <p className="text-muted-foreground">
                  Quanto mais detalhe (com números e exemplos), mais precisa será a leitura.
                </p>
                <span
                  className={dados.length < 50 ? "text-muted-foreground" : "text-senior"}
                >
                  {dados.length} chars
                </span>
              </div>
              {errors.dados && (
                <p className="text-xs text-destructive">{errors.dados}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="info">Algo mais que queira contar (opcional)</Label>
              <Textarea
                id="info"
                value={info}
                onChange={(e) => setInfo(e.target.value)}
                rows={3}
                placeholder="Aspirações, áreas em que quer crescer, formatos de trabalho preferidos..."
                disabled={submitting}
                className="resize-none"
              />
            </div>

            {submitting && (
              <div className="flex items-start gap-3 rounded-lg bg-pleno-bg border border-gold/30 p-4 animate-fade-in">
                <Loader2 className="h-5 w-5 text-gold animate-spin shrink-0 mt-0.5" />
                <div className="text-sm">
                  <div className="font-medium text-gold">Enviando...</div>
                  <div className="text-body/80 mt-0.5">
                    Estamos analisando suas respostas. Isso leva alguns segundos.
                  </div>
                </div>
              </div>
            )}

            {!submitting && limitReached && (
              <div className="flex items-start gap-3 rounded-lg bg-destructive/10 border border-destructive/30 p-4 animate-fade-in">
                <Clock className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <div className="text-sm">
                  <div className="font-medium text-destructive">
                    Limite de envios atingido
                  </div>
                  <div className="text-body/80 mt-0.5">
                    Você já enviou {HOURLY_LIMIT} autoavaliações na última hora. Aguarde
                    para enviar novamente.
                  </div>
                </div>
              </div>
            )}

            {!submitting && !limitReached && inCooldown && (
              <div className="flex items-start gap-3 rounded-lg bg-surface-elevated border border-gold/30 p-4 animate-fade-in">
                <Clock className="h-5 w-5 text-gold shrink-0 mt-0.5" />
                <div className="text-sm">
                  <div className="font-medium text-gold">
                    Aguarde {cooldownRemaining}s antes de enviar novamente
                  </div>
                  <div className="text-body/80 mt-0.5">
                    Para evitar envios duplicados, aplicamos um intervalo de{" "}
                    {COOLDOWN_SECONDS} segundos entre envios.
                  </div>
                </div>
              </div>
            )}

            <Button
              type="submit"
              disabled={blockSubmit}
              className="w-full bg-gradient-gold text-gold-foreground hover:opacity-90 shadow-gold h-12 text-base font-semibold disabled:opacity-60"
            >
              {submitting ? (
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              ) : inCooldown ? (
                <Clock className="h-5 w-5 mr-2" />
              ) : (
                <Sparkles className="h-5 w-5 mr-2" />
              )}
              {submitting
                ? "Enviando..."
                : limitReached
                  ? "Limite atingido"
                  : inCooldown
                    ? `Aguarde ${cooldownRemaining}s`
                    : "Enviar autoavaliação"}
            </Button>

            <p className="text-[11px] text-muted-foreground text-center">
              Envios usados nesta hora: {hourlyCount}/{HOURLY_LIMIT}
            </p>
            </form>
          </>
        )}
      </main>
    </div>
  );
};

export default Autoavaliacao;
