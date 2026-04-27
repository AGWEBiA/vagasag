import * as React from 'npm:react@18.3.1'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Banco de Talentos AG'

interface Props {
  nome?: string
  vaga?: string
  titulo?: string
  data_formatada?: string
  modalidade?: string
  local?: string
  link_video?: string
  entrevistador?: string
  horas_restantes?: number
  ics_url?: string
  google_calendar_url?: string
  assunto?: string
}

const EntrevistaLembreteEmail = ({
  nome,
  vaga,
  titulo,
  data_formatada,
  modalidade,
  local,
  link_video,
  entrevistador,
  horas_restantes,
  ics_url,
  google_calendar_url,
}: Props) => {
  const modalidadeLabel =
    modalidade === 'online'
      ? 'Online (vídeo)'
      : modalidade === 'presencial'
        ? 'Presencial'
        : modalidade === 'telefone'
          ? 'Telefone'
          : modalidade

  const tempoTexto =
    horas_restantes && horas_restantes >= 24
      ? `${Math.round(horas_restantes / 24)} dia(s)`
      : `${horas_restantes ?? ''} hora(s)`

  return (
    <Html lang="pt-BR" dir="ltr">
      <Head />
      <Preview>
        {`Lembrete: ${titulo ?? 'Entrevista'} em ${tempoTexto}`}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={h1}>{SITE_NAME}</Heading>
          </Section>

          <Section style={content}>
            <Text style={text}>Olá {nome ?? ''},</Text>
            <Text style={text}>
              Este é um lembrete da sua entrevista
              {vaga ? ` referente à vaga ${vaga}` : ''}, agendada para
              daqui a aproximadamente <strong>{tempoTexto}</strong>.
            </Text>

            <Section style={card}>
              <Text style={cardTitle}>{titulo ?? 'Entrevista'}</Text>
              {data_formatada && (
                <Text style={cardLine}>
                  <strong>📅 Quando:</strong> {data_formatada}
                </Text>
              )}
              {modalidadeLabel && (
                <Text style={cardLine}>
                  <strong>💼 Modalidade:</strong> {modalidadeLabel}
                </Text>
              )}
              {link_video && (
                <Text style={cardLine}>
                  <strong>🎥 Link da reunião:</strong>{' '}
                  <Link href={link_video} style={linkStyle}>
                    {link_video}
                  </Link>
                </Text>
              )}
              {local && (
                <Text style={cardLine}>
                  <strong>📍 Local:</strong> {local}
                </Text>
              )}
              {entrevistador && (
                <Text style={cardLine}>
                  <strong>👤 Entrevistador:</strong> {entrevistador}
                </Text>
              )}
            </Section>

            <Hr style={hr} />

            <Text style={textStrong}>Adicione ao seu calendário (caso ainda não tenha):</Text>
            <Section style={{ textAlign: 'center', margin: '16px 0' }}>
              {google_calendar_url && (
                <Button href={google_calendar_url} style={btnPrimary}>
                  Adicionar ao Google Calendar
                </Button>
              )}
              {ics_url && (
                <Text style={text}>
                  Outro app de calendário:{' '}
                  <Link href={ics_url} style={linkStyle}>
                    Baixar arquivo .ics
                  </Link>
                </Text>
              )}
            </Section>

            <Text style={textMuted}>
              Caso precise reagendar ou cancelar, responda este e-mail o quanto antes.
            </Text>
          </Section>

          <Section style={footer}>
            <Text style={footerText}>Equipe {SITE_NAME}</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: EntrevistaLembreteEmail,
  subject: (data: Record<string, any>) =>
    (data?.assunto as string) ||
    `Lembrete: ${data?.titulo ?? 'Entrevista'}${data?.vaga ? ` — ${data.vaga}` : ''}`,
  displayName: 'Lembrete de entrevista',
  previewData: {
    nome: 'Joana Silva',
    vaga: 'Designer Pleno',
    titulo: 'Entrevista técnica',
    data_formatada: 'quarta-feira, 30 de abril de 2026 às 14:00 (BRT)',
    modalidade: 'online',
    link_video: 'https://meet.google.com/abc-defg-hij',
    entrevistador: 'Carla Mendes',
    horas_restantes: 24,
    ics_url: 'https://example.com/ics/123',
    google_calendar_url: 'https://calendar.google.com/calendar/render?action=TEMPLATE',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '24px', maxWidth: '560px', margin: '0 auto' }
const header = {
  borderBottom: '2px solid #f59e0b',
  paddingBottom: '12px',
  marginBottom: '20px',
}
const h1 = { fontSize: '20px', fontWeight: 'bold', color: '#0f172a', margin: 0 }
const content = { marginBottom: '24px' }
const text = { fontSize: '14px', color: '#334155', lineHeight: '1.6', margin: '0 0 12px' }
const textStrong = {
  fontSize: '14px',
  color: '#0f172a',
  lineHeight: '1.6',
  fontWeight: 'bold',
  margin: '12px 0 4px',
}
const textMuted = {
  fontSize: '12px',
  color: '#64748b',
  lineHeight: '1.5',
  margin: '12px 0 0',
}
const card = {
  backgroundColor: '#fffbeb',
  border: '1px solid #fde68a',
  borderRadius: '8px',
  padding: '16px',
  margin: '16px 0',
}
const cardTitle = {
  fontSize: '16px',
  fontWeight: 'bold',
  color: '#0f172a',
  margin: '0 0 8px',
}
const cardLine = { fontSize: '14px', color: '#334155', margin: '4px 0' }
const linkStyle = { color: '#3b82f6', textDecoration: 'underline' }
const btnPrimary = {
  backgroundColor: '#f59e0b',
  color: '#ffffff',
  padding: '10px 20px',
  borderRadius: '6px',
  fontSize: '14px',
  fontWeight: 'bold',
  textDecoration: 'none',
  display: 'inline-block',
}
const hr = { borderColor: '#e2e8f0', margin: '20px 0' }
const footer = { borderTop: '1px solid #e2e8f0', paddingTop: '16px' }
const footerText = { fontSize: '12px', color: '#94a3b8', margin: 0 }
