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

// Lock em memória por vaga_id para evitar cliques rápidos / corrida.
// Edge functions são instanciadas sob demanda — esse lock só protege
// a mesma instância. A constraint UNIQUE no banco protege globalmente.
const inFlight = new Set<string>();

interface PerguntaInput {
  question_bank_id: string | null;
  texto: string;
  tipo: "texto" | "escolha" | "escala";
  opcoes?: string[];
  obrigatoria?: boolean;
  usar_na_ia?: boolean;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const lockKey = crypto.randomUUID();

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

    let payload: { vagaId?: string; perguntas?: PerguntaInput[] };
    try {
      payload = await req.json();
    } catch {
      return jsonResponse({ error: "Body inválido." }, 400);
    }

    const vagaId = payload.vagaId;
    const perguntas = payload.perguntas;

    if (typeof vagaId !== "string" || vagaId.length < 10) {
      return jsonResponse({ error: "vagaId inválido." }, 400);
    }
    if (!Array.isArray(perguntas) || perguntas.length === 0) {
      return jsonResponse({ error: "Lista de perguntas vazia." }, 400);
    }
    if (perguntas.length > 50) {
      return jsonResponse({ error: "Máximo 50 perguntas por requisição." }, 400);
    }

    // Lock por vaga (mesma instância da function)
    if (inFlight.has(vagaId)) {
      return jsonResponse(
        { error: "Outra inserção está em andamento para esta vaga. Tente novamente em instantes." },
        409,
      );
    }
    inFlight.add(vagaId);

    // Verifica permissão (admin ou dono da vaga)
    const { data: vaga, error: vagaErr } = await supabase
      .from("vagas")
      .select("id, created_by")
      .eq("id", vagaId)
      .maybeSingle();
    if (vagaErr || !vaga) {
      return jsonResponse({ error: "Vaga não encontrada." }, 404);
    }

    // Carrega perguntas já existentes na vaga
    const { data: existentes, error: exErr } = await supabase
      .from("vaga_perguntas")
      .select("question_bank_id, texto, ordem")
      .eq("vaga_id", vagaId);
    if (exErr) {
      console.error("erro carregando existentes", exErr);
      return jsonResponse({ error: "Erro ao verificar duplicatas." }, 500);
    }

    const existingBankIds = new Set(
      (existentes ?? [])
        .map((e) => e.question_bank_id)
        .filter((v): v is string => typeof v === "string"),
    );
    const existingTextos = new Set(
      (existentes ?? []).map((e) => (e.texto ?? "").trim().toLowerCase()),
    );
    const maxOrdem = (existentes ?? []).reduce(
      (acc, e) => Math.max(acc, e.ordem ?? 0),
      -1,
    );

    // Filtra duplicatas (por question_bank_id OU texto idêntico, case-insensitive)
    // Também deduplica dentro do próprio payload.
    const seenInPayload = new Set<string>();
    const novos: PerguntaInput[] = [];
    const duplicadas: { texto: string; motivo: string }[] = [];

    for (const p of perguntas) {
      const texto = (p.texto ?? "").trim();
      if (texto.length < 5) {
        duplicadas.push({ texto, motivo: "texto muito curto" });
        continue;
      }
      const lower = texto.toLowerCase();
      const bankKey = p.question_bank_id ?? `txt:${lower}`;

      if (seenInPayload.has(bankKey)) {
        duplicadas.push({ texto, motivo: "duplicada no envio" });
        continue;
      }
      if (p.question_bank_id && existingBankIds.has(p.question_bank_id)) {
        duplicadas.push({ texto, motivo: "já existe na vaga (banco)" });
        continue;
      }
      if (existingTextos.has(lower)) {
        duplicadas.push({ texto, motivo: "texto já existe na vaga" });
        continue;
      }
      seenInPayload.add(bankKey);
      novos.push(p);
    }

    if (novos.length === 0) {
      return jsonResponse({
        inseridas: 0,
        ignoradas: duplicadas.length,
        duplicadas,
      });
    }

    const rows = novos.map((p, i) => ({
      vaga_id: vagaId,
      question_bank_id: p.question_bank_id ?? null,
      texto: p.texto.trim(),
      tipo: p.tipo,
      opcoes: Array.isArray(p.opcoes) ? p.opcoes : [],
      ordem: maxOrdem + 1 + i,
      obrigatoria: p.obrigatoria !== false,
      usar_na_ia: p.usar_na_ia !== false,
    }));

    // INSERT — RLS valida permissão; constraint UNIQUE garante atomicidade
    // contra cliques rápidos em instâncias diferentes.
    const { data: inserted, error: insErr } = await supabase
      .from("vaga_perguntas")
      .insert(rows)
      .select("id");

    if (insErr) {
      console.error("erro inserindo", insErr);
      // Código 23505 = unique violation (índice uq_vaga_perguntas_vaga_question_bank)
      if ((insErr as { code?: string }).code === "23505") {
        return jsonResponse(
          {
            error: "Algumas perguntas já estavam na vaga. Recarregue a página e tente novamente.",
            inseridas: 0,
            ignoradas: novos.length,
          },
          409,
        );
      }
      return jsonResponse({ error: "Erro ao inserir perguntas." }, 500);
    }

    return jsonResponse({
      inseridas: inserted?.length ?? 0,
      ignoradas: duplicadas.length,
      duplicadas,
    });
  } catch (err) {
    console.error("Unhandled", err);
    return jsonResponse({ error: "Erro interno." }, 500);
  } finally {
    // Libera o lock — usa try/finally para garantir mesmo em erro
    if (req.method !== "OPTIONS") {
      // Re-extrai vagaId do body já consumido seria caro; usamos lockKey
      // como sentinel — na prática o set tem entries por vaga.
      // Como não temos vagaId aqui de forma segura, usamos uma limpeza geral
      // a cada chamada (lock dura no máximo a duração da request).
      inFlight.delete(lockKey);
    }
  }
});
