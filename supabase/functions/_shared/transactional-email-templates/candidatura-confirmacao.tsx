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
  corpo?: string
  assunto?: string
}

const CandidaturaConfirmacaoEmail = ({ nome, vaga, corpo }: Props) => {
  const linhas = (corpo ?? '').split('\n')
  return (
    <Html lang="pt-BR" dir="ltr">
      <Head />
      <Preview>
        {vaga ? `Recebemos sua candidatura para ${vaga}` : 'Recebemos sua candidatura'}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={h1}>{SITE_NAME}</Heading>
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
                  Recebemos sua candidatura{vaga ? ` para a vaga ${vaga}` : ''} e ela
                  já está em análise pelo nosso time de recrutamento.
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
  component: CandidaturaConfirmacaoEmail,
  subject: (data: Record<string, any>) =>
    (data?.assunto as string) || 'Recebemos sua candidatura',
  displayName: 'Confirmação de candidatura',
  previewData: {
    nome: 'Joana Silva',
    vaga: 'Designer Pleno',
    assunto: 'Recebemos sua candidatura para Designer Pleno',
    corpo:
      'Olá Joana,\n\nRecebemos sua candidatura para a vaga Designer Pleno e ela já está em análise.\n\nObrigado pelo interesse!',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '24px', maxWidth: '560px', margin: '0 auto' }
const header = { borderBottom: '2px solid #3b82f6', paddingBottom: '12px', marginBottom: '20px' }
const h1 = { fontSize: '20px', fontWeight: 'bold', color: '#0f172a', margin: 0 }
const content = { marginBottom: '24px' }
const text = { fontSize: '14px', color: '#334155', lineHeight: '1.6', margin: '0 0 12px' }
const footer = { borderTop: '1px solid #e2e8f0', paddingTop: '16px' }
const footerText = { fontSize: '12px', color: '#94a3b8', margin: 0 }
