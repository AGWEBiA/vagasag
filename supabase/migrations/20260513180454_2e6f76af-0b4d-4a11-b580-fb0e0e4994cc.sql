-- Garante que o papel anon tenha permissão de inserção na tabela candidaturas
DROP POLICY IF EXISTS "Public can insert candidaturas" ON public.candidaturas;

CREATE POLICY "Public can insert candidaturas" 
ON public.candidaturas 
FOR INSERT 
TO public
WITH CHECK (true);

-- Garante permissão para o gatilho log_candidatura_created inserir na candidatura_eventos
DROP POLICY IF EXISTS "Allow anon insertion via trigger" ON public.candidatura_eventos;

CREATE POLICY "Allow insertion for everyone" 
ON public.candidatura_eventos 
FOR INSERT 
TO public
WITH CHECK (true);
