export type EstagioTipo =
  | "inicial"
  | "intermediario"
  | "final_aprovado"
  | "final_reprovado";

export interface PipelineEstagio {
  id: string;
  nome: string;
  ordem: number;
  cor: string;
  tipo: EstagioTipo;
  ativo: boolean;
  auto_score_ativo: boolean;
  email_ativo: boolean;
  email_assunto: string | null;
  email_corpo: string | null;
}

/**
 * Substitui variáveis {{nome}}, {{vaga}}, {{estagio}} em templates de e-mail.
 */
export function interpolarTemplate(
  texto: string,
  vars: Record<string, string | undefined | null>,
): string {
  return texto.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => {
    const v = vars[key];
    return v == null ? "" : String(v);
  });
}

export const ESTAGIO_TIPO_LABEL: Record<EstagioTipo, string> = {
  inicial: "Inicial",
  intermediario: "Intermediário",
  final_aprovado: "Final · Aprovado",
  final_reprovado: "Final · Reprovado",
};

export const ESTAGIO_CORES_PRESET = [
  "#3b82f6",
  "#8b5cf6",
  "#f59e0b",
  "#06b6d4",
  "#10b981",
  "#16a34a",
  "#ef4444",
  "#ec4899",
  "#6b7280",
  "#0ea5e9",
];

export const diffDays = (iso: string) => {
  const ms = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
};
