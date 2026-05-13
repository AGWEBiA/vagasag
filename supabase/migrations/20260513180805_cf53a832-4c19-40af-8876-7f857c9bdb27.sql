-- Reativa RLS
ALTER TABLE public.candidaturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidatura_respostas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidatura_eventos ENABLE ROW LEVEL SECURITY;

-- Garante que as políticas de inserção existam e funcionem para todos
DROP POLICY IF EXISTS "Public can insert candidaturas" ON public.candidaturas;
CREATE POLICY "Public can insert candidaturas" 
ON public.candidaturas 
FOR INSERT 
TO public
WITH CHECK (true);

DROP POLICY IF EXISTS "Public can insert respostas" ON public.candidatura_respostas;
CREATE POLICY "Public can insert respostas" 
ON public.candidatura_respostas 
FOR INSERT 
TO public
WITH CHECK (true);

DROP POLICY IF EXISTS "Public can insert eventos" ON public.candidatura_eventos;
CREATE POLICY "Public can insert eventos" 
ON public.candidatura_eventos 
FOR INSERT 
TO public
WITH CHECK (true);
