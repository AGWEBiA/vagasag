import * as React from 'npm:react@18.3.1'
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Banco de Talentos AG'

interface Props {
  nome?: string
  vaga?: string
  estagio?: string
  corpo?: string
  assunto?: string
  cor?: string
}

/**
 * Template genérico usado para emails de mudança de estágio.
 * Recebe assunto e corpo já interpolados (variáveis substituídas no cliente).
 * Suporta múltiplos parágrafos via \n\n no corpo.
 */
const EstagioGenericoEmail = ({ nome, vaga, estagio, corpo, cor }: Props) => {
  const linhas = (corpo ?? '').split('\n')
  const accentColor = cor || '#3b82f6'
  return (
    <Html lang="pt-BR" dir="ltr">
      <Head />
      <Preview>
        {estagio
          ? `Atualização sobre sua candidatura: ${estagio}`
          : 'Atualização sobre sua candidatura'}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={{ ...header, borderBottomColor: accentColor }}>
            <Heading style={h1}>{SITE_NAME}</Heading>
            {vaga && <Text style={subtitle}>Vaga: {vaga}</Text>}
          </Section>
          <Section style={content}>
            {linhas.map((linha, i) => (
              <Text key={i} style={text}>
                {linha || '\u00a0'}
              </Text>
            ))}
            {!corpo && (
              <>
                <Text style={text}>Olá {nome ?? ''},</Text>
                <Text style={text}>
                  Sua candidatura{vaga ? ` para ${vaga}` : ''} foi atualizada
                  {estagio ? ` para o estágio "${estagio}"` : ''}.
                </Text>
              </>
            )}
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
  component: EstagioGenericoEmail,
  subject: (data: Record<string, any>) =>
    (data?.assunto as string) || 'Atualização sobre sua candidatura',
  displayName: 'Mudança de estágio (genérico)',
  previewData: {
    nome: 'Joana Silva',
    vaga: 'Designer Pleno',
    estagio: 'Entrevista',
    cor: '#3b82f6',
    assunto: 'Convite para entrevista — Designer Pleno',
    corpo:
      'Olá Joana,\n\nGostamos muito do seu perfil e queremos te conhecer melhor!\n\nGostaríamos de marcar uma entrevista. Qual sua disponibilidade essa semana?',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '24px', maxWidth: '560px', margin: '0 auto' }
const header = { borderBottom: '2px solid #3b82f6', paddingBottom: '12px', marginBottom: '20px' }
const h1 = { fontSize: '20px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 4px' }
const subtitle = { fontSize: '12px', color: '#64748b', margin: 0 }
const content = { marginBottom: '24px' }
const text = { fontSize: '14px', color: '#334155', lineHeight: '1.6', margin: '0 0 12px' }
const footer = { borderTop: '1px solid #e2e8f0', paddingTop: '16px' }
const footerText = { fontSize: '12px', color: '#94a3b8', margin: 0 }
