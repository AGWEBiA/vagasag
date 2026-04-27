import { supabase } from "@/integrations/supabase/client";
import { interpolarTemplate, type PipelineEstagio } from "@/lib/pipeline";

interface SendEstagioEmailParams {
  candidaturaId: string;
  estagio: PipelineEstagio;
  nome: string;
  email: string;
  vaga: string;
}

/**
 * Dispara e-mail por mudança de estágio se o estágio tiver email_ativo = true.
 * Suporta tipos `final_aprovado`, `final_reprovado` e `intermediario`.
 * Loga evento "email_enviado" automaticamente via metadata.
 */
export async function enviarEmailEstagio(params: SendEstagioEmailParams) {
  const { estagio, nome, email, vaga, candidaturaId } = params;
  if (!estagio.email_ativo) return { skipped: true as const };
  if (!estagio.email_assunto?.trim() || !estagio.email_corpo?.trim()) {
    return { skipped: true as const, reason: "template_vazio" };
  }

  const vars = { nome, vaga, estagio: estagio.nome };
  const assunto = interpolarTemplate(estagio.email_assunto, vars);
  const corpo = interpolarTemplate(estagio.email_corpo, vars);

  const idemKey = `estagio-${candidaturaId}-${estagio.id}`;

  const { error } = await supabase.functions.invoke("send-transactional-email", {
    body: {
      templateName: "estagio-generico",
      recipientEmail: email,
      idempotencyKey: idemKey,
      templateData: {
        nome,
        vaga,
        estagio: estagio.nome,
        cor: estagio.cor,
        assunto,
        corpo,
      },
    },
  });

  if (error) return { ok: false as const, error };

  // Loga no timeline (best-effort)
  await supabase.from("candidatura_eventos").insert({
    candidatura_id: candidaturaId,
    tipo: "email_enviado",
    descricao: `E-mail enviado: "${assunto}"`,
    dados: { template: "estagio-generico", estagio_id: estagio.id, assunto },
  });

  return { ok: true as const };
}

interface SendConfirmacaoParams {
  candidaturaId: string;
  nome: string;
  email: string;
  vaga: string;
}

/**
 * Envia o e-mail de confirmação de candidatura usando o template global.
 */
export async function enviarEmailConfirmacaoCandidatura(params: SendConfirmacaoParams) {
  const { candidaturaId, nome, email, vaga } = params;

  const { data: tpl } = await supabase
    .from("email_templates_globais")
    .select("assunto, corpo, ativo")
    .eq("id", "candidatura_confirmacao")
    .maybeSingle();

  if (!tpl || !tpl.ativo) return { skipped: true as const };

  const vars = { nome, vaga };
  const assunto = interpolarTemplate(tpl.assunto, vars);
  const corpo = interpolarTemplate(tpl.corpo, vars);

  const { error } = await supabase.functions.invoke("send-transactional-email", {
    body: {
      templateName: "candidatura-confirmacao",
      recipientEmail: email,
      idempotencyKey: `candidatura-${candidaturaId}`,
      templateData: { nome, vaga, assunto, corpo },
    },
  });

  if (error) return { ok: false as const, error };
  return { ok: true as const };
}

/**
 * Dispara o auto-score se o estágio tiver auto_score_ativo.
 * Não bloqueia a UI — falhas são silenciadas (logadas no console).
 */
export async function dispararAutoScoreSeNecessario(
  candidaturaId: string,
  estagio: PipelineEstagio,
) {
  if (!estagio.auto_score_ativo) return { skipped: true as const };
  const { data, error } = await supabase.functions.invoke("auto-score-candidatura", {
    body: { candidaturaId, estagioId: estagio.id },
  });
  if (error) {
    console.warn("auto-score falhou", error);
    return { ok: false as const, error };
  }
  return { ok: true as const, data };
}
