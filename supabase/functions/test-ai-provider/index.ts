import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type Provider = "lovable" | "openai" | "anthropic" | "groq";

interface TestRequest {
  provider: Provider;
  model: string;
}

const TEST_PROMPT = "Reply with the single word: pong";

async function testLovable(model: string) {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) throw new Error("LOVABLE_API_KEY não configurada no backend.");
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

async function testOpenAI(model: string) {
  const key = Deno.env.get("OPENAI_API_KEY");
  if (!key) throw new Error("OPENAI_API_KEY não configurada. Adicione a chave nas configurações.");
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

async function testAnthropic(model: string) {
  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!key) throw new Error("ANTHROPIC_API_KEY não configurada. Adicione a chave nas configurações.");
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

async function testGroq(model: string) {
  const key = Deno.env.get("GROQ_API_KEY");
  if (!key) throw new Error("GROQ_API_KEY não configurada. Adicione a chave nas configurações.");
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
        result = await testLovable(body.model);
        break;
      case "openai":
        result = await testOpenAI(body.model);
        break;
      case "anthropic":
        result = await testAnthropic(body.model);
        break;
      case "groq":
        result = await testGroq(body.model);
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
      status: 200, // 200 para o cliente sempre poder ler o JSON
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
