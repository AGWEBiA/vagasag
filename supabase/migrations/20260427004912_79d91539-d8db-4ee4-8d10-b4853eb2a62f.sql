-- Índices para Analytics (filtros vaga + período)
CREATE INDEX IF NOT EXISTS idx_candidaturas_vaga_created
  ON public.candidaturas (vaga_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_candidaturas_estagio
  ON public.candidaturas (estagio_id);

CREATE INDEX IF NOT EXISTS idx_candidatura_eventos_tipo_created
  ON public.candidatura_eventos (tipo, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_candidatura_eventos_candidatura
  ON public.candidatura_eventos (candidatura_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_assessments_candidate_created
  ON public.assessments (candidate_id, created_at DESC);

-- Índices para lembretes de entrevista
CREATE INDEX IF NOT EXISTS idx_entrevistas_status_inicio
  ON public.entrevistas (status, data_inicio);

CREATE INDEX IF NOT EXISTS idx_entrevistas_vaga
  ON public.entrevistas (vaga_id);

-- Colunas de lembrete
ALTER TABLE public.entrevistas
  ADD COLUMN IF NOT EXISTS horas_antes_lembrete INTEGER NOT NULL DEFAULT 24,
  ADD COLUMN IF NOT EXISTS lembrete_enviado_em TIMESTAMPTZ;
