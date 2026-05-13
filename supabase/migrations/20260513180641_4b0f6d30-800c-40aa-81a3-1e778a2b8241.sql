-- Garante acesso total para inserção no portal público (anon e authenticated)
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

-- Força a limpeza de caches de RLS se necessário
-- (Supabase às vezes precisa disso se houver políticas conflitantes ou roles não sincronizadas)
ALTER TABLE public.candidaturas DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidaturas ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.candidatura_eventos DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidatura_eventos ENABLE ROW LEVEL SECURITY;
