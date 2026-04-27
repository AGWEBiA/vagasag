import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

export type EntrevistaModalidade = "online" | "presencial" | "telefone";
export type EntrevistaStatus =
  | "agendada"
  | "realizada"
  | "cancelada"
  | "remarcada"
  | "no_show";

export interface Entrevista {
  id: string;
  candidatura_id: string;
  vaga_id: string;
  titulo: string;
  descricao: string | null;
  data_inicio: string;
  data_fim: string;
  fuso_horario: string;
  modalidade: EntrevistaModalidade;
  local: string | null;
  link_video: string | null;
  entrevistador_id: string | null;
  entrevistador_nome: string | null;
  entrevistador_email: string | null;
  status: EntrevistaStatus;
  notas_pos_entrevista: string | null;
  ics_uid: string;
  enviar_email_convite: boolean;
  enviar_lembrete: boolean;
  horas_antes_lembrete: number;
  lembrete_enviado_em: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export const STATUS_LABEL: Record<EntrevistaStatus, string> = {
  agendada: "Agendada",
  realizada: "Realizada",
  cancelada: "Cancelada",
  remarcada: "Remarcada",
  no_show: "No-show",
};

export const STATUS_COLOR: Record<EntrevistaStatus, string> = {
  agendada: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  realizada: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  cancelada: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
  remarcada: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  no_show: "bg-red-500/15 text-red-400 border-red-500/30",
};

export const MODALIDADE_LABEL: Record<EntrevistaModalidade, string> = {
  online: "Online",
  presencial: "Presencial",
  telefone: "Telefone",
};

export function getIcsUrl(entrevistaId: string): string {
  return `${SUPABASE_URL}/functions/v1/entrevista-ics?id=${entrevistaId}`;
}

/** Monta URL "Add to Google Calendar" no padrão TEMPLATE. */
export function getGoogleCalendarUrl(e: Entrevista, location: string): string {
  const fmt = (iso: string) =>
    new Date(iso)
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}/, "");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: e.titulo || "Entrevista",
    dates: `${fmt(e.data_inicio)}/${fmt(e.data_fim)}`,
    details: e.descricao || "",
    location: location || "",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

interface CreateParams {
  candidaturaId: string;
  vagaId: string;
  titulo: string;
  descricao?: string;
  dataInicio: Date;
  dataFim: Date;
  modalidade: EntrevistaModalidade;
  local?: string;
  linkVideo?: string;
  entrevistadorNome?: string;
  entrevistadorEmail?: string;
  entrevistadorId?: string;
  enviarEmailConvite?: boolean;
  enviarLembrete?: boolean;
  horasAntesLembrete?: number;
}

export async function criarEntrevista(p: CreateParams): Promise<{ data?: Entrevista; error?: string }> {
  const { data: userRes } = await supabase.auth.getUser();
  const createdBy = userRes.user?.id ?? null;

  const { data, error } = await supabase
    .from("entrevistas")
    .insert({
      candidatura_id: p.candidaturaId,
      vaga_id: p.vagaId,
      titulo: p.titulo,
      descricao: p.descricao ?? null,
      data_inicio: p.dataInicio.toISOString(),
      data_fim: p.dataFim.toISOString(),
      modalidade: p.modalidade,
      local: p.local ?? null,
      link_video: p.linkVideo ?? null,
      entrevistador_nome: p.entrevistadorNome ?? null,
      entrevistador_email: p.entrevistadorEmail ?? null,
      entrevistador_id: p.entrevistadorId ?? null,
      enviar_email_convite: p.enviarEmailConvite ?? true,
      enviar_lembrete: p.enviarLembrete ?? true,
      horas_antes_lembrete: p.horasAntesLembrete ?? 24,
      created_by: createdBy,
    })
    .select("*")
    .single();

  if (error || !data) return { error: error?.message ?? "Erro ao criar entrevista" };

  return { data: data as Entrevista };
}

interface SendInviteParams {
  entrevista: Entrevista;
  candidatoNome: string;
  candidatoEmail: string;
  vagaTitulo: string;
}

export async function enviarConviteEntrevista(p: SendInviteParams) {
  const { entrevista: e, candidatoNome, candidatoEmail, vagaTitulo } = p;

  const dataFmt = new Date(e.data_inicio).toLocaleString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: e.fuso_horario,
  });

  const location =
    e.modalidade === "online" ? e.link_video || "" : e.local || "";
  const icsUrl = getIcsUrl(e.id);
  const gcalUrl = getGoogleCalendarUrl(e, location);

  const { error } = await supabase.functions.invoke("send-transactional-email", {
    body: {
      templateName: "entrevista-convite",
      recipientEmail: candidatoEmail,
      idempotencyKey: `entrevista-${e.id}-v${e.updated_at}`,
      templateData: {
        nome: candidatoNome,
        vaga: vagaTitulo,
        titulo: e.titulo,
        data_formatada: dataFmt,
        modalidade: e.modalidade,
        local: e.local ?? "",
        link_video: e.link_video ?? "",
        entrevistador: e.entrevistador_nome ?? "",
        descricao: e.descricao ?? "",
        ics_url: icsUrl,
        google_calendar_url: gcalUrl,
      },
    },
  });

  if (error) return { ok: false as const, error };

  // Loga no timeline (best-effort)
  await supabase.from("candidatura_eventos").insert({
    candidatura_id: e.candidatura_id,
    tipo: "email_enviado",
    descricao: `Convite de entrevista enviado: "${e.titulo}"`,
    dados: { template: "entrevista-convite", entrevista_id: e.id },
  });

  return { ok: true as const };
}

export async function atualizarStatusEntrevista(
  id: string,
  status: EntrevistaStatus,
  notas?: string,
) {
  const update: { status: EntrevistaStatus; notas_pos_entrevista?: string } = { status };
  if (notas !== undefined) update.notas_pos_entrevista = notas;
  const { error } = await supabase.from("entrevistas").update(update).eq("id", id);
  return { error: error?.message ?? null };
}

export async function listarEntrevistasDaCandidatura(candidaturaId: string) {
  const { data, error } = await supabase
    .from("entrevistas")
    .select("*")
    .eq("candidatura_id", candidaturaId)
    .order("data_inicio", { ascending: false });
  if (error) return { data: [] as Entrevista[], error: error.message };
  return { data: (data ?? []) as Entrevista[], error: null };
}
