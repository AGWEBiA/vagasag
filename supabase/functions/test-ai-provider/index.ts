import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type Provider = "lovable" | "openai" | "anthropic" | "groq";

interface TestRequest {
  provider: Provider;
  model: string;
  // Optional override: if present, use this key (for the "test before save" flow)
  apiKeyOverride?: string;
}

const TEST_PROMPT = "Reply with the single word: pong";

const PROVIDER_TO_SECRET: Record<Provider, string> = {
  lovable: "LOVABLE_API_KEY",
  openai: "OPENAI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
  groq: "GROQ_API_KEY",
};

async function loadKey(provider: Provider, override?: string): Promise<string> {
  if (override && override.trim().length > 0) return override.trim();

  // 1. Try DB-stored credential first
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  if (supabaseUrl && serviceKey) {
    const admin = createClient(supabaseUrl, serviceKey);
    const { data } = await admin
      .from("ai_credentials")
      .select("api_key")
      .eq("provider", provider)
      .maybeSingle();
    if (data?.api_key) return data.api_key;
  }

  // 2. Fallback to env (for LOVABLE_API_KEY mainly)
  const env = Deno.env.get(PROVIDER_TO_SECRET[provider]);
  if (env) return env;

  throw new Error(
    `Chave do provedor ${provider} não configurada. Adicione-a no painel de Configuração de IA.`,
  );
}

async function testLovable(model: string, override?: string) {
  const key = await loadKey("lovable", override);
  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: TEST_PROMPT }],
      max_tokens: 10,
    }),
  });
  return await parseResponse(r, "Lovable AI Gateway");
}

async function testOpenAI(model: string, override?: string) {
  const key = await loadKey("openai", override);
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: TEST_PROMPT }],
      max_completion_tokens: 10,
    }),
  });
  return await parseResponse(r, "OpenAI");
}

async function testAnthropic(model: string, override?: string) {
  const key = await loadKey("anthropic", override);
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 10,
      messages: [{ role: "user", content: TEST_PROMPT }],
    }),
  });
  return await parseResponse(r, "Anthropic");
}

async function testGroq(model: string, override?: string) {
  const key = await loadKey("groq", override);
  const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: TEST_PROMPT }],
      max_tokens: 10,
    }),
  });
  return await parseResponse(r, "Groq");
}

async function parseResponse(r: Response, label: string) {
  const text = await r.text();
  if (!r.ok) {
    throw new Error(`${label} respondeu ${r.status}: ${text.slice(0, 280)}`);
  }
  return { ok: true, label, status: r.status, sample: text.slice(0, 200) };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = (await req.json()) as TestRequest;
    if (!body?.provider || !body?.model) {
      return new Response(JSON.stringify({ error: "provider e model são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const start = Date.now();
    let result;
    switch (body.provider) {
      case "lovable":
        result = await testLovable(body.model, body.apiKeyOverride);
        break;
      case "openai":
        result = await testOpenAI(body.model, body.apiKeyOverride);
        break;
      case "anthropic":
        result = await testAnthropic(body.model, body.apiKeyOverride);
        break;
      case "groq":
        result = await testGroq(body.model, body.apiKeyOverride);
        break;
      default:
        throw new Error(`Provedor desconhecido: ${body.provider}`);
    }
    const latency_ms = Date.now() - start;

    return new Response(
      JSON.stringify({ ok: true, latency_ms, ...result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro desconhecido";
    console.error("test-ai-provider error:", message);
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
