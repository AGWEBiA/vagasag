-- 1. Coluna de evidências comportamentais
ALTER TABLE public.assessments
  ADD COLUMN IF NOT EXISTS evidencias_comportamentais jsonb NOT NULL DEFAULT '[]'::jsonb;

-- 2. Tabela de pesos globais dos pilares (singleton)
CREATE TABLE IF NOT EXISTS public.assessment_pesos (
  id integer PRIMARY KEY DEFAULT 1,
  tecnico numeric(5,2) NOT NULL DEFAULT 30,
  impacto numeric(5,2) NOT NULL DEFAULT 25,
  comportamental numeric(5,2) NOT NULL DEFAULT 20,
  estrategico numeric(5,2) NOT NULL DEFAULT 15,
  lideranca numeric(5,2) NOT NULL DEFAULT 10,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  CONSTRAINT singleton_row CHECK (id = 1),
  CONSTRAINT pesos_somam_100 CHECK (
    abs((tecnico + impacto + comportamental + estrategico + lideranca) - 100) < 0.01
  )
);

INSERT INTO public.assessment_pesos (id) VALUES (1)
  ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.assessment_pesos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated read assessment_pesos" ON public.assessment_pesos;
CREATE POLICY "Authenticated read assessment_pesos"
  ON public.assessment_pesos FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admin manages assessment_pesos" ON public.assessment_pesos;
CREATE POLICY "Admin manages assessment_pesos"
  ON public.assessment_pesos FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER touch_assessment_pesos_updated_at
  BEFORE UPDATE ON public.assessment_pesos
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 3. Índice único parcial: evita duplicar pergunta do banco na mesma vaga
CREATE UNIQUE INDEX IF NOT EXISTS uq_vaga_perguntas_vaga_question_bank
  ON public.vaga_perguntas (vaga_id, question_bank_id)
  WHERE question_bank_id IS NOT NULL;