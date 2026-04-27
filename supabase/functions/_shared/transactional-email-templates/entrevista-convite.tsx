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
  descricao?: string
  ics_url?: string
  google_calendar_url?: string
  assunto?: string
}

const EntrevistaConviteEmail = ({
  nome,
  vaga,
  titulo,
  data_formatada,
  modalidade,
  local,
  link_video,
  entrevistador,
  descricao,
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

  return (
    <Html lang="pt-BR" dir="ltr">
      <Head />
      <Preview>
        {`Convite: ${titulo ?? 'Entrevista'}${vaga ? ` — ${vaga}` : ''}`}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={h1}>{SITE_NAME}</Heading>
          </Section>

          <Section style={content}>
            <Text style={text}>Olá {nome ?? ''},</Text>
            <Text style={text}>
              Você está convidado(a) para uma entrevista
              {vaga ? ` referente à vaga ${vaga}` : ''}.
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

            {descricao && (
              <>
                <Text style={textStrong}>Mais informações:</Text>
                <Text style={text}>{descricao}</Text>
              </>
            )}

            <Hr style={hr} />

            <Text style={textStrong}>Adicione ao seu calendário:</Text>
            <Section style={{ textAlign: 'center', margin: '16px 0' }}>
              {google_calendar_url && (
                <Button href={google_calendar_url} style={btnPrimary}>
                  Adicionar ao Google Calendar
                </Button>
              )}
              {ics_url && (
                <Text style={text}>
                  Outro app de calendário (Outlook, Apple, etc.):{' '}
                  <Link href={ics_url} style={linkStyle}>
                    Baixar arquivo .ics
                  </Link>
                </Text>
              )}
            </Section>

            <Text style={textMuted}>
              Caso precise reagendar ou cancelar, responda este e-mail.
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
  component: EntrevistaConviteEmail,
  subject: (data: Record<string, any>) =>
    (data?.assunto as string) ||
    `Convite: ${data?.titulo ?? 'Entrevista'}${data?.vaga ? ` — ${data.vaga}` : ''}`,
  displayName: 'Convite de entrevista',
  previewData: {
    nome: 'Joana Silva',
    vaga: 'Designer Pleno',
    titulo: 'Entrevista técnica',
    data_formatada: 'quarta-feira, 30 de abril de 2026 às 14:00 (BRT)',
    modalidade: 'online',
    link_video: 'https://meet.google.com/abc-defg-hij',
    entrevistador: 'Carla Mendes',
    descricao: 'Conversa com o time técnico para discutir experiências e cases.',
    ics_url: 'https://example.com/ics/123',
    google_calendar_url: 'https://calendar.google.com/calendar/render?action=TEMPLATE',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '24px', maxWidth: '560px', margin: '0 auto' }
const header = {
  borderBottom: '2px solid #3b82f6',
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
  backgroundColor: '#f8fafc',
  border: '1px solid #e2e8f0',
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
  backgroundColor: '#3b82f6',
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
