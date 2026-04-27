import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const CARGO_LABELS: Record<string, string> = {
  gestor_trafego: "Gestor de Tráfego",
  copywriter: "Copywriter",
  designer: "Designer",
  web_designer: "Web Designer",
  desenvolvedor: "Desenvolvedor",
  social_media_manager: "Social Media Manager",
  seo_specialist: "SEO Specialist",
};

const SYSTEM_PROMPT = `Você é um especialista sênior em avaliação de talentos para agências digitais, com mais de 15 anos de experiência em recrutamento, desenvolvimento de equipes de marketing digital, design e tecnologia, e também em avaliação comportamental (DISC, Big Five, entrevistas situacionais STAR).

Sua missão é analisar o perfil profissional de um candidato e determinar com precisão (1) o seu nível de senioridade técnica para o cargo informado e (2) o seu perfil comportamental — caráter, proatividade, capacidade de trabalho em equipe, abertura a feedback e resiliência.

FRAMEWORK DE AVALIAÇÃO — 5 PILARES:

1. PROFUNDIDADE TÉCNICA (peso: 30%) — domínio de ferramentas, métodos e entregas específicas do cargo.
2. ESCOPO DE IMPACTO (peso: 25%) — tamanho dos projetos, orçamentos, times e resultados gerados.
3. PERFIL COMPORTAMENTAL (peso: 20%) — caráter, integridade, proatividade, colaboração, abertura a feedback, resiliência diante de erros e conflitos. Baseie-se principalmente nas RESPOSTAS ÀS PERGUNTAS COMPORTAMENTAIS (questões situacionais e escalas), procurando sinais nas histórias contadas: tomada de iniciativa, responsabilidade pelos próprios erros, postura colaborativa vs. individualista, capacidade de pedir ajuda, reação a divergências. Sinalize red flags (transferir culpa, desvalorizar colegas, descrever erros sem aprendizado, evitar conflitos saudáveis, isolamento).
4. VISÃO ESTRATÉGICA (peso: 15%) — capacidade de conectar execução a objetivos de negócio.
5. LIDERANÇA E AUTONOMIA (peso: 10%) — autogestão, mentoria, capacidade de liderar iniciativas.

CRITÉRIOS DE CLASSIFICAÇÃO DE SENIORIDADE:
- JÚNIOR (0–4.9): Até 2 anos, executa tarefas com supervisão constante.
- PLENO (5.0–7.4): 2 a 5 anos, autônomo em projetos de média complexidade.
- SÊNIOR (7.5–10): +5 anos, lidera projetos complexos, visão estratégica.

REGRAS:
- Avalie com base em evidências, não em suposições.
- Para o pilar comportamental, NUNCA mencione ao candidato/leitor que as perguntas tinham objetivo de avaliar comportamento — apenas analise o conteúdo.
- Identifique gaps reais (técnicos e comportamentais).
- Em "pontosFortesJson" e "gapsIdentificadosJson", inclua observações comportamentais quando relevantes (ex.: "Demonstra forte responsabilidade ao assumir erros", "Sinal de resistência a feedback").
- Sugira perguntas de entrevista específicas, mesclando técnicas e comportamentais de aprofundamento.

Retorne EXCLUSIVAMENTE um JSON válido com a estrutura solicitada via tool/function calling.`;

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    senioridadeDetectada: { type: "string", enum: ["Junior", "Pleno", "Senior"] },
    confidenceScore: { type: "integer", minimum: 0, maximum: 100 },
    analisePilares: {
      type: "object",
      properties: {
        profundidadeTecnica: {
          type: "object",
          properties: { nota: { type: "number" }, justificativa: { type: "string" } },
          required: ["nota", "justificativa"],
        },
        escopoImpacto: {
          type: "object",
          properties: { nota: { type: "number" }, justificativa: { type: "string" } },
          required: ["nota", "justificativa"],
        },
        comportamental: {
          type: "object",
          properties: { nota: { type: "number" }, justificativa: { type: "string" } },
          required: ["nota", "justificativa"],
        },
        visaoEstrategica: {
          type: "object",
          properties: { nota: { type: "number" }, justificativa: { type: "string" } },
          required: ["nota", "justificativa"],
        },
        liderancaAutonomia: {
          type: "object",
          properties: { nota: { type: "number" }, justificativa: { type: "string" } },
          required: ["nota", "justificativa"],
        },
      },
      required: [
        "profundidadeTecnica",
        "escopoImpacto",
        "comportamental",
        "visaoEstrategica",
        "liderancaAutonomia",
      ],
    },
    pontosFortesJson: { type: "array", items: { type: "string" } },
    gapsIdentificadosJson: { type: "array", items: { type: "string" } },
    perguntasEntrevistaJson: { type: "array", items: { type: "string" } },
    resumoExecutivo: { type: "string" },
  },
  required: [
    "senioridadeDetectada",
    "confidenceScore",
    "analisePilares",
    "pontosFortesJson",
    "gapsIdentificadosJson",
    "perguntasEntrevistaJson",
    "resumoExecutivo",
  ],
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ---------- Provider adapters ----------

const PROVIDER_TO_SECRET: Record<string, string> = {
  lovable: "LOVABLE_API_KEY",
  openai: "OPENAI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
  groq: "GROQ_API_KEY",
};

async function loadKey(provider: string): Promise<string> {
  // 1. Try DB-stored credential first (admin-managed)
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

  // 2. Fallback to env (for managed LOVABLE_API_KEY)
  const envName = PROVIDER_TO_SECRET[provider];
  const env = envName ? Deno.env.get(envName) : null;
  if (env) return env;

  throw new Error(
    `Chave do provedor ${provider} não configurada. Adicione-a no painel de Configuração de IA.`,
  );
}

async function callLovable(model: string, userPrompt: string) {
  const key = await loadKey("lovable");
  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "submit_assessment",
            description: "Submete a avaliação estruturada do candidato.",
            parameters: RESPONSE_SCHEMA,
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "submit_assessment" } },
    }),
  });
  return parseOpenAIToolCall(resp);
}

async function callOpenAI(model: string, userPrompt: string) {
  const key = await loadKey("openai");
  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "submit_assessment",
            description: "Submete a avaliação estruturada do candidato.",
            parameters: RESPONSE_SCHEMA,
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "submit_assessment" } },
    }),
  });
  return parseOpenAIToolCall(resp);
}

async function callGroq(model: string, userPrompt: string) {
  const key = await loadKey("groq");
  const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "submit_assessment",
            description: "Submete a avaliação estruturada do candidato.",
            parameters: RESPONSE_SCHEMA,
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "submit_assessment" } },
    }),
  });
  return parseOpenAIToolCall(resp);
}

async function callAnthropic(model: string, userPrompt: string) {
  const key = await loadKey("anthropic");
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools: [
        {
          name: "submit_assessment",
          description: "Submete a avaliação estruturada do candidato.",
          input_schema: RESPONSE_SCHEMA,
        },
      ],
      tool_choice: { type: "tool", name: "submit_assessment" },
      messages: [{ role: "user", content: userPrompt }],
    }),
  });
  if (!resp.ok) {
    const txt = await resp.text();
    throw new ProviderError(resp.status, txt);
  }
  const data = await resp.json();
  const block = data.content?.find((c: any) => c.type === "tool_use");
  if (!block?.input) throw new Error("Resposta inválida do Anthropic.");
  return block.input;
}

class ProviderError extends Error {
  status: number;
  body: string;
  constructor(status: number, body: string) {
    super(`Provider HTTP ${status}: ${body}`);
    this.status = status;
    this.body = body;
  }
}

async function parseOpenAIToolCall(resp: Response) {
  if (!resp.ok) {
    const txt = await resp.text();
    throw new ProviderError(resp.status, txt);
  }
  const data = await resp.json();
  const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!args) {
    console.error("Sem tool_calls", JSON.stringify(data));
    throw new Error("Resposta da IA sem tool call.");
  }
  return typeof args === "string" ? JSON.parse(args) : args;
}

// ---------- Main ----------

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Missing authorization" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) return jsonResponse({ error: "Unauthorized" }, 401);

    // Apenas admin, líder ou recrutador podem executar avaliações de IA.
    // Colaboradores (time) enviam autoavaliação via outro fluxo; candidatos públicos não rodam IA.
    const { data: rolesRows, error: rolesErr } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id);
    if (rolesErr) {
      console.error("roles read error", rolesErr);
      return jsonResponse({ error: "Falha ao validar permissões." }, 500);
    }
    const userRoles = (rolesRows ?? []).map((r: { role: string }) => r.role);
    const canRunAssessment =
      userRoles.includes("admin") ||
      userRoles.includes("lider") ||
      userRoles.includes("recrutador");
    if (!canRunAssessment) {
      return jsonResponse(
        {
          error:
            "Você não tem permissão para executar avaliações. Apenas administradores, líderes e recrutadores podem rodar a IA.",
        },
        403,
      );
    }

    const body = await req.json();
    const {
      candidateId,
      nome: nomeIn,
      cargo: cargoIn,
      dadosProfissionais: dadosIn,
      informacoesAdicionais: infoIn,
      candidaturaId,
      origem,
    } = body ?? {};

    let nome: string;
    let cargo: string;
    let dadosProfissionais: string;
    let informacoesAdicionais: string | null;
    let origemValue: string;
    let existingCandidate: { id: string } | null = null;

    if (typeof candidateId === "string" && candidateId.length > 0) {
      // Reavaliação: carrega dados do candidato existente
      const { data: existing, error: exErr } = await supabase
        .from("candidates")
        .select("id, nome, cargo, dados_profissionais, informacoes_adicionais, origem")
        .eq("id", candidateId)
        .maybeSingle();
      if (exErr || !existing) {
        return jsonResponse({ error: "Candidato não encontrado." }, 404);
      }
      existingCandidate = { id: existing.id };
      nome = existing.nome;
      cargo = existing.cargo;
      dadosProfissionais = existing.dados_profissionais;
      informacoesAdicionais = existing.informacoes_adicionais;
      origemValue = existing.origem;
    } else {
      if (
        typeof nomeIn !== "string" ||
        nomeIn.trim().length < 2 ||
        typeof cargoIn !== "string" ||
        !CARGO_LABELS[cargoIn] ||
        typeof dadosIn !== "string" ||
        dadosIn.trim().length < 50
      ) {
        return jsonResponse({ error: "Dados de entrada inválidos." }, 400);
      }
      nome = nomeIn;
      cargo = cargoIn;
      dadosProfissionais = dadosIn;
      informacoesAdicionais = (typeof infoIn === "string" && infoIn) || null;
      origemValue = origem === "time" ? "time" : "candidato";
    }

    if (!CARGO_LABELS[cargo]) {
      return jsonResponse({ error: "Cargo inválido no candidato." }, 400);
    }

    // Load AI settings
    const { data: settings, error: settingsErr } = await supabase
      .from("ai_settings")
      .select("provider, model")
      .eq("is_active", true)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (settingsErr) console.warn("ai_settings read error", settingsErr);

    const provider = (settings?.provider as string) || "lovable";
    const model = (settings?.model as string) || "google/gemini-2.5-flash";

    const cargoLabel = CARGO_LABELS[cargo];

    // Carrega respostas do candidato (apenas perguntas marcadas para IA)
    let respostasBlock = "";
    if (candidaturaId) {
      const { data: respostas } = await supabase
        .from("candidatura_respostas")
        .select(
          "resposta_texto, resposta_numero, vaga_perguntas(texto, tipo, ordem, usar_na_ia)",
        )
        .eq("candidatura_id", candidaturaId);
      const filtered = (respostas ?? [])
        .filter((r: any) => r.vaga_perguntas?.usar_na_ia)
        .sort(
          (a: any, b: any) =>
            (a.vaga_perguntas?.ordem ?? 0) - (b.vaga_perguntas?.ordem ?? 0),
        );
      if (filtered.length > 0) {
        const lines = filtered.map((r: any) => {
          const q = r.vaga_perguntas?.texto ?? "Pergunta";
          const ans =
            r.vaga_perguntas?.tipo === "escala"
              ? `${r.resposta_numero}/5`
              : (r.resposta_texto ?? "(sem resposta)");
          return `- ${q}\n  R: ${ans}`;
        });
        respostasBlock = `\n\nRESPOSTAS DO CANDIDATO ÀS PERGUNTAS DA VAGA:\n${lines.join("\n")}`;
      }
    }

    const userPrompt = `Cargo avaliado: ${cargoLabel}
Nome do candidato: ${nome}

DADOS PROFISSIONAIS:
${dadosProfissionais}

${informacoesAdicionais ? `INFORMAÇÕES ADICIONAIS:\n${informacoesAdicionais}` : ""}${respostasBlock}

Analise este perfil e retorne o JSON de avaliação conforme as instruções.`;

    let parsed: any;
    try {
      if (provider === "openai") parsed = await callOpenAI(model, userPrompt);
      else if (provider === "anthropic") parsed = await callAnthropic(model, userPrompt);
      else if (provider === "groq") parsed = await callGroq(model, userPrompt);
      else parsed = await callLovable(model, userPrompt);
    } catch (e) {
      if (e instanceof ProviderError) {
        if (e.status === 429) {
          return jsonResponse(
            { error: "Limite de requisições atingido. Tente novamente em instantes." },
            429,
          );
        }
        if (e.status === 402) {
          return jsonResponse(
            { error: "Créditos de IA insuficientes. Recarregue no workspace Lovable." },
            402,
          );
        }
        if (e.status === 401 || e.status === 403) {
          return jsonResponse(
            { error: `Credenciais do provedor ${provider} inválidas. Atualize a chave.` },
            500,
          );
        }
        console.error("Provider error", e.status, e.body);
        return jsonResponse({ error: `Falha ao consultar a IA (${provider}).` }, 500);
      }
      console.error("AI call failed", e);
      return jsonResponse(
        { error: e instanceof Error ? e.message : "Falha ao consultar a IA." },
        500,
      );
    }

    const pilares = parsed.analisePilares;
    const notaPonderada =
      pilares.profundidadeTecnica.nota * 0.35 +
      pilares.escopoImpacto.nota * 0.3 +
      pilares.visaoEstrategica.nota * 0.2 +
      pilares.liderancaAutonomia.nota * 0.15;

    let candidate: { id: string; nome: string; cargo: string; origem: string };
    if (existingCandidate) {
      const { data: c, error: cErr } = await supabase
        .from("candidates")
        .select("id, nome, cargo, origem")
        .eq("id", existingCandidate.id)
        .single();
      if (cErr || !c) {
        console.error("Erro recarregando candidato", cErr);
        return jsonResponse({ error: "Erro ao carregar candidato." }, 500);
      }
      candidate = c;
    } else {
      const { data: c, error: candErr } = await supabase
        .from("candidates")
        .insert({
          nome,
          cargo,
          dados_profissionais: dadosProfissionais,
          informacoes_adicionais: informacoesAdicionais || null,
          created_by: userData.user.id,
          origem: origemValue,
        })
        .select("id, nome, cargo, origem")
        .single();
      if (candErr || !c) {
        console.error("Erro inserindo candidato", candErr);
        return jsonResponse({ error: "Erro ao salvar candidato." }, 500);
      }
      candidate = c;
    }

    const { data: assessment, error: assErr } = await supabase
      .from("assessments")
      .insert({
        candidate_id: candidate.id,
        senioridade_detectada: parsed.senioridadeDetectada,
        confidence_score: parsed.confidenceScore,
        nota_ponderada: Number(notaPonderada.toFixed(2)),
        analise_pilares: pilares,
        pontos_fortes: parsed.pontosFortesJson,
        gaps_identificados: parsed.gapsIdentificadosJson,
        perguntas_entrevista: parsed.perguntasEntrevistaJson,
        resumo_executivo: parsed.resumoExecutivo,
        model_used: `${provider}:${model}`,
      })
      .select()
      .single();

    if (assErr || !assessment) {
      console.error("Erro inserindo assessment", assErr);
      return jsonResponse({ error: "Erro ao salvar avaliação." }, 500);
    }

    // Link to candidatura if provided
    if (candidaturaId) {
      await supabase
        .from("candidaturas")
        .update({ candidate_id: candidate.id, status: "avaliado" })
        .eq("id", candidaturaId);
    }

    return jsonResponse({ candidate, assessment });
  } catch (err) {
    console.error("Unhandled error", err);
    return jsonResponse({ error: "Erro interno." }, 500);
  }
});
