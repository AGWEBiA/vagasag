import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import React from "npm:react@18.3.1";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
  Font,
} from "npm:@react-pdf/renderer@4.1.6";

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

// ---------- Styles ----------
const colors = {
  bg: "#0F172A",
  surface: "#1E293B",
  border: "#334155",
  gold: "#D4AF37",
  goldSoft: "#3A2F0E",
  text: "#F1F5F9",
  muted: "#94A3B8",
  senior: "#22C55E",
  junior: "#F59E0B",
  destructive: "#EF4444",
};

const styles = StyleSheet.create({
  page: {
    backgroundColor: colors.bg,
    color: colors.text,
    padding: 32,
    fontSize: 10,
    fontFamily: "Helvetica",
  },
  header: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  h1: { fontSize: 22, color: colors.gold, marginBottom: 4, fontFamily: "Helvetica-Bold" },
  meta: { fontSize: 9, color: colors.muted, marginBottom: 2 },
  badge: {
    backgroundColor: colors.goldSoft,
    color: colors.gold,
    fontSize: 9,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginTop: 6,
    alignSelf: "flex-start",
  },
  scoreBox: {
    backgroundColor: colors.goldSoft,
    borderRadius: 6,
    padding: 10,
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  scoreLabel: { fontSize: 9, color: colors.muted, textTransform: "uppercase" },
  scoreValue: { fontSize: 20, color: colors.gold, fontFamily: "Helvetica-Bold" },
  section: { marginBottom: 12 },
  sectionTitle: {
    fontSize: 13,
    color: colors.gold,
    fontFamily: "Helvetica-Bold",
    marginBottom: 6,
    paddingBottom: 3,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pilar: {
    backgroundColor: colors.surface,
    borderRadius: 6,
    padding: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pilarRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  pilarTitle: { fontSize: 11, fontFamily: "Helvetica-Bold" },
  pilarPeso: { fontSize: 8, color: colors.muted },
  pilarNota: { fontSize: 14, color: colors.gold, fontFamily: "Helvetica-Bold" },
  pilarJust: { fontSize: 9, color: colors.text, lineHeight: 1.4 },
  bar: { height: 4, backgroundColor: colors.border, borderRadius: 2, marginVertical: 4 },
  barFill: { height: 4, backgroundColor: colors.gold, borderRadius: 2 },
  list: { marginBottom: 4 },
  listItem: { flexDirection: "row", marginBottom: 3 },
  bullet: { width: 8, color: colors.gold },
  listText: { flex: 1, fontSize: 9, lineHeight: 1.4 },
  evidenceCard: {
    backgroundColor: colors.surface,
    padding: 10,
    borderRadius: 6,
    marginBottom: 6,
    borderLeftWidth: 3,
    borderLeftColor: colors.gold,
    borderTopWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderTopColor: colors.border,
    borderRightColor: colors.border,
    borderBottomColor: colors.border,
  },
  evidenceTags: { flexDirection: "row", marginBottom: 4 },
  evidenceTag: {
    backgroundColor: colors.goldSoft,
    color: colors.gold,
    fontSize: 8,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 3,
    marginRight: 4,
  },
  evidenceTagRed: {
    backgroundColor: "#3F1212",
    color: colors.destructive,
    fontSize: 8,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 3,
    marginRight: 4,
  },
  evidenceQuote: {
    fontSize: 9,
    fontFamily: "Helvetica-Oblique",
    color: colors.text,
    marginBottom: 4,
  },
  evidenceAnalise: { fontSize: 8, color: colors.muted, lineHeight: 1.3 },
  resumo: {
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: 6,
    fontSize: 10,
    lineHeight: 1.5,
    borderWidth: 1,
    borderColor: colors.gold,
  },
  comparisonGrid: { flexDirection: "row", gap: 8, marginBottom: 8 },
  comparisonBox: {
    flex: 1,
    backgroundColor: colors.surface,
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  comparisonLabel: { fontSize: 8, color: colors.muted, textTransform: "uppercase" },
  comparisonValues: { flexDirection: "row", alignItems: "center", marginTop: 3 },
  comparisonOld: { fontSize: 10, color: colors.muted },
  comparisonArrow: { fontSize: 10, color: colors.muted, marginHorizontal: 6 },
  comparisonNew: { fontSize: 12, color: colors.gold, fontFamily: "Helvetica-Bold" },
  comparisonDelta: { fontSize: 9, marginLeft: 8 },
  footer: {
    position: "absolute",
    bottom: 16,
    left: 32,
    right: 32,
    fontSize: 8,
    color: colors.muted,
    textAlign: "center",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});

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
  candidates: { nome: string; cargo: string; origem: string } | null;
}

interface PesosRow {
  tecnico: number;
  impacto: number;
  comportamental: number;
  estrategico: number;
  lideranca: number;
}

function RelatorioPDF({
  assessment,
  pesos,
  history,
}: {
  assessment: AssessmentRow;
  pesos: PesosRow;
  history: Array<Pick<AssessmentRow, "id" | "senioridade_detectada" | "nota_ponderada" | "analise_pilares" | "created_at">>;
}) {
  const previous = (() => {
    const idx = history.findIndex((h) => h.id === assessment.id);
    if (idx < 0 || idx >= history.length - 1) return null;
    return history[idx + 1];
  })();

  const dataFmt = new Date(assessment.created_at).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.h1}>{assessment.candidates?.nome ?? "Candidato"}</Text>
          <Text style={styles.meta}>Cargo: {assessment.candidates?.cargo ?? "—"}</Text>
          <Text style={styles.meta}>Avaliação: {dataFmt}</Text>
          <Text style={styles.badge}>
            Nível detectado: {SENIORIDADE_LABEL[assessment.senioridade_detectada] ?? assessment.senioridade_detectada}
          </Text>
          <View style={styles.scoreBox}>
            <View>
              <Text style={styles.scoreLabel}>Nota Ponderada</Text>
              <Text style={{ fontSize: 8, color: colors.muted, marginTop: 2 }}>
                Confiança: {assessment.confidence_score}%
              </Text>
            </View>
            <Text style={styles.scoreValue}>{Number(assessment.nota_ponderada).toFixed(1)} / 10</Text>
          </View>
        </View>

        {/* Comparação histórica */}
        {previous && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Comparação com avaliação anterior</Text>
            <Text style={{ fontSize: 8, color: colors.muted, marginBottom: 6 }}>
              Avaliação anterior: {new Date(previous.created_at).toLocaleDateString("pt-BR")}
            </Text>
            <View style={styles.comparisonGrid}>
              <View style={styles.comparisonBox}>
                <Text style={styles.comparisonLabel}>Nível</Text>
                <View style={styles.comparisonValues}>
                  <Text style={styles.comparisonOld}>
                    {SENIORIDADE_LABEL[previous.senioridade_detectada]}
                  </Text>
                  <Text style={styles.comparisonArrow}>→</Text>
                  <Text style={styles.comparisonNew}>
                    {SENIORIDADE_LABEL[assessment.senioridade_detectada]}
                  </Text>
                </View>
              </View>
              <View style={styles.comparisonBox}>
                <Text style={styles.comparisonLabel}>Nota ponderada</Text>
                <View style={styles.comparisonValues}>
                  <Text style={styles.comparisonOld}>
                    {Number(previous.nota_ponderada).toFixed(1)}
                  </Text>
                  <Text style={styles.comparisonArrow}>→</Text>
                  <Text style={styles.comparisonNew}>
                    {Number(assessment.nota_ponderada).toFixed(1)}
                  </Text>
                  <Text
                    style={[
                      styles.comparisonDelta,
                      {
                        color:
                          assessment.nota_ponderada - previous.nota_ponderada >= 0
                            ? colors.senior
                            : colors.destructive,
                      },
                    ]}
                  >
                    {assessment.nota_ponderada - previous.nota_ponderada >= 0 ? "+" : ""}
                    {(assessment.nota_ponderada - previous.nota_ponderada).toFixed(2)}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Pilares */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Análise por Pilar</Text>
          {PILARES.map((p) => {
            const pilar = assessment.analise_pilares?.[p.key];
            if (!pilar) return null;
            const peso = (pesos as unknown as Record<string, number>)[p.pesoKey] ?? 0;
            return (
              <View key={p.key} style={styles.pilar} wrap={false}>
                <View style={styles.pilarRow}>
                  <View>
                    <Text style={styles.pilarTitle}>{p.label}</Text>
                    <Text style={styles.pilarPeso}>Peso {peso}%</Text>
                  </View>
                  <Text style={styles.pilarNota}>{Number(pilar.nota).toFixed(1)}</Text>
                </View>
                <View style={styles.bar}>
                  <View style={[styles.barFill, { width: `${(pilar.nota / 10) * 100}%` }]} />
                </View>
                <Text style={styles.pilarJust}>{pilar.justificativa}</Text>
              </View>
            );
          })}
        </View>
      </Page>

      {/* Página 2: Evidências comportamentais + pontos fortes/gaps */}
      <Page size="A4" style={styles.page}>
        {assessment.evidencias_comportamentais && assessment.evidencias_comportamentais.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Evidências Comportamentais</Text>
            <Text style={{ fontSize: 8, color: colors.muted, marginBottom: 8 }}>
              Trechos das respostas que mais influenciaram a nota do pilar Comportamental.
            </Text>
            {assessment.evidencias_comportamentais.map((ev, i) => (
              <View key={i} style={styles.evidenceCard} wrap={false}>
                <View style={styles.evidenceTags}>
                  <Text
                    style={ev.traco === "red_flag" ? styles.evidenceTagRed : styles.evidenceTag}
                  >
                    {TRACO_LABEL[ev.traco] ?? ev.traco}
                  </Text>
                  <Text
                    style={[
                      styles.evidenceTag,
                      ev.impacto === "negativo" ? { color: colors.destructive, backgroundColor: "#3F1212" } : {},
                      ev.impacto === "positivo" ? { color: colors.senior, backgroundColor: "#0F2818" } : {},
                    ]}
                  >
                    Impacto {ev.impacto}
                  </Text>
                </View>
                <Text style={styles.evidenceQuote}>"{ev.trecho}"</Text>
                <Text style={styles.evidenceAnalise}>{ev.analise}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pontos Fortes</Text>
          {assessment.pontos_fortes.map((p, i) => (
            <View key={i} style={styles.listItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.listText}>{p}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Gaps Identificados</Text>
          {assessment.gaps_identificados.map((g, i) => (
            <View key={i} style={styles.listItem}>
              <Text style={[styles.bullet, { color: colors.destructive }]}>•</Text>
              <Text style={styles.listText}>{g}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Perguntas Sugeridas para Entrevista</Text>
          {assessment.perguntas_entrevista.map((q, i) => (
            <View key={i} style={styles.listItem}>
              <Text style={[styles.bullet, { color: colors.gold }]}>{i + 1}.</Text>
              <Text style={styles.listText}>{q}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resumo Executivo</Text>
          <Text style={styles.resumo}>{assessment.resumo_executivo}</Text>
        </View>

        <Text style={styles.footer}>
          Gerado por Seniority Hub · Modelo: {assessment.model_used}
        </Text>
      </Page>
    </Document>
  );
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
      .select(
        "id, senioridade_detectada, nota_ponderada, analise_pilares, created_at",
      )
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

    const buffer = await renderToBuffer(
      <RelatorioPDF
        assessment={assessment as unknown as AssessmentRow}
        pesos={pesos}
        history={(history ?? []) as Array<Pick<AssessmentRow, "id" | "senioridade_detectada" | "nota_ponderada" | "analise_pilares" | "created_at">>}
      />,
    );

    const filename = `relatorio-${(assessment as { candidates: { nome: string } | null }).candidates?.nome?.replace(/[^a-z0-9]/gi, "_") ?? "candidato"}.pdf`;

    return new Response(buffer, {
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
