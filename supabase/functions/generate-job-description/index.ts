import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { titulo, cargo, modalidade, informacoesAdicionais } = await req.json();

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get AI settings
    const { data: aiSettings } = await supabaseAdmin
      .from("ai_settings")
      .select("*")
      .maybeSingle();

    const provider = aiSettings?.provider || "lovable";
    const model = aiSettings?.model || "google/gemini-2.0-flash-exp";

    const prompt = `Atue como um recrutador tech expert. Escreva uma descrição de vaga atraente e profissional para o cargo de "${titulo}" na modalidade "${modalidade}".
${cargo ? `Área de atuação: ${cargo}.` : ""}
${informacoesAdicionais ? `Informações adicionais do cliente: ${informacoesAdicionais}.` : ""}

Estruture a descrição OBRIGATORIAMENTE usando as seguintes tags HTML:
- Use <h2> para os títulos das seções.
- Use <p> para parágrafos.
- Use <ul> e <li> para listas de requisitos e benefícios.

Seções desejadas:
1. Sobre a oportunidade (Destaque a cultura e o desafio)
2. Responsabilidades e Atribuições (O que a pessoa fará no dia a dia)
3. Requisitos e Qualificações (Hard skills e Soft skills)
4. Benefícios

Responda APENAS o HTML da descrição, sem conversas paralelas ou Markdown code blocks.`;

    // Call AI Gateway
    const response = await supabaseAdmin.functions.invoke("ai-gateway", {
      body: {
        provider,
        model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
      },
    });

    if (response.error) throw response.error;

    const content = response.data?.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
