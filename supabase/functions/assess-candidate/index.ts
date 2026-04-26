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

const SYSTEM_PROMPT = `Você é um especialista sênior em avaliação de talentos para agências digitais, com mais de 15 anos de experiência em recrutamento e desenvolvimento de equipes de marketing digital, design e tecnologia.

Sua missão é analisar o perfil profissional de um candidato e determinar com precisão e confiança o seu nível de senioridade para o cargo informado.

FRAMEWORK DE AVALIAÇÃO — 4 PILARES:

1. PROFUNDIDADE TÉCNICA (peso: 35%)
   - Domínio das ferramentas e plataformas específicas do cargo
   - Qualidade técnica e precisão na execução
   - Capacidade de resolver problemas complexos da área
   - Atualização com tendências e melhores práticas

2. ESCOPO DE IMPACTO (peso: 30%)
   - Tamanho e complexidade dos projetos gerenciados
   - Resultados mensuráveis e métricas alcançadas
   - Alcance do trabalho (individual, equipe, empresa, mercado)
   - Responsabilidade sobre orçamentos, clientes ou entregas críticas

3. VISÃO ESTRATÉGICA (peso: 20%)
   - Capacidade de pensar além da execução tática
   - Contribuição para decisões de negócio e estratégia
   - Visão de produto, cliente ou mercado
   - Capacidade de propor soluções e não apenas executar tarefas

4. LIDERANÇA E AUTONOMIA (peso: 15%)
   - Nível de supervisão necessária para executar
   - Capacidade de mentorear ou orientar outros
   - Iniciativa e proatividade na resolução de problemas
   - Gestão de stakeholders e comunicação

CRITÉRIOS DE CLASSIFICAÇÃO:

JÚNIOR (nota ponderada 0–4.9):
- Até 2 anos de experiência prática
- Executa tarefas bem definidas com supervisão constante
- Domínio básico das ferramentas principais
- Resultados limitados ao escopo individual

PLENO (nota ponderada 5.0–7.4):
- 2 a 5 anos de experiência sólida
- Executa com autonomia projetos de média complexidade
- Domínio avançado das ferramentas e boas práticas
- Começa a influenciar decisões e orientar juniores

SÊNIOR (nota ponderada 7.5–10):
- Mais de 5 anos com histórico comprovado de resultados
- Lidera projetos complexos e equipes
- Visão estratégica e capacidade de impactar o negócio
- Referência técnica e mentora outros profissionais

INSTRUÇÕES:
- Avalie com base nas evidências fornecidas, não em suposições
- Seja criterioso: não promova candidatos sem evidências sólidas
- Considere o contexto do cargo específico
- Identifique gaps reais que impedem a progressão de nível
- Sugira perguntas de entrevista específicas para validar o nível detectado

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
          properties: {
            nota: { type: "number" },
            justificativa: { type: "string" },
          },
          required: ["nota", "justificativa"],
          additionalProperties: false,
        },
        escopoImpacto: {
          type: "object",
          properties: {
            nota: { type: "number" },
            justificativa: { type: "string" },
          },
          required: ["nota", "justificativa"],
          additionalProperties: false,
        },
        visaoEstrategica: {
          type: "object",
          properties: {
            nota: { type: "number" },
            justificativa: { type: "string" },
          },
          required: ["nota", "justificativa"],
          additionalProperties: false,
        },
        liderancaAutonomia: {
          type: "object",
          properties: {
            nota: { type: "number" },
            justificativa: { type: "string" },
          },
          required: ["nota", "justificativa"],
          additionalProperties: false,
        },
      },
      required: [
        "profundidadeTecnica",
        "escopoImpacto",
        "visaoEstrategica",
        "liderancaAutonomia",
      ],
      additionalProperties: false,
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
  additionalProperties: false,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { nome, cargo, dadosProfissionais, informacoesAdicionais } = body ?? {};

    if (
      typeof nome !== "string" ||
      nome.trim().length < 2 ||
      typeof cargo !== "string" ||
      !CARGO_LABELS[cargo] ||
      typeof dadosProfissionais !== "string" ||
      dadosProfissionais.trim().length < 50
    ) {
      return new Response(
        JSON.stringify({ error: "Dados de entrada inválidos." }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const cargoLabel = CARGO_LABELS[cargo];
    const userPrompt = `Cargo avaliado: ${cargoLabel}
Nome do candidato: ${nome}

DADOS PROFISSIONAIS:
${dadosProfissionais}

${
      informacoesAdicionais
        ? `INFORMAÇÕES ADICIONAIS:\n${informacoesAdicionais}`
        : ""
    }

Analise este perfil e retorne o JSON de avaliação conforme as instruções.`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AI gateway não configurado." }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const model = "google/gemini-2.5-flash";
    const aiResp = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
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
          tool_choice: {
            type: "function",
            function: { name: "submit_assessment" },
          },
        }),
      },
    );

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      console.error("AI gateway error", aiResp.status, errText);
      if (aiResp.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições atingido. Tente novamente em instantes." }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      if (aiResp.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos de IA insuficientes. Recarregue no workspace Lovable." }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      return new Response(
        JSON.stringify({ error: "Falha ao consultar a IA." }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const aiJson = await aiResp.json();
    const toolCall =
      aiJson.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!toolCall) {
      console.error("Resposta sem tool_call", JSON.stringify(aiJson));
      return new Response(
        JSON.stringify({ error: "Resposta inválida da IA." }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    let parsed: any;
    try {
      parsed = JSON.parse(toolCall);
    } catch (_e) {
      return new Response(
        JSON.stringify({ error: "JSON inválido retornado pela IA." }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const pilares = parsed.analisePilares;
    const notaPonderada =
      pilares.profundidadeTecnica.nota * 0.35 +
      pilares.escopoImpacto.nota * 0.3 +
      pilares.visaoEstrategica.nota * 0.2 +
      pilares.liderancaAutonomia.nota * 0.15;

    // Insert candidate
    const { data: candidate, error: candErr } = await supabase
      .from("candidates")
      .insert({
        nome,
        cargo,
        dados_profissionais: dadosProfissionais,
        informacoes_adicionais: informacoesAdicionais || null,
        created_by: userData.user.id,
      })
      .select()
      .single();

    if (candErr || !candidate) {
      console.error("Erro inserindo candidato", candErr);
      return new Response(
        JSON.stringify({ error: "Erro ao salvar candidato." }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
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
        model_used: model,
      })
      .select()
      .single();

    if (assErr || !assessment) {
      console.error("Erro inserindo assessment", assErr);
      return new Response(
        JSON.stringify({ error: "Erro ao salvar avaliação." }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({ candidate, assessment }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("Unhandled error", err);
    return new Response(
      JSON.stringify({ error: "Erro interno." }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
