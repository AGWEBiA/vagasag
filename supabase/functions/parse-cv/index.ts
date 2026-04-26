// Edge function: parse-cv
// Recebe um currículo (texto puro OU PDF/imagem em base64) e retorna campos
// estruturados (nome, email, telefone, linkedin, portfolio, dados_profissionais
// resumidos, skills, anos de experiência aproximados) usando Lovable AI.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Você é um parser de currículos para um ATS brasileiro.
Receberá o conteúdo de um CV (texto e/ou arquivo). Extraia os campos solicitados de forma OBJETIVA, em português.

Regras:
- Se um campo não estiver presente, retorne string vazia ou array vazio.
- "dados_profissionais" deve ser um RESUMO bem estruturado (300-1500 chars) listando experiências mais relevantes: empresa, cargo, período, principais responsabilidades e resultados quantificáveis quando houver. Use quebras de linha. Não invente nada.
- "skills" deve conter habilidades técnicas e ferramentas mencionadas (máx 20).
- "anos_experiencia" é uma estimativa em anos (número inteiro) baseado no histórico — 0 se não der para inferir.
- Para LinkedIn e portfólio, retorne URLs completas quando possível.`;

interface ParseInput {
  text?: string;
  fileBase64?: string;
  mimeType?: string;
  fileName?: string;
}

const parseSchema = {
  name: "extract_cv_fields",
  description: "Extrai campos estruturados de um currículo",
  parameters: {
    type: "object",
    properties: {
      nome: { type: "string", description: "Nome completo do candidato" },
      email: { type: "string", description: "E-mail principal" },
      telefone: { type: "string", description: "Telefone com DDD" },
      linkedin: { type: "string", description: "URL completa do LinkedIn" },
      portfolio: {
        type: "string",
        description: "URL de portfólio/site/GitHub",
      },
      dados_profissionais: {
        type: "string",
        description:
          "Resumo estruturado da experiência profissional (300-1500 chars)",
      },
      skills: {
        type: "array",
        items: { type: "string" },
        description: "Lista de habilidades/tecnologias mencionadas",
      },
      anos_experiencia: {
        type: "integer",
        description: "Anos totais de experiência estimados",
      },
      idiomas: {
        type: "array",
        items: { type: "string" },
        description: "Idiomas com nível, ex: 'Inglês - avançado'",
      },
      formacao: {
        type: "string",
        description: "Resumo curto da formação acadêmica",
      },
    },
    required: [
      "nome",
      "email",
      "telefone",
      "linkedin",
      "portfolio",
      "dados_profissionais",
      "skills",
      "anos_experiencia",
      "idiomas",
      "formacao",
    ],
    additionalProperties: false,
  },
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY não configurado" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const body = (await req.json()) as ParseInput;
    const text = (body.text ?? "").trim();
    const fileBase64 = body.fileBase64;
    const mimeType = body.mimeType ?? "application/pdf";

    if (!text && !fileBase64) {
      return new Response(
        JSON.stringify({ error: "Envie 'text' ou 'fileBase64'." }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Limite simples: 8MB no base64
    if (fileBase64 && fileBase64.length > 8 * 1024 * 1024 * 1.4) {
      return new Response(
        JSON.stringify({ error: "Arquivo muito grande (máx ~6MB)." }),
        {
          status: 413,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const userContent: Array<Record<string, unknown>> = [];
    if (text) {
      userContent.push({
        type: "text",
        text: `Conteúdo do currículo (texto):\n\n${text.slice(0, 30000)}`,
      });
    }
    if (fileBase64) {
      // Lovable AI Gateway aceita imagens via image_url. Para PDFs, Gemini suporta
      // application/pdf via image_url com data URI.
      userContent.push({
        type: "image_url",
        image_url: {
          url: `data:${mimeType};base64,${fileBase64}`,
        },
      });
      if (!text) {
        userContent.push({
          type: "text",
          text: "Extraia os campos do currículo em anexo.",
        });
      }
    }

    const aiResp = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userContent },
          ],
          tools: [{ type: "function", function: parseSchema }],
          tool_choice: {
            type: "function",
            function: { name: "extract_cv_fields" },
          },
        }),
      },
    );

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      console.error("AI gateway error:", aiResp.status, errText);
      if (aiResp.status === 429) {
        return new Response(
          JSON.stringify({
            error: "Limite de uso atingido. Tente novamente em instantes.",
          }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      if (aiResp.status === 402) {
        return new Response(
          JSON.stringify({
            error:
              "Créditos de IA esgotados. Adicione créditos em Settings > Workspace > Usage.",
          }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      return new Response(
        JSON.stringify({ error: "Falha ao consultar IA." }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const data = await aiResp.json();
    const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
    const argsStr = toolCall?.function?.arguments;
    if (!argsStr) {
      console.error("Sem tool_call no retorno:", JSON.stringify(data));
      return new Response(
        JSON.stringify({ error: "IA não retornou estrutura esperada." }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(argsStr);
    } catch (e) {
      console.error("JSON inválido:", argsStr);
      return new Response(
        JSON.stringify({ error: "Resposta da IA inválida." }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(JSON.stringify({ fields: parsed }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("parse-cv error:", err);
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
