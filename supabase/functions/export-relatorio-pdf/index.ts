import { createClient } from "npm:@supabase/supabase-js@2.45.0";
import { jsPDF } from "npm:jspdf@2.5.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const SENIORIDADE_LABEL: Record<string, string> = {
  Junior: "Júnior",
  Pleno: "Pleno",
  Senior: "Sênior",
};

const PILARES: Array<{ key: string; label: string; pesoKey: string }> = [
  { key: "profundidadeTecnica", label: "Profundidade Técnica", pesoKey: "tecnico" },
  { key: "escopoImpacto", label: "Escopo de Impacto", pesoKey: "impacto" },
  { key: "comportamental", label: "Perfil Comportamental", pesoKey: "comportamental" },
  { key: "visaoEstrategica", label: "Visão Estratégica", pesoKey: "estrategico" },
  { key: "liderancaAutonomia", label: "Liderança e Autonomia", pesoKey: "lideranca" },
];

const TRACO_LABEL: Record<string, string> = {
  proatividade: "Proatividade",
  colaboracao: "Colaboração",
  responsabilidade: "Responsabilidade",
  abertura_a_feedback: "Abertura a feedback",
  resiliencia: "Resiliência",
  autoconhecimento: "Autoconhecimento",
  red_flag: "Sinal de atenção",
};

interface AssessmentRow {
  id: string;
  senioridade_detectada: string;
  confidence_score: number;
  nota_ponderada: number;
  analise_pilares: Record<string, { nota: number; justificativa: string }>;
  pontos_fortes: string[];
  gaps_identificados: string[];
  perguntas_entrevista: string[];
  resumo_executivo: string;
  evidencias_comportamentais: Array<{
    trecho: string;
    traco: string;
    impacto: string;
    analise: string;
  }>;
  model_used: string;
  created_at: string;
  candidate_id: string;
  candidates: { nome: string; cargo: string; origem: string } | null;
}

interface PesosRow {
  tecnico: number;
  impacto: number;
  comportamental: number;
  estrategico: number;
  lideranca: number;
}

function buildPdf(
  assessment: AssessmentRow,
  pesos: PesosRow,
  history: Array<Pick<AssessmentRow, "id" | "senioridade_detectada" | "nota_ponderada" | "created_at">>,
): Uint8Array {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 40;
  const maxWidth = pageWidth - marginX * 2;
  let y = 50;

  const ensure = (h: number) => {
    if (y + h > pageHeight - 50) {
      doc.addPage();
      y = 50;
    }
  };

  const text = (
    str: string,
    size: number,
    opts?: { bold?: boolean; color?: [number, number, number]; gap?: number },
  ) => {
    doc.setFont("helvetica", opts?.bold ? "bold" : "normal");
    doc.setFontSize(size);
    const c = opts?.color ?? [20, 20, 20];
    doc.setTextColor(c[0], c[1], c[2]);
    const lines = doc.splitTextToSize(str || "—", maxWidth);
    for (const ln of lines) {
      ensure(size + 4);
      doc.text(ln, marginX, y);
      y += size + 4;
    }
    if (opts?.gap) y += opts.gap;
  };

  const sectionTitle = (str: string) => {
    ensure(30);
    y += 6;
    text(str, 13, { bold: true, color: [180, 140, 30] });
    doc.setDrawColor(200, 200, 200);
    doc.line(marginX, y - 2, marginX + maxWidth, y - 2);
    y += 6;
  };

  // Header
  text(assessment.candidates?.nome ?? "Candidato", 20, { bold: true });
  text(`Cargo: ${assessment.candidates?.cargo ?? "—"}`, 10, { color: [110, 110, 110] });
  const dataFmt = new Date(assessment.created_at).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  text(`Avaliação: ${dataFmt}`, 10, { color: [110, 110, 110] });
  text(
    `Nível detectado: ${SENIORIDADE_LABEL[assessment.senioridade_detectada] ?? assessment.senioridade_detectada}`,
    11,
    { bold: true, color: [180, 140, 30], gap: 4 },
  );
  text(
    `Nota ponderada: ${Number(assessment.nota_ponderada).toFixed(1)} / 10  ·  Confiança: ${assessment.confidence_score}%`,
    12,
    { bold: true, gap: 8 },
  );

  // Comparação com anterior
  const idx = history.findIndex((h) => h.id === assessment.id);
  const previous = idx >= 0 && idx < history.length - 1 ? history[idx + 1] : null;
  if (previous) {
    sectionTitle("Comparação com avaliação anterior");
    text(
      `Anterior (${new Date(previous.created_at).toLocaleDateString("pt-BR")}): ${SENIORIDADE_LABEL[previous.senioridade_detectada]} · ${Number(previous.nota_ponderada).toFixed(1)}`,
      10,
    );
    const delta = Number(assessment.nota_ponderada) - Number(previous.nota_ponderada);
    text(
      `Atual: ${SENIORIDADE_LABEL[assessment.senioridade_detectada]} · ${Number(assessment.nota_ponderada).toFixed(1)}  (${delta >= 0 ? "+" : ""}${delta.toFixed(2)})`,
      10,
      { bold: true, gap: 4 },
    );
  }

  // Pilares
  sectionTitle("Análise por Pilar");
  for (const p of PILARES) {
    const pilar = assessment.analise_pilares?.[p.key];
    if (!pilar) continue;
    const peso = (pesos as unknown as Record<string, number>)[p.pesoKey] ?? 0;
    ensure(50);
    text(`${p.label}  —  Peso ${peso}%  ·  Nota ${Number(pilar.nota).toFixed(1)}`, 11, {
      bold: true,
    });
    text(pilar.justificativa, 10, { gap: 4 });
  }

  // Evidências comportamentais
  if (assessment.evidencias_comportamentais?.length) {
    sectionTitle("Evidências Comportamentais");
    assessment.evidencias_comportamentais.forEach((ev) => {
      ensure(60);
      const traco = TRACO_LABEL[ev.traco] ?? ev.traco;
      text(`[${traco} · impacto ${ev.impacto}]`, 9, {
        bold: true,
        color: ev.impacto === "negativo" ? [180, 40, 40] : [40, 130, 60],
      });
      text(`"${ev.trecho}"`, 10);
      text(ev.analise, 9, { color: [110, 110, 110], gap: 4 });
    });
  }

  // Pontos fortes
  if (assessment.pontos_fortes?.length) {
    sectionTitle("Pontos Fortes");
    assessment.pontos_fortes.forEach((p) => text(`•  ${p}`, 10));
  }

  // Gaps
  if (assessment.gaps_identificados?.length) {
    sectionTitle("Gaps Identificados");
    assessment.gaps_identificados.forEach((g) => text(`•  ${g}`, 10));
  }

  // Perguntas
  if (assessment.perguntas_entrevista?.length) {
    sectionTitle("Perguntas Sugeridas para Entrevista");
    assessment.perguntas_entrevista.forEach((q, i) => text(`${i + 1}.  ${q}`, 10));
  }

  // Resumo
  if (assessment.resumo_executivo) {
    sectionTitle("Resumo Executivo");
    text(assessment.resumo_executivo, 10);
  }

  // Footer
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Seniority Hub  ·  Modelo: ${assessment.model_used}  ·  Página ${i}/${total}`,
      marginX,
      pageHeight - 20,
    );
  }

  const ab = doc.output("arraybuffer");
  return new Uint8Array(ab);
}

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

    let body: { assessmentId?: string };
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: "Body inválido." }, 400);
    }
    const assessmentId = body.assessmentId;
    if (typeof assessmentId !== "string") {
      return jsonResponse({ error: "assessmentId obrigatório." }, 400);
    }

    const { data: assessment, error: assErr } = await supabase
      .from("assessments")
      .select(
        "id, senioridade_detectada, confidence_score, nota_ponderada, analise_pilares, pontos_fortes, gaps_identificados, perguntas_entrevista, resumo_executivo, evidencias_comportamentais, model_used, created_at, candidate_id, candidates(nome, cargo, origem)",
      )
      .eq("id", assessmentId)
      .maybeSingle();

    if (assErr || !assessment) {
      return jsonResponse({ error: "Avaliação não encontrada." }, 404);
    }

    const { data: history } = await supabase
      .from("assessments")
      .select("id, senioridade_detectada, nota_ponderada, created_at")
      .eq("candidate_id", (assessment as { candidate_id: string }).candidate_id)
      .order("created_at", { ascending: false });

    const { data: pesosRow } = await supabase
      .from("assessment_pesos")
      .select("tecnico, impacto, comportamental, estrategico, lideranca")
      .eq("id", 1)
      .maybeSingle();

    const pesos: PesosRow = pesosRow
      ? {
          tecnico: Number(pesosRow.tecnico),
          impacto: Number(pesosRow.impacto),
          comportamental: Number(pesosRow.comportamental),
          estrategico: Number(pesosRow.estrategico),
          lideranca: Number(pesosRow.lideranca),
        }
      : { tecnico: 30, impacto: 25, comportamental: 20, estrategico: 15, lideranca: 10 };

    const pdfBytes = buildPdf(
      assessment as unknown as AssessmentRow,
      pesos,
      (history ?? []) as Array<
        Pick<AssessmentRow, "id" | "senioridade_detectada" | "nota_ponderada" | "created_at">
      >,
    );

    const filename = `relatorio-${
      (assessment as { candidates: { nome: string } | null }).candidates?.nome?.replace(/[^a-z0-9]/gi, "_") ?? "candidato"
    }.pdf`;

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error("Unhandled", err);
    return jsonResponse({ error: err instanceof Error ? err.message : "Erro interno." }, 500);
  }
});
