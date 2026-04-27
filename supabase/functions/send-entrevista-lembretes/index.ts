import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

interface EntrevistaRow {
  id: string
  candidatura_id: string
  vaga_id: string
  titulo: string
  descricao: string | null
  data_inicio: string
  data_fim: string
  fuso_horario: string
  modalidade: string
  local: string | null
  link_video: string | null
  entrevistador_nome: string | null
  status: string
  enviar_lembrete: boolean
  horas_antes_lembrete: number
  lembrete_enviado_em: string | null
  ics_uid: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, serviceKey)

  try {
    const now = new Date()
    // Buscamos um pouco mais largo (até 8d) e filtramos por horas_antes_lembrete em memória,
    // já que cada entrevista pode ter um valor diferente.
    const limite = new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000).toISOString()

    const { data: entrevistas, error } = await supabase
      .from('entrevistas')
      .select(
        'id, candidatura_id, vaga_id, titulo, descricao, data_inicio, data_fim, fuso_horario, modalidade, local, link_video, entrevistador_nome, status, enviar_lembrete, horas_antes_lembrete, lembrete_enviado_em, ics_uid',
      )
      .eq('status', 'agendada')
      .eq('enviar_lembrete', true)
      .is('lembrete_enviado_em', null)
      .gte('data_inicio', now.toISOString())
      .lte('data_inicio', limite)

    if (error) {
      console.error('Erro ao buscar entrevistas:', error)
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const lista = (entrevistas ?? []) as EntrevistaRow[]
    const elegiveis = lista.filter((e) => {
      const inicio = new Date(e.data_inicio).getTime()
      const horasAteEntrevista = (inicio - now.getTime()) / (1000 * 60 * 60)
      return horasAteEntrevista > 0 && horasAteEntrevista <= e.horas_antes_lembrete
    })

    let enviados = 0
    let falhas = 0

    for (const e of elegiveis) {
      // Carrega candidatura + vaga
      const { data: cand } = await supabase
        .from('candidaturas')
        .select('id, nome, email, vaga_id')
        .eq('id', e.candidatura_id)
        .maybeSingle()

      if (!cand?.email) {
        await supabase
          .from('entrevistas')
          .update({ lembrete_enviado_em: new Date().toISOString() })
          .eq('id', e.id)
        continue
      }

      const { data: vaga } = await supabase
        .from('vagas')
        .select('titulo')
        .eq('id', e.vaga_id)
        .maybeSingle()

      const dataFmt = new Date(e.data_inicio).toLocaleString('pt-BR', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: e.fuso_horario,
      })

      const horasRestantes = Math.round(
        (new Date(e.data_inicio).getTime() - now.getTime()) / (1000 * 60 * 60),
      )

      const icsUrl = `${supabaseUrl}/functions/v1/entrevista-ics?id=${e.id}`

      const fmt = (iso: string) =>
        new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
      const gcalParams = new URLSearchParams({
        action: 'TEMPLATE',
        text: e.titulo || 'Entrevista',
        dates: `${fmt(e.data_inicio)}/${fmt(e.data_fim)}`,
        details: e.descricao || '',
        location: e.modalidade === 'online' ? e.link_video || '' : e.local || '',
      })
      const gcalUrl = `https://calendar.google.com/calendar/render?${gcalParams.toString()}`

      try {
        const { error: sendErr } = await supabase.functions.invoke(
          'send-transactional-email',
          {
            body: {
              templateName: 'entrevista-lembrete',
              recipientEmail: cand.email,
              idempotencyKey: `entrevista-lembrete-${e.id}`,
              templateData: {
                nome: cand.nome,
                vaga: vaga?.titulo ?? '',
                titulo: e.titulo,
                data_formatada: dataFmt,
                modalidade: e.modalidade,
                local: e.local ?? '',
                link_video: e.link_video ?? '',
                entrevistador: e.entrevistador_nome ?? '',
                horas_restantes: horasRestantes,
                ics_url: icsUrl,
                google_calendar_url: gcalUrl,
              },
            },
          },
        )

        if (sendErr) {
          console.error('Falha ao enviar lembrete', e.id, sendErr)
          falhas++
          continue
        }

        await supabase
          .from('entrevistas')
          .update({ lembrete_enviado_em: new Date().toISOString() })
          .eq('id', e.id)

        await supabase.from('candidatura_eventos').insert({
          candidatura_id: e.candidatura_id,
          tipo: 'email_enviado',
          descricao: `Lembrete de entrevista enviado (${horasRestantes}h antes)`,
          dados: {
            template: 'entrevista-lembrete',
            entrevista_id: e.id,
            horas_antes: horasRestantes,
          },
        })

        enviados++
      } catch (err) {
        console.error('Exceção ao enviar lembrete', e.id, err)
        falhas++
      }
    }

    return new Response(
      JSON.stringify({
        verificadas: lista.length,
        elegiveis: elegiveis.length,
        enviados,
        falhas,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('Erro geral', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
