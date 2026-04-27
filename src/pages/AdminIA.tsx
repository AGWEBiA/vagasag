import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Cpu,
  ShieldCheck,
  Sparkles,
  Loader2,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Zap,
  XCircle,
  Eye,
  EyeOff,
  Trash2,
  Pencil,
  Copy,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AI_PROVIDERS, AIProvider, getProvider, AIProviderInfo } from "@/lib/aiProviders";
import { cn } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";
import { DEFAULT_PESOS, type AssessmentPesos } from "@/hooks/useAssessmentPesos";

interface AISettingsRow {
  id: string;
  provider: string;
  model: string;
  enabled_providers: string[];
  updated_at: string;
}

type TestState = {
  status: "idle" | "testing" | "ok" | "error";
  message?: string;
  latency?: number;
};

const AdminIA = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<AISettingsRow | null>(null);
  const [provider, setProvider] = useState<AIProvider>("lovable");
  const [model, setModel] = useState("google/gemini-2.5-flash");
  const [enabled, setEnabled] = useState<Record<AIProvider, boolean>>({
    lovable: true,
    openai: false,
    anthropic: false,
    groq: false,
  });
  // Per-provider chosen "test model" (defaults to first model)
  const [providerTestModel, setProviderTestModel] = useState<Record<AIProvider, string>>({
    lovable: "google/gemini-2.5-flash",
    openai: "gpt-4o-mini",
    anthropic: "claude-3-5-haiku-20241022",
    groq: "llama-3.3-70b-versatile",
  });
  const [tests, setTests] = useState<Record<AIProvider, TestState>>({
    lovable: { status: "idle" },
    openai: { status: "idle" },
    anthropic: { status: "idle" },
    groq: { status: "idle" },
  });
  // Credentials state — stores whether each provider has a key saved + last 4 chars preview
  const [credentials, setCredentials] = useState<
    Record<AIProvider, { configured: boolean; preview?: string; updatedAt?: string }>
  >({
    lovable: { configured: true, preview: "managed" },
    openai: { configured: false },
    anthropic: { configured: false },
    groq: { configured: false },
  });
  const [editingProvider, setEditingProvider] = useState<AIProvider | null>(null);
  const [editingKey, setEditingKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [savingKey, setSavingKey] = useState(false);

  // Pesos dos pilares (assessment_pesos)
  const [pesos, setPesos] = useState<AssessmentPesos>(DEFAULT_PESOS);
  const [pesosLoading, setPesosLoading] = useState(true);
  const [savingPesos, setSavingPesos] = useState(false);

  const totalPesos =
    pesos.tecnico + pesos.impacto + pesos.comportamental + pesos.estrategico + pesos.lideranca;

  useEffect(() => {
    document.title = "Configuração de IA | Seniority Hub";
    void load();
    void loadCredentials();
  }, []);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("ai_settings")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) {
      toast.error("Erro ao carregar configurações.");
    } else if (data) {
      const row = data as unknown as AISettingsRow;
      setSettings(row);
      setProvider(row.provider as AIProvider);
      setModel(row.model);
      const en: Record<AIProvider, boolean> = {
        lovable: true,
        openai: false,
        anthropic: false,
        groq: false,
      };
      (row.enabled_providers ?? []).forEach((p) => {
        en[p as AIProvider] = true;
      });
      en.lovable = true;
      setEnabled(en);
    }
    setLoading(false);
  };

  const loadCredentials = async () => {
    const { data, error } = await supabase
      .from("ai_credentials")
      .select("provider, api_key, updated_at");
    if (error) {
      console.error("loadCredentials error", error);
      return;
    }
    setCredentials((prev) => {
      const next = { ...prev };
      (data ?? []).forEach((row: { provider: string; api_key: string; updated_at: string }) => {
        const p = row.provider as AIProvider;
        if (p in next) {
          next[p] = {
            configured: true,
            preview: `${row.api_key.slice(0, 4)}…${row.api_key.slice(-4)}`,
            updatedAt: row.updated_at,
          };
        }
      });
      return next;
    });
  };

  const handleProviderChange = (p: AIProvider) => {
    setProvider(p);
    const def = getProvider(p)?.models[0]?.value;
    if (def) setModel(def);
  };

  const toggleEnabled = (p: AIProvider, v: boolean) => {
    if (p === "lovable") return;
    setEnabled((s) => ({ ...s, [p]: v }));
  };

  const save = async () => {
    if (!enabled[provider]) {
      toast.error("O provedor selecionado como padrão precisa estar habilitado.");
      return;
    }
    setSaving(true);
    const enabled_providers = (Object.keys(enabled) as AIProvider[]).filter(
      (k) => enabled[k],
    );
    const payload = {
      provider,
      model,
      enabled_providers,
      updated_at: new Date().toISOString(),
    };
    let error;
    if (settings?.id) {
      ({ error } = await supabase
        .from("ai_settings")
        .update(payload)
        .eq("id", settings.id));
    } else {
      ({ error } = await supabase.from("ai_settings").insert(payload));
    }
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar configurações.");
      console.error(error);
    } else {
      toast.success("Configurações salvas!");
      void load();
    }
  };

  const openEditKey = (p: AIProvider) => {
    setEditingProvider(p);
    setEditingKey("");
    setShowKey(false);
  };

  const closeEditKey = () => {
    setEditingProvider(null);
    setEditingKey("");
    setShowKey(false);
    setSavingKey(false);
  };

  const saveKey = async () => {
    if (!editingProvider) return;
    const trimmed = editingKey.trim();
    if (trimmed.length < 8) {
      toast.error("A chave parece muito curta. Verifique e tente novamente.");
      return;
    }
    setSavingKey(true);
    const { error } = await supabase
      .from("ai_credentials")
      .upsert(
        { provider: editingProvider, api_key: trimmed, updated_at: new Date().toISOString() },
        { onConflict: "provider" },
      );
    setSavingKey(false);
    if (error) {
      console.error("saveKey error", error);
      toast.error("Não foi possível salvar a chave. Confira se você é admin.");
      return;
    }
    toast.success(`Chave do ${getProvider(editingProvider)?.label} salva com sucesso.`);
    closeEditKey();
    void loadCredentials();
  };

  const deleteKey = async (p: AIProvider) => {
    if (!confirm(`Remover a chave do ${getProvider(p)?.label}? O provedor deixará de funcionar.`)) {
      return;
    }
    const { error } = await supabase.from("ai_credentials").delete().eq("provider", p);
    if (error) {
      toast.error("Erro ao remover chave.");
      return;
    }
    toast.success("Chave removida.");
    setTests((s) => ({ ...s, [p]: { status: "idle" } }));
    void loadCredentials();
  };

  const copyPreview = async (p: AIProvider) => {
    const preview = credentials[p]?.preview;
    if (!preview) return;
    try {
      await navigator.clipboard.writeText(preview);
      toast.success("Prévia copiada.");
    } catch {
      toast.error("Não foi possível copiar.");
    }
  };

  const testProvider = async (p: AIProvider) => {
    setTests((s) => ({ ...s, [p]: { status: "testing" } }));
    const testModel = providerTestModel[p] ?? getProvider(p)?.models[0]?.value;
    try {
      const { data, error } = await supabase.functions.invoke("test-ai-provider", {
        body: { provider: p, model: testModel },
      });
      if (error) throw error;
      if (data?.ok) {
        setTests((s) => ({
          ...s,
          [p]: {
            status: "ok",
            message: `Conectado · ${testModel}`,
            latency: data.latency_ms,
          },
        }));
        toast.success(`${getProvider(p)?.label}: conexão OK (${data.latency_ms}ms)`);
      } else {
        setTests((s) => ({
          ...s,
          [p]: { status: "error", message: data?.error ?? "Falha" },
        }));
        toast.error(`${getProvider(p)?.label}: ${data?.error ?? "Falha"}`);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro desconhecido";
      setTests((s) => ({ ...s, [p]: { status: "error", message: msg } }));
      toast.error(`Falha ao testar: ${msg}`);
    }
  };

  const currentProvider = getProvider(provider);

  return (
    <AppShell>
      <header className="mb-8 animate-fade-in">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pleno-bg text-gold text-xs font-medium mb-3 border border-gold/30">
          <ShieldCheck className="h-3 w-3" /> Admin · Configuração de IA
        </div>
        <h1 className="font-display text-4xl font-semibold">Configuração de IA</h1>
        <p className="text-muted-foreground mt-1">
          Configure cada provedor, teste a conexão e escolha qual modelo será usado nas avaliações.
        </p>
      </header>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-gold" />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Painel principal: provider + model */}
          <div className="surface-card rounded-xl p-6 lg:col-span-2 space-y-6">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-gold" />
              <h2 className="font-display text-xl font-semibold">Modelo padrão global</h2>
            </div>

            <div className="space-y-2">
              <Label>Provedor de IA</Label>
              <Select
                value={provider}
                onValueChange={(v) => handleProviderChange(v as AIProvider)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AI_PROVIDERS.filter((p) => enabled[p.id]).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Modelo</Label>
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {currentProvider?.models.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      <div className="flex flex-col items-start">
                        <span>{m.label}</span>
                        {m.hint && (
                          <span className="text-[10px] text-muted-foreground">
                            {m.hint}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {currentProvider?.secretName && (
              <div className="flex items-start gap-3 rounded-md bg-surface-elevated border border-gold/20 p-3 text-xs text-body">
                <KeyRound className="h-4 w-4 text-gold shrink-0 mt-0.5" />
                <div>
                  Este provedor usa a chave <code className="text-gold font-mono">{currentProvider.secretName}</code>.
                  Configure-a no card abaixo antes de salvar como padrão.
                </div>
              </div>
            )}

            <Button
              onClick={save}
              disabled={saving}
              className="w-full bg-gradient-gold text-gold-foreground hover:opacity-90 shadow-gold h-11 font-semibold"
            >
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
              Salvar configurações
            </Button>
          </div>

          {/* Status atual */}
          <div className="surface-card rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Cpu className="h-5 w-5 text-gold" />
              <h2 className="font-display text-lg font-semibold">Status atual</h2>
            </div>
            <div className="space-y-3 text-sm">
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                  Provedor ativo
                </div>
                <div className="font-medium">{getProvider(settings?.provider ?? "lovable")?.label}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                  Modelo
                </div>
                <div className="font-mono text-xs bg-surface-elevated rounded px-2 py-1 inline-block">
                  {settings?.model}
                </div>
              </div>
              {settings?.updated_at && (
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                    Última atualização
                  </div>
                  <div className="text-xs">
                    {new Date(settings.updated_at).toLocaleString("pt-BR")}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Cards de provedores */}
          <div className="lg:col-span-3 space-y-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-gold" />
              <h2 className="font-display text-xl font-semibold">Provedores e integrações</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Configure as credenciais, teste a conexão e habilite os provedores que poderão ser usados como padrão global.
            </p>
          </div>

          {AI_PROVIDERS.map((p) => (
            <ProviderCard
              key={p.id}
              provider={p}
              enabled={enabled[p.id]}
              onToggle={(v) => toggleEnabled(p.id, v)}
              testModel={providerTestModel[p.id]}
              onTestModelChange={(v) =>
                setProviderTestModel((s) => ({ ...s, [p.id]: v }))
              }
              onTest={() => testProvider(p.id)}
              testState={tests[p.id]}
              credential={credentials[p.id]}
              onEditKey={() => openEditKey(p.id)}
              onDeleteKey={() => deleteKey(p.id)}
              onCopyPreview={() => copyPreview(p.id)}
            />
          ))}
        </div>
      )}

      {/* Dialog para inserir/atualizar a chave */}
      <Dialog open={editingProvider !== null} onOpenChange={(open) => !open && closeEditKey()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-gold" />
              {editingProvider && credentials[editingProvider]?.configured ? "Atualizar" : "Adicionar"} chave —{" "}
              {editingProvider && getProvider(editingProvider)?.label}
            </DialogTitle>
            <DialogDescription>
              {editingProvider && getProvider(editingProvider)?.apiKeyHint}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {editingProvider && getProvider(editingProvider)?.docsUrl && (
              <a
                href={getProvider(editingProvider)?.docsUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-gold hover:underline"
              >
                Abrir painel de chaves do provedor <ExternalLink className="h-3 w-3" />
              </a>
            )}

            <div className="space-y-2">
              <Label htmlFor="api-key-input">
                Chave de API ({editingProvider && getProvider(editingProvider)?.secretName})
              </Label>
              <div className="relative">
                <Input
                  id="api-key-input"
                  type={showKey ? "text" : "password"}
                  value={editingKey}
                  onChange={(e) => setEditingKey(e.target.value)}
                  placeholder="Cole sua chave aqui..."
                  className="pr-10 font-mono text-sm"
                  autoComplete="off"
                  spellCheck={false}
                />
                <button
                  type="button"
                  onClick={() => setShowKey((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showKey ? "Ocultar" : "Mostrar"}
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                A chave fica criptografada na base e só é acessada pelas funções server-side.
                Apenas administradores podem ler ou alterar.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={closeEditKey} disabled={savingKey}>
              Cancelar
            </Button>
            <Button
              onClick={saveKey}
              disabled={savingKey || editingKey.trim().length < 8}
              className="bg-gradient-gold text-gold-foreground hover:opacity-90 shadow-gold"
            >
              {savingKey ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Salvando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" /> Salvar chave
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
};

interface ProviderCardProps {
  provider: AIProviderInfo;
  enabled: boolean;
  onToggle: (v: boolean) => void;
  testModel: string;
  onTestModelChange: (v: string) => void;
  onTest: () => void;
  testState: TestState;
  credential: { configured: boolean; preview?: string; updatedAt?: string };
  onEditKey: () => void;
  onDeleteKey: () => void;
  onCopyPreview: () => void;
}

const ProviderCard = ({
  provider,
  enabled,
  onToggle,
  testModel,
  onTestModelChange,
  onTest,
  testState,
  credential,
  onEditKey,
  onDeleteKey,
  onCopyPreview,
}: ProviderCardProps) => {
  return (
    <div
      className={cn(
        "surface-card rounded-xl p-6 lg:col-span-3 transition-all",
        enabled ? "border-gold/30" : "opacity-90",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
        <div className="flex-1 min-w-[260px]">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-display text-lg font-semibold">{provider.label}</h3>
            {provider.badge && (
              <span className="rounded-full bg-gradient-gold px-2 py-0.5 text-[10px] font-bold text-gold-foreground">
                {provider.badge}
              </span>
            )}
            {provider.managed ? (
              <span className="rounded-full bg-gold/15 text-gold px-2 py-0.5 text-[10px] font-semibold border border-gold/40">
                Sem chave necessária
              </span>
            ) : credential.configured ? (
              <span className="rounded-full bg-gold/15 text-gold px-2 py-0.5 text-[10px] font-semibold border border-gold/40 inline-flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Chave configurada
              </span>
            ) : (
              <span className="rounded-full bg-destructive/10 text-destructive px-2 py-0.5 text-[10px] font-semibold border border-destructive/30 inline-flex items-center gap-1">
                <AlertCircle className="h-3 w-3" /> Sem chave
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1.5 max-w-2xl">
            {provider.description}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            {enabled ? "Habilitado" : "Desabilitado"}
          </span>
          <Switch
            checked={enabled}
            disabled={provider.id === "lovable"}
            onCheckedChange={onToggle}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Coluna 1: credenciais */}
        <div className="space-y-3">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">
            Credenciais
          </Label>
          {provider.managed ? (
            <div className="rounded-md border border-gold/40 bg-gold/5 p-3 text-xs text-body flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-gold shrink-0 mt-0.5" />
              <span>{provider.apiKeyHint}</span>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="rounded-md bg-surface-elevated border border-sidebar-border p-3 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <code className="text-xs font-mono text-gold">
                    {provider.secretName}
                  </code>
                  {provider.docsUrl && (
                    <a
                      href={provider.docsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-gold hover:underline inline-flex items-center gap-1"
                    >
                      Obter chave <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>

                {credential.configured ? (
                  <div className="flex items-center justify-between gap-2 rounded bg-background/50 border border-gold/20 px-2.5 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <KeyRound className="h-3.5 w-3.5 text-gold shrink-0" />
                      <code className="text-xs font-mono truncate">{credential.preview}</code>
                    </div>
                    <button
                      type="button"
                      onClick={onCopyPreview}
                      className="text-muted-foreground hover:text-foreground"
                      aria-label="Copiar prévia"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {provider.apiKeyHint}
                  </p>
                )}

                <div className="flex flex-wrap gap-2 pt-1">
                  <Button
                    size="sm"
                    onClick={onEditKey}
                    className="h-8 bg-gradient-gold text-gold-foreground hover:opacity-90 shadow-gold flex-1 min-w-[120px]"
                  >
                    {credential.configured ? (
                      <>
                        <Pencil className="h-3.5 w-3.5 mr-1.5" /> Atualizar chave
                      </>
                    ) : (
                      <>
                        <KeyRound className="h-3.5 w-3.5 mr-1.5" /> Adicionar chave
                      </>
                    )}
                  </Button>
                  {credential.configured && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={onDeleteKey}
                      className="h-8 border-destructive/40 text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Remover
                    </Button>
                  )}
                </div>

                {credential.updatedAt && (
                  <p className="text-[10px] text-muted-foreground pt-1">
                    Atualizada em {new Date(credential.updatedAt).toLocaleString("pt-BR")}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Coluna 2: teste de conexão */}
        <div className="space-y-3">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">
            Teste de conexão
          </Label>
          <div className="space-y-2">
            <Select value={testModel} onValueChange={onTestModelChange}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {provider.models.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              onClick={onTest}
              disabled={
                testState.status === "testing" ||
                (!provider.managed && !credential.configured)
              }
              variant="outline"
              className="w-full h-9 border-gold/40 hover:bg-gold/10"
            >
              {testState.status === "testing" ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Testando...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2 text-gold" />
                  Testar conexão
                </>
              )}
            </Button>

            {testState.status === "ok" && (
              <div className="rounded-md border border-gold/40 bg-gold/5 p-2.5 text-xs flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-gold shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium text-gold">Conexão OK</div>
                  <div className="text-muted-foreground text-[11px] mt-0.5">
                    {testState.message}
                    {testState.latency != null && ` · ${testState.latency}ms`}
                  </div>
                </div>
              </div>
            )}

            {testState.status === "error" && (
              <div className="rounded-md border border-destructive/40 bg-destructive/5 p-2.5 text-xs flex items-start gap-2">
                <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium text-destructive">Falhou</div>
                  <div className="text-muted-foreground text-[11px] mt-0.5 break-words">
                    {testState.message}
                  </div>
                </div>
              </div>
            )}

            {testState.status === "idle" && !provider.managed && !credential.configured && (
              <div className="rounded-md border border-sidebar-border bg-surface-elevated/50 p-2.5 text-[11px] text-muted-foreground flex items-start gap-2">
                <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                Adicione a chave acima para liberar o teste.
              </div>
            )}

            {testState.status === "idle" && !provider.managed && credential.configured && (
              <div className="rounded-md border border-sidebar-border bg-surface-elevated/50 p-2.5 text-[11px] text-muted-foreground flex items-start gap-2">
                <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                Pronto para testar. Clique no botão acima.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminIA;
