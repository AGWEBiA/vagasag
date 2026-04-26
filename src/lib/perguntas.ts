export type PerguntaTipo = "texto" | "escolha" | "escala";

export const TIPO_LABEL: Record<PerguntaTipo, string> = {
  texto: "Texto livre",
  escolha: "Múltipla escolha",
  escala: "Escala 1–5",
};

export interface QuestionBankItem {
  id: string;
  texto: string;
  tipo: PerguntaTipo;
  opcoes: string[];
  cargos_sugeridos: string[];
  ativa: boolean;
  created_at: string;
}

export interface VagaPergunta {
  id: string;
  vaga_id: string;
  question_bank_id: string | null;
  texto: string;
  tipo: PerguntaTipo;
  opcoes: string[];
  ordem: number;
  obrigatoria: boolean;
  usar_na_ia: boolean;
}

export interface CandidaturaResposta {
  id?: string;
  candidatura_id?: string;
  vaga_pergunta_id: string;
  resposta_texto: string | null;
  resposta_numero: number | null;
}

export const ESCALA_LABEL: Record<number, string> = {
  1: "Iniciante",
  2: "Básico",
  3: "Intermediário",
  4: "Avançado",
  5: "Especialista",
};
