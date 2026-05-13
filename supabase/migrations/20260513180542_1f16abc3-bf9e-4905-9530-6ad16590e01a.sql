-- Aplica permissões amplas para inserção no portal público
DROP POLICY IF EXISTS "Public can insert candidaturas" ON public.candidaturas;
CREATE POLICY "Public can insert candidaturas" 
ON public.candidaturas 
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "LIBERADO_TOTAL" ON public.candidatura_respostas;
CREATE POLICY "Public can insert respostas" 
ON public.candidatura_respostas 
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow insertion for everyone" ON public.candidatura_eventos;
CREATE POLICY "Public can insert eventos" 
ON public.candidatura_eventos 
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);
