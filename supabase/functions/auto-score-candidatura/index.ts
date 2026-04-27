import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * auto-score-candidatura
 * Dispara avaliação por IA quando uma candidatura entra em um estágio
 * com `auto_score_ativo = true`. Idempotente: só roda se não houver
 * assessment recente para o candidato.
 *
 * Body: { candidaturaId: string, estagioId: string }
 * Auth: JWT obrigatório (mesmo recrutador que mudou o estágio chama via UI),
 * mas internamente usa service role para chamar assess-candidate em nome
 * do criador da vaga.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Missing authorization" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseUser = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await supabaseUser.auth.getUser();
    if (userErr || !userData.user) return jsonResponse({ error: "Unauthorized" }, 401);

    const body = await req.json();
    const { candidaturaId, estagioId } = body ?? {};
    if (!candidaturaId || !estagioId) {
      return jsonResponse({ error: "candidaturaId e estagioId são obrigatórios" }, 400);
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // 1. Verifica se o estágio tem auto-score ativo
    const { data: estagio, error: estErr } = await admin
      .from("pipeline_estagios")
      .select("id, nome, auto_score_ativo")
      .eq("id", estagioId)
      .maybeSingle();

    if (estErr || !estagio) {
      return jsonResponse({ error: "Estágio não encontrado" }, 404);
    }

    if (!estagio.auto_score_ativo) {
      return jsonResponse({ skipped: true, reason: "auto_score_inativo" });
    }

    // 2. Carrega candidatura
    const { data: cand, error: candErr } = await admin
      .from("candidaturas")
      .select("id, nome, email, dados_profissionais, informacoes_adicionais, candidate_id, vaga_id")
      .eq("id", candidaturaId)
      .maybeSingle();

    if (candErr || !cand) {
      return jsonResponse({ error: "Candidatura não encontrada" }, 404);
    }

    // 3. Se já tem candidate_id e assessment recente (<24h), pula
    if (cand.candidate_id) {
      const { data: recent } = await admin
        .from("assessments")
        .select("id, created_at")
        .eq("candidate_id", cand.candidate_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (recent) {
        const ageMs = Date.now() - new Date(recent.created_at).getTime();
        if (ageMs < 24 * 60 * 60 * 1000) {
          return jsonResponse({ skipped: true, reason: "assessment_recente", assessmentId: recent.id });
        }
      }
    }

    // 4. Carrega vaga (precisa do cargo + dono para criar candidate)
    const { data: vaga, error: vagaErr } = await admin
      .from("vagas")
      .select("id, cargo, created_by")
      .eq("id", cand.vaga_id)
      .maybeSingle();
    if (vagaErr || !vaga) {
      return jsonResponse({ error: "Vaga não encontrada" }, 404);
    }

    // 5. Cria candidate se necessário
    let candidateId = cand.candidate_id;
    if (!candidateId) {
      const { data: novo, error: cInsErr } = await admin
        .from("candidates")
        .insert({
          nome: cand.nome,
          cargo: vaga.cargo,
          dados_profissionais: cand.dados_profissionais,
          informacoes_adicionais: cand.informacoes_adicionais,
          created_by: vaga.created_by,
          origem: "candidato",
        })
        .select("id")
        .single();
      if (cInsErr || !novo) {
        console.error("Falha criando candidate", cInsErr);
        return jsonResponse({ error: "Falha ao criar candidato" }, 500);
      }
      candidateId = novo.id;
      await admin.from("candidaturas").update({ candidate_id: candidateId }).eq("id", candidaturaId);
    }

    // 6. Chama assess-candidate em background usando JWT do usuário atual
    //    (não usamos service role para não burlar checks de role da função)
    const invokeUrl = `${supabaseUrl}/functions/v1/assess-candidate`;
    const invokeRes = await fetch(invokeUrl, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        apikey: anonKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ candidateId, candidaturaId }),
    });

    const invokeJson = await invokeRes.json().catch(() => ({}));
    if (!invokeRes.ok) {
      console.error("assess-candidate falhou", invokeRes.status, invokeJson);
      return jsonResponse(
        { error: invokeJson?.error || "Falha na avaliação automática", status: invokeRes.status },
        invokeRes.status === 429 || invokeRes.status === 402 ? invokeRes.status : 500,
      );
    }

    // 7. Loga evento
    await admin.from("candidatura_eventos").insert({
      candidatura_id: candidaturaId,
      tipo: "auto_score",
      descricao: `Auto-score executado ao entrar no estágio "${estagio.nome}"`,
      ator_id: userData.user.id,
      dados: { estagio_id: estagioId, assessment_id: invokeJson?.assessment?.id },
    });

    return jsonResponse({ success: true, candidateId, assessment: invokeJson?.assessment });
  } catch (err) {
    console.error("auto-score erro", err);
    return jsonResponse({ error: "Erro interno" }, 500);
  }
});
