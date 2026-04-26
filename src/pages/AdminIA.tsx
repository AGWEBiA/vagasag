import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Cpu,
  ShieldCheck,
  Sparkles,
  Loader2,
  KeyRound,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AI_PROVIDERS, AIProvider, getProvider } from "@/lib/aiProviders";
import { cn } from "@/lib/utils";

interface AISettingsRow {
  id: string;
  provider: string;
  model: string;
  enabled_providers: string[];
  updated_at: string;
}

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

  useEffect(() => {
    document.title = "Configuração de IA | Seniority Hub";
    void load();
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
      en.lovable = true; // sempre ativo
      setEnabled(en);
    }
    setLoading(false);
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

  const currentProvider = getProvider(provider);

  return (
    <AppShell>
      <header className="mb-8 animate-fade-in">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pleno-bg text-gold text-xs font-medium mb-3 border border-gold/30">
          <ShieldCheck className="h-3 w-3" /> Admin · Configuração de IA
        </div>
        <h1 className="font-display text-4xl font-semibold">Configuração de IA</h1>
        <p className="text-muted-foreground mt-1">
          Escolha qual provedor e modelo serão usados pelo sistema para avaliar candidatos.
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
                  Verifique se ela foi adicionada nas configurações de Backend.
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

          {/* Status da última atualização */}
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

          {/* Habilitar provedores */}
          <div className="surface-card rounded-xl p-6 lg:col-span-3 space-y-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-gold" />
              <h2 className="font-display text-xl font-semibold">Provedores habilitados</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Habilite quais provedores podem ser escolhidos como modelo padrão.
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              {AI_PROVIDERS.map((p) => (
                <div
                  key={p.id}
                  className={cn(
                    "rounded-lg border p-4 transition-all",
                    enabled[p.id]
                      ? "border-gold/40 bg-pleno-bg/30"
                      : "border-sidebar-border bg-surface-elevated",
                  )}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{p.label}</h3>
                        {p.badge && (
                          <span className="rounded-full bg-gradient-gold px-2 py-0.5 text-[10px] font-bold text-gold-foreground">
                            {p.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {p.description}
                      </p>
                    </div>
                    <Switch
                      checked={enabled[p.id]}
                      disabled={p.id === "lovable"}
                      onCheckedChange={(v) => toggleEnabled(p.id, v)}
                    />
                  </div>
                  {p.secretName && (
                    <div className="text-[11px] flex items-center gap-1.5 mt-2 text-muted-foreground">
                      <AlertCircle className="h-3 w-3" />
                      Requer secret <code className="text-gold">{p.secretName}</code>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
};

export default AdminIA;
