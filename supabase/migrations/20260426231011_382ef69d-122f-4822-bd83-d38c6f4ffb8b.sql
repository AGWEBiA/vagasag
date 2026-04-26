-- 1. Banco global de perguntas reutilizáveis
CREATE TABLE public.question_bank (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  texto TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'texto',
  opcoes JSONB NOT NULL DEFAULT '[]'::jsonb,
  cargos_sugeridos TEXT[] NOT NULL DEFAULT '{}',
  ativa BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.question_bank ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated view question_bank"
ON public.question_bank FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admin and recruiter manage question_bank"
ON public.question_bank FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'recrutador'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'recrutador'::app_role));

CREATE TRIGGER touch_question_bank_updated_at
BEFORE UPDATE ON public.question_bank
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Validação de tipo
CREATE OR REPLACE FUNCTION public.validate_question_tipo()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.tipo NOT IN ('texto','escolha','escala') THEN
    RAISE EXCEPTION 'Invalid tipo: %. Must be texto, escolha or escala.', NEW.tipo;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_question_bank_tipo
BEFORE INSERT OR UPDATE ON public.question_bank
FOR EACH ROW EXECUTE FUNCTION public.validate_question_tipo();

-- 2. Perguntas vinculadas a uma vaga
CREATE TABLE public.vaga_perguntas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vaga_id UUID NOT NULL,
  question_bank_id UUID,
  texto TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'texto',
  opcoes JSONB NOT NULL DEFAULT '[]'::jsonb,
  ordem INTEGER NOT NULL DEFAULT 0,
  obrigatoria BOOLEAN NOT NULL DEFAULT true,
  usar_na_ia BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_vaga_perguntas_vaga ON public.vaga_perguntas(vaga_id, ordem);

ALTER TABLE public.vaga_perguntas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view vaga_perguntas of open vagas"
ON public.vaga_perguntas FOR SELECT
TO anon, authenticated
USING (
  EXISTS (SELECT 1 FROM public.vagas v WHERE v.id = vaga_perguntas.vaga_id AND v.status = 'aberta')
  OR auth.uid() IS NOT NULL
);

CREATE POLICY "Admin or vaga owner inserts vaga_perguntas"
ON public.vaga_perguntas FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (SELECT 1 FROM public.vagas v WHERE v.id = vaga_perguntas.vaga_id AND v.created_by = auth.uid())
);

CREATE POLICY "Admin or vaga owner updates vaga_perguntas"
ON public.vaga_perguntas FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (SELECT 1 FROM public.vagas v WHERE v.id = vaga_perguntas.vaga_id AND v.created_by = auth.uid())
);

CREATE POLICY "Admin or vaga owner deletes vaga_perguntas"
ON public.vaga_perguntas FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (SELECT 1 FROM public.vagas v WHERE v.id = vaga_perguntas.vaga_id AND v.created_by = auth.uid())
);

CREATE TRIGGER touch_vaga_perguntas_updated_at
BEFORE UPDATE ON public.vaga_perguntas
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER validate_vaga_perguntas_tipo
BEFORE INSERT OR UPDATE ON public.vaga_perguntas
FOR EACH ROW EXECUTE FUNCTION public.validate_question_tipo();

-- 3. Respostas do candidato
CREATE TABLE public.candidatura_respostas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  candidatura_id UUID NOT NULL,
  vaga_pergunta_id UUID NOT NULL,
  resposta_texto TEXT,
  resposta_numero INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_candidatura_respostas_cand ON public.candidatura_respostas(candidatura_id);
CREATE INDEX idx_candidatura_respostas_pergunta ON public.candidatura_respostas(vaga_pergunta_id);

ALTER TABLE public.candidatura_respostas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert respostas when applying"
ON public.candidatura_respostas FOR INSERT
TO anon, authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.candidaturas c
    JOIN public.vagas v ON v.id = c.vaga_id
    WHERE c.id = candidatura_respostas.candidatura_id
      AND v.status = 'aberta'
  )
  OR auth.uid() IS NOT NULL
);

CREATE POLICY "Authenticated view respostas"
ON public.candidatura_respostas FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admin or vaga owner updates respostas"
ON public.candidatura_respostas FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.candidaturas c
    JOIN public.vagas v ON v.id = c.vaga_id
    WHERE c.id = candidatura_respostas.candidatura_id AND v.created_by = auth.uid()
  )
);

CREATE POLICY "Admin or vaga owner deletes respostas"
ON public.candidatura_respostas FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.candidaturas c
    JOIN public.vagas v ON v.id = c.vaga_id
    WHERE c.id = candidatura_respostas.candidatura_id AND v.created_by = auth.uid()
  )
);

-- 4. Seed do banco global de perguntas (set padrão por cargo)
INSERT INTO public.question_bank (texto, tipo, opcoes, cargos_sugeridos) VALUES
-- Gerais (todos os cargos)
('Por que você quer trabalhar conosco?', 'texto', '[]'::jsonb, ARRAY['designer','gestor_trafego','atendimento_suporte','inside_sales','gestor_projetos','copywriter','social_media','editor_video']),
('Qual sua disponibilidade para iniciar?', 'escolha', '["Imediata","Em até 15 dias","Em até 30 dias","Mais de 30 dias"]'::jsonb, ARRAY['designer','gestor_trafego','atendimento_suporte','inside_sales','gestor_projetos','copywriter','social_media','editor_video']),
('Qual sua pretensão salarial (R$)?', 'texto', '[]'::jsonb, ARRAY['designer','gestor_trafego','atendimento_suporte','inside_sales','gestor_projetos','copywriter','social_media','editor_video']),
('Avalie seu nível de inglês', 'escala', '[]'::jsonb, ARRAY['designer','gestor_trafego','atendimento_suporte','inside_sales','gestor_projetos','copywriter','social_media','editor_video']),

-- Designer
('Compartilhe o link do seu portfólio (Behance, Dribbble, Drive)', 'texto', '[]'::jsonb, ARRAY['designer']),
('Quais ferramentas de design você domina?', 'texto', '[]'::jsonb, ARRAY['designer']),
('Avalie seu domínio de Figma', 'escala', '[]'::jsonb, ARRAY['designer']),
('Já criou criativos para campanhas pagas (Meta/Google Ads)?', 'escolha', '["Sim, com frequência","Sim, eventualmente","Não"]'::jsonb, ARRAY['designer']),

-- Gestor de Tráfego
('Quais plataformas de mídia paga você gerencia?', 'texto', '[]'::jsonb, ARRAY['gestor_trafego']),
('Qual o maior budget mensal que já gerenciou?', 'texto', '[]'::jsonb, ARRAY['gestor_trafego']),
('Avalie seu conhecimento em Meta Ads', 'escala', '[]'::jsonb, ARRAY['gestor_trafego']),
('Avalie seu conhecimento em Google Ads', 'escala', '[]'::jsonb, ARRAY['gestor_trafego']),
('Conte um case de sucesso recente (resultado e ROAS)', 'texto', '[]'::jsonb, ARRAY['gestor_trafego']),

-- Atendimento / Suporte
('Tem experiência com qual ferramenta de atendimento?', 'texto', '[]'::jsonb, ARRAY['atendimento_suporte']),
('Já atendeu via WhatsApp Business / API?', 'escolha', '["Sim","Não"]'::jsonb, ARRAY['atendimento_suporte']),
('Como você lida com um cliente irritado?', 'texto', '[]'::jsonb, ARRAY['atendimento_suporte']),

-- Inside Sales
('Tem experiência com vendas consultivas B2B?', 'escolha', '["Sim, mais de 2 anos","Sim, menos de 2 anos","Não"]'::jsonb, ARRAY['inside_sales']),
('Quais CRMs você já utilizou?', 'texto', '[]'::jsonb, ARRAY['inside_sales']),
('Conte um case de venda complexa que você fechou', 'texto', '[]'::jsonb, ARRAY['inside_sales']),
('Avalie seu domínio em prospecção ativa', 'escala', '[]'::jsonb, ARRAY['inside_sales']),

-- Gestor de Projetos
('Quais metodologias ágeis você utiliza?', 'texto', '[]'::jsonb, ARRAY['gestor_projetos']),
('Quais ferramentas de gestão de projeto você domina?', 'texto', '[]'::jsonb, ARRAY['gestor_projetos']),
('Já gerenciou times multidisciplinares? Quantas pessoas?', 'texto', '[]'::jsonb, ARRAY['gestor_projetos']),

-- Copywriter
('Compartilhe links de textos/cases que você produziu', 'texto', '[]'::jsonb, ARRAY['copywriter']),
('Tem experiência com copy para tráfego pago?', 'escolha', '["Sim","Não"]'::jsonb, ARRAY['copywriter']),

-- Social Media
('Quais redes você gerencia profissionalmente?', 'texto', '[]'::jsonb, ARRAY['social_media']),
('Compartilhe perfis que você administra', 'texto', '[]'::jsonb, ARRAY['social_media']),

-- Editor de Vídeo
('Quais softwares de edição você domina?', 'texto', '[]'::jsonb, ARRAY['editor_video']),
('Compartilhe link de reel/portfólio', 'texto', '[]'::jsonb, ARRAY['editor_video']);

-- 5. Aplicar perguntas padrão às vagas existentes (por cargo)
INSERT INTO public.vaga_perguntas (vaga_id, question_bank_id, texto, tipo, opcoes, ordem, obrigatoria, usar_na_ia)
SELECT
  v.id,
  qb.id,
  qb.texto,
  qb.tipo,
  qb.opcoes,
  ROW_NUMBER() OVER (PARTITION BY v.id ORDER BY qb.created_at) AS ordem,
  true,
  true
FROM public.vagas v
JOIN public.question_bank qb ON v.cargo = ANY(qb.cargos_sugeridos)
WHERE NOT EXISTS (
  SELECT 1 FROM public.vaga_perguntas vp WHERE vp.vaga_id = v.id
);