-- ============ Notas internas por candidatura ============
CREATE TABLE public.candidatura_notas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  candidatura_id UUID NOT NULL REFERENCES public.candidaturas(id) ON DELETE CASCADE,
  autor_id UUID NOT NULL,
  autor_nome TEXT,
  texto TEXT NOT NULL,
  mencionados UUID[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.candidatura_notas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated view notas"
  ON public.candidatura_notas FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated insert notas"
  ON public.candidatura_notas FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = autor_id);

CREATE POLICY "Author or admin updates notas"
  ON public.candidatura_notas FOR UPDATE TO authenticated
  USING (auth.uid() = autor_id OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Author or admin deletes notas"
  ON public.candidatura_notas FOR DELETE TO authenticated
  USING (auth.uid() = autor_id OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_candidatura_notas_candidatura ON public.candidatura_notas(candidatura_id, created_at DESC);

CREATE TRIGGER touch_candidatura_notas
  BEFORE UPDATE ON public.candidatura_notas
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Loga evento timeline ao criar nota
CREATE OR REPLACE FUNCTION public.log_nota_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.candidatura_eventos (candidatura_id, tipo, descricao, ator_id, ator_nome, dados)
  VALUES (
    NEW.candidatura_id,
    'nota_adicionada',
    LEFT(NEW.texto, 120),
    NEW.autor_id,
    NEW.autor_nome,
    jsonb_build_object('nota_id', NEW.id, 'mencionados', NEW.mencionados)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_nota_created
  AFTER INSERT ON public.candidatura_notas
  FOR EACH ROW EXECUTE FUNCTION public.log_nota_created();

-- ============ Catálogo de tags ============
CREATE TABLE public.tag_definicoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL UNIQUE,
  cor TEXT NOT NULL DEFAULT '#6b7280',
  descricao TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.tag_definicoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated view tag_definicoes"
  ON public.tag_definicoes FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin and recrutador manage tag_definicoes"
  ON public.tag_definicoes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'recrutador'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'recrutador'::app_role));

CREATE TRIGGER touch_tag_definicoes
  BEFORE UPDATE ON public.tag_definicoes
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Tags iniciais úteis
INSERT INTO public.tag_definicoes (nome, cor, descricao) VALUES
  ('top-talent', '#facc15', 'Candidato de alto potencial'),
  ('reaproveitar', '#10b981', 'Manter no radar para próximas vagas'),
  ('sem-fit-cultural', '#ef4444', 'Avaliação cultural negativa'),
  ('senior-tecnico', '#3b82f6', 'Forte tecnicamente'),
  ('precisa-feedback', '#f97316', 'Aguardando feedback do time')
ON CONFLICT (nome) DO NOTHING;

-- ============ Atribuição de recrutador responsável ============
CREATE TABLE public.candidatura_atribuicoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  candidatura_id UUID NOT NULL REFERENCES public.candidaturas(id) ON DELETE CASCADE UNIQUE,
  recrutador_id UUID NOT NULL,
  recrutador_nome TEXT,
  atribuido_por UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.candidatura_atribuicoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated view atribuicoes"
  ON public.candidatura_atribuicoes FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin or vaga owner inserts atribuicoes"
  ON public.candidatura_atribuicoes FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role) OR
    EXISTS (
      SELECT 1 FROM public.candidaturas c JOIN public.vagas v ON v.id = c.vaga_id
      WHERE c.id = candidatura_atribuicoes.candidatura_id AND v.created_by = auth.uid()
    )
  );

CREATE POLICY "Admin or vaga owner updates atribuicoes"
  ON public.candidatura_atribuicoes FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role) OR
    EXISTS (
      SELECT 1 FROM public.candidaturas c JOIN public.vagas v ON v.id = c.vaga_id
      WHERE c.id = candidatura_atribuicoes.candidatura_id AND v.created_by = auth.uid()
    )
  );

CREATE POLICY "Admin or vaga owner deletes atribuicoes"
  ON public.candidatura_atribuicoes FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role) OR
    EXISTS (
      SELECT 1 FROM public.candidaturas c JOIN public.vagas v ON v.id = c.vaga_id
      WHERE c.id = candidatura_atribuicoes.candidatura_id AND v.created_by = auth.uid()
    )
  );

CREATE TRIGGER touch_candidatura_atribuicoes
  BEFORE UPDATE ON public.candidatura_atribuicoes
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Loga evento ao atribuir
CREATE OR REPLACE FUNCTION public.log_atribuicao_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.candidatura_eventos (candidatura_id, tipo, descricao, ator_id, dados)
  VALUES (
    NEW.candidatura_id,
    'atribuido',
    'Atribuído a ' || COALESCE(NEW.recrutador_nome, NEW.recrutador_id::text),
    NEW.atribuido_por,
    jsonb_build_object('recrutador_id', NEW.recrutador_id, 'recrutador_nome', NEW.recrutador_nome)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_atribuicao_insert
  AFTER INSERT ON public.candidatura_atribuicoes
  FOR EACH ROW EXECUTE FUNCTION public.log_atribuicao_change();

CREATE TRIGGER trg_log_atribuicao_update
  AFTER UPDATE OF recrutador_id ON public.candidatura_atribuicoes
  FOR EACH ROW
  WHEN (OLD.recrutador_id IS DISTINCT FROM NEW.recrutador_id)
  EXECUTE FUNCTION public.log_atribuicao_change();

-- ============ Índices para Banco de Talentos avançado ============
CREATE INDEX IF NOT EXISTS idx_candidaturas_skills_gin ON public.candidaturas USING GIN(skills);
CREATE INDEX IF NOT EXISTS idx_candidaturas_tags_gin ON public.candidaturas USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_candidaturas_talent_status ON public.candidaturas(talent_status);
CREATE INDEX IF NOT EXISTS idx_candidaturas_estagio ON public.candidaturas(estagio_id);
CREATE INDEX IF NOT EXISTS idx_candidaturas_created_at ON public.candidaturas(created_at DESC);