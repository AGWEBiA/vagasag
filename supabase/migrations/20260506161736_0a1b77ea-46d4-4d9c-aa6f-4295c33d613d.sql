-- Forcefully drop and recreate with simplest possible check
DROP POLICY IF EXISTS "Public can apply to open vagas" ON public.candidaturas;
DROP POLICY IF EXISTS "Anyone can apply to open vagas" ON public.candidaturas;

CREATE POLICY "Public can apply to open vagas" 
ON public.candidaturas 
FOR INSERT 
TO anon, authenticated
WITH CHECK (
  vaga_id IN (SELECT id FROM public.vagas WHERE status = 'aberta')
);

-- Do the same for responses
DROP POLICY IF EXISTS "Public can insert respostas" ON public.candidatura_respostas;
DROP POLICY IF EXISTS "Anyone can insert respostas when applying" ON public.candidatura_respostas;

CREATE POLICY "Public can insert respostas" 
ON public.candidatura_respostas 
FOR INSERT 
TO anon, authenticated
WITH CHECK (
  candidatura_id IN (
    SELECT c.id FROM public.candidaturas c
    JOIN public.vagas v ON v.id = c.vaga_id
    WHERE v.status = 'aberta'
  )
);
