-- 1. Adicionar campos em pipeline_estagios
ALTER TABLE public.pipeline_estagios
  ADD COLUMN IF NOT EXISTS auto_score_ativo boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_ativo boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_assunto text,
  ADD COLUMN IF NOT EXISTS email_corpo text;

-- 2. Tabela de templates globais (confirmação de candidatura)
CREATE TABLE IF NOT EXISTS public.email_templates_globais (
  id text PRIMARY KEY,
  assunto text NOT NULL,
  corpo text NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.email_templates_globais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read email_templates_globais"
  ON public.email_templates_globais FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admin manages email_templates_globais"
  ON public.email_templates_globais FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Trigger updated_at
DROP TRIGGER IF EXISTS touch_email_templates_globais ON public.email_templates_globais;
CREATE TRIGGER touch_email_templates_globais
  BEFORE UPDATE ON public.email_templates_globais
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Seed do template de confirmação de candidatura
INSERT INTO public.email_templates_globais (id, assunto, corpo, ativo)
VALUES (
  'candidatura_confirmacao',
  'Recebemos sua candidatura para {{vaga}}',
  E'Olá {{nome}},\n\nRecebemos sua candidatura para a vaga **{{vaga}}** e ela já está em análise pelo nosso time de recrutamento.\n\nVamos avaliar seu perfil com cuidado e retornaremos por aqui assim que houver novidades.\n\nObrigado pelo interesse!\n\nEquipe de Recrutamento'
  , true
)
ON CONFLICT (id) DO NOTHING;