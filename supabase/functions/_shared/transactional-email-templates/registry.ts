/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
}

import { template as candidaturaConfirmacao } from './candidatura-confirmacao.tsx'
import { template as estagioGenerico } from './estagio-generico.tsx'
import { template as entrevistaConvite } from './entrevista-convite.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'candidatura-confirmacao': candidaturaConfirmacao,
  'estagio-generico': estagioGenerico,
  'entrevista-convite': entrevistaConvite,
}
