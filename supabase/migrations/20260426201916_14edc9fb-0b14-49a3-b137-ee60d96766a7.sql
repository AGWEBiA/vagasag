-- Candidates table
CREATE TABLE public.candidates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  cargo TEXT NOT NULL CHECK (cargo IN (
    'gestor_trafego','copywriter','designer','web_designer',
    'desenvolvedor','social_media_manager','seo_specialist'
  )),
  dados_profissionais TEXT NOT NULL,
  informacoes_adicionais TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Assessments table
CREATE TABLE public.assessments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  senioridade_detectada TEXT NOT NULL CHECK (senioridade_detectada IN ('Junior','Pleno','Senior')),
  confidence_score INTEGER NOT NULL CHECK (confidence_score BETWEEN 0 AND 100),
  nota_ponderada NUMERIC(4,2) NOT NULL,
  analise_pilares JSONB NOT NULL,
  pontos_fortes JSONB NOT NULL,
  gaps_identificados JSONB NOT NULL,
  perguntas_entrevista JSONB NOT NULL,
  resumo_executivo TEXT NOT NULL,
  model_used TEXT NOT NULL DEFAULT 'google/gemini-2.5-flash',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_assessments_candidate ON public.assessments(candidate_id);
CREATE INDEX idx_assessments_created ON public.assessments(created_at DESC);
CREATE INDEX idx_candidates_created ON public.candidates(created_at DESC);

-- Enable RLS
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;

-- Policies: any authenticated user can manage (internal agency tool)
CREATE POLICY "Authenticated can view candidates"
  ON public.candidates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert candidates"
  ON public.candidates FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Authenticated can update candidates"
  ON public.candidates FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete candidates"
  ON public.candidates FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated can view assessments"
  ON public.assessments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert assessments"
  ON public.assessments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update assessments"
  ON public.assessments FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete assessments"
  ON public.assessments FOR DELETE TO authenticated USING (true);