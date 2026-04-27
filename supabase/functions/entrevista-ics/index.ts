import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function fmtICS(d: Date): string {
  // YYYYMMDDTHHMMSSZ in UTC
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    'T' +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    'Z'
  )
}

function escapeICS(text: string): string {
  return (text || '')
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const url = new URL(req.url)
  const id = url.searchParams.get('id')
  if (!id) {
    return new Response('Missing id', { status: 400, headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, serviceKey)

  const { data: ent, error } = await supabase
    .from('entrevistas')
    .select(
      'id, titulo, descricao, data_inicio, data_fim, modalidade, local, link_video, entrevistador_nome, entrevistador_email, ics_uid, status, candidatura_id, vaga_id'
    )
    .eq('id', id)
    .maybeSingle()

  if (error || !ent) {
    return new Response('Not found', { status: 404, headers: corsHeaders })
  }

  const { data: cand } = await supabase
    .from('candidaturas')
    .select('nome, email, vagas:vaga_id(titulo)')
    .eq('id', ent.candidatura_id)
    .maybeSingle()

  const dtStart = new Date(ent.data_inicio)
  const dtEnd = new Date(ent.data_fim)
  const dtStamp = new Date()

  const summary = ent.titulo || 'Entrevista'
  const descParts: string[] = []
  if (ent.descricao) descParts.push(ent.descricao)
  if (ent.link_video) descParts.push(`Link: ${ent.link_video}`)
  if (ent.entrevistador_nome) descParts.push(`Entrevistador: ${ent.entrevistador_nome}`)
  const description = descParts.join('\n')

  const location = ent.modalidade === 'online' ? (ent.link_video || '') : (ent.local || '')

  const status =
    ent.status === 'cancelada' ? 'CANCELLED' : ent.status === 'realizada' ? 'CONFIRMED' : 'CONFIRMED'

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Banco de Talentos AG//Entrevistas//PT',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${ent.ics_uid}@bancodetalentos.ag`,
    `DTSTAMP:${fmtICS(dtStamp)}`,
    `DTSTART:${fmtICS(dtStart)}`,
    `DTEND:${fmtICS(dtEnd)}`,
    `SUMMARY:${escapeICS(summary)}`,
    `DESCRIPTION:${escapeICS(description)}`,
    location ? `LOCATION:${escapeICS(location)}` : '',
    `STATUS:${status}`,
    'SEQUENCE:0',
    `ORGANIZER;CN=${escapeICS(ent.entrevistador_nome || 'Recrutador')}:mailto:${ent.entrevistador_email || 'noreply@example.com'}`,
    cand?.email
      ? `ATTENDEE;CN=${escapeICS(cand.nome || cand.email)};RSVP=TRUE:mailto:${cand.email}`
      : '',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean)

  const ics = lines.join('\r\n')

  return new Response(ics, {
    status: 200,
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="entrevista-${ent.id}.ics"`,
    },
  })
})
