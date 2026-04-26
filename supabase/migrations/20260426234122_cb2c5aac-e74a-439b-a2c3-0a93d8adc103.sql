-- ============================================================
-- FASE 1 DO ATS: PIPELINE KANBAN
-- ============================================================

-- 1) Tabela de estágios globais
CREATE TABLE public.pipeline_estagios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  ordem INTEGER NOT NULL DEFAULT 0,
  cor TEXT NOT NULL DEFAULT '#6b7280',
  tipo TEXT NOT NULL DEFAULT 'intermediario',
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pipeline_estagios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated view pipeline_estagios"
  ON public.pipeline_estagios FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin manages pipeline_estagios"
  ON public.pipeline_estagios FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Trigger updated_at
CREATE TRIGGER trg_pipeline_estagios_updated
  BEFORE UPDATE ON public.pipeline_estagios
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Validação do tipo
CREATE OR REPLACE FUNCTION public.validate_estagio_tipo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.tipo NOT IN ('inicial','intermediario','final_aprovado','final_reprovado') THEN
    RAISE EXCEPTION 'Invalid estagio tipo: %. Must be inicial, intermediario, final_aprovado or final_reprovado.', NEW.tipo;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_estagio_tipo
  BEFORE INSERT OR UPDATE ON public.pipeline_estagios
  FOR EACH ROW EXECUTE FUNCTION public.validate_estagio_tipo();

-- 2) Seed dos estágios padrão
INSERT INTO public.pipeline_estagios (nome, ordem, cor, tipo) VALUES
  ('Novo',        10, '#3b82f6', 'inicial'),
  ('Triagem',     20, '#8b5cf6', 'intermediario'),
  ('Entrevista',  30, '#f59e0b', 'intermediario'),
  ('Teste',       40, '#06b6d4', 'intermediario'),
  ('Proposta',    50, '#10b981', 'intermediario'),
  ('Contratado',  60, '#16a34a', 'final_aprovado'),
  ('Reprovado',   70, '#ef4444', 'final_reprovado');

-- 3) Coluna estagio_id em candidaturas
ALTER TABLE public.candidaturas
  ADD COLUMN estagio_id UUID REFERENCES public.pipeline_estagios(id) ON DELETE SET NULL,
  ADD COLUMN estagio_atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now();

-- Backfill: todas as candidaturas existentes vão para "Novo"
UPDATE public.candidaturas
SET estagio_id = (SELECT id FROM public.pipeline_estagios WHERE nome = 'Novo' LIMIT 1);

CREATE INDEX idx_candidaturas_estagio ON public.candidaturas(estagio_id);
CREATE INDEX idx_candidaturas_vaga_estagio ON public.candidaturas(vaga_id, estagio_id);

-- 4) Tabela de eventos (auditoria + timeline para Fase 2)
CREATE TABLE public.candidatura_eventos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  candidatura_id UUID NOT NULL,
  tipo TEXT NOT NULL,
  descricao TEXT,
  ator_id UUID,
  ator_nome TEXT,
  dados JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_candidatura_eventos_cand ON public.candidatura_eventos(candidatura_id, created_at DESC);

ALTER TABLE public.candidatura_eventos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated view candidatura_eventos"
  ON public.candidatura_eventos FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin or vaga owner inserts eventos"
  ON public.candidatura_eventos FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.candidaturas c
      JOIN public.vagas v ON v.id = c.vaga_id
      WHERE c.id = candidatura_eventos.candidatura_id
        AND v.created_by = auth.uid()
    )
  );

CREATE POLICY "Admin or vaga owner deletes eventos"
  ON public.candidatura_eventos FOR DELETE
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.candidaturas c
      JOIN public.vagas v ON v.id = c.vaga_id
      WHERE c.id = candidatura_eventos.candidatura_id
        AND v.created_by = auth.uid()
    )
  );

-- 5) Trigger: registra mudança de estágio automaticamente
CREATE OR REPLACE FUNCTION public.log_candidatura_estagio_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_nome TEXT;
  v_new_nome TEXT;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.estagio_id IS DISTINCT FROM OLD.estagio_id THEN
    SELECT nome INTO v_old_nome FROM public.pipeline_estagios WHERE id = OLD.estagio_id;
    SELECT nome INTO v_new_nome FROM public.pipeline_estagios WHERE id = NEW.estagio_id;

    NEW.estagio_atualizado_em := now();

    INSERT INTO public.candidatura_eventos (candidatura_id, tipo, descricao, ator_id, dados)
    VALUES (
      NEW.id,
      'mudou_estagio',
      COALESCE('De "' || COALESCE(v_old_nome,'—') || '" para "' || COALESCE(v_new_nome,'—') || '"', 'Mudança de estágio'),
      auth.uid(),
      jsonb_build_object(
        'estagio_anterior_id', OLD.estagio_id,
        'estagio_anterior_nome', v_old_nome,
        'estagio_novo_id', NEW.estagio_id,
        'estagio_novo_nome', v_new_nome
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_candidatura_estagio
  BEFORE UPDATE ON public.candidaturas
  FOR EACH ROW EXECUTE FUNCTION public.log_candidatura_estagio_change();

-- 6) Trigger: registra criação inicial da candidatura como evento
CREATE OR REPLACE FUNCTION public.log_candidatura_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.candidatura_eventos (candidatura_id, tipo, descricao, dados)
  VALUES (
    NEW.id,
    'candidatou_se',
    'Candidatura recebida via portal',
    jsonb_build_object('vaga_id', NEW.vaga_id, 'email', NEW.email)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_candidatura_created
  AFTER INSERT ON public.candidaturas
  FOR EACH ROW EXECUTE FUNCTION public.log_candidatura_created();