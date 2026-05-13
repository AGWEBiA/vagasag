DROP POLICY IF EXISTS "Public can insert candidaturas" ON public.candidaturas;
CREATE POLICY "Public can insert candidaturas" 
ON public.candidaturas 
FOR INSERT 
TO anon
WITH CHECK (true);

DROP POLICY IF EXISTS "Public can insert respostas" ON public.candidatura_respostas;
CREATE POLICY "Public can insert respostas" 
ON public.candidatura_respostas 
FOR INSERT 
TO anon
WITH CHECK (true);