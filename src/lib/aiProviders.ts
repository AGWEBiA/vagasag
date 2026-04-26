export type AIProvider = "lovable" | "openai" | "anthropic" | "groq";

export interface AIProviderInfo {
  id: AIProvider;
  label: string;
  description: string;
  secretName?: string; // null for lovable (managed)
  models: { value: string; label: string; hint?: string }[];
  badge?: string;
}

export const AI_PROVIDERS: AIProviderInfo[] = [
  {
    id: "lovable",
    label: "Lovable AI Gateway",
    description:
      "Provedor padrão, sem chave de API. Acesso aos modelos Google Gemini e OpenAI GPT-5 já incluso no workspace.",
    badge: "Recomendado",
    models: [
      { value: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash", hint: "Rápido e equilibrado" },
      { value: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro", hint: "Máxima profundidade" },
      { value: "google/gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite", hint: "Ultra econômico" },
      { value: "openai/gpt-5", label: "GPT-5", hint: "Top em raciocínio" },
      { value: "openai/gpt-5-mini", label: "GPT-5 Mini", hint: "Custo/benefício" },
      { value: "openai/gpt-5-nano", label: "GPT-5 Nano", hint: "Mais rápido" },
    ],
  },
  {
    id: "openai",
    label: "OpenAI (chave própria)",
    description:
      "Use sua chave da OpenAI para acessar GPT-4o, o1 e modelos avançados com cobrança direta.",
    secretName: "OPENAI_API_KEY",
    models: [
      { value: "gpt-4o", label: "GPT-4o" },
      { value: "gpt-4o-mini", label: "GPT-4o Mini" },
      { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
      { value: "o1-preview", label: "o1 Preview" },
      { value: "o1-mini", label: "o1 Mini" },
    ],
  },
  {
    id: "anthropic",
    label: "Anthropic Claude",
    description:
      "Excelente para análise textual longa, nuances e perfis com contexto extenso.",
    secretName: "ANTHROPIC_API_KEY",
    models: [
      { value: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet" },
      { value: "claude-3-5-haiku-20241022", label: "Claude 3.5 Haiku" },
      { value: "claude-3-opus-20240229", label: "Claude 3 Opus" },
    ],
  },
  {
    id: "groq",
    label: "Groq",
    description:
      "Inferência ultra-rápida com Llama 3.1 e Mixtral — ótimo para avaliações em massa.",
    secretName: "GROQ_API_KEY",
    models: [
      { value: "llama-3.3-70b-versatile", label: "Llama 3.3 70B" },
      { value: "llama-3.1-70b-versatile", label: "Llama 3.1 70B" },
      { value: "mixtral-8x7b-32768", label: "Mixtral 8x7B" },
    ],
  },
];

export function getProvider(id: string): AIProviderInfo | undefined {
  return AI_PROVIDERS.find((p) => p.id === id);
}
