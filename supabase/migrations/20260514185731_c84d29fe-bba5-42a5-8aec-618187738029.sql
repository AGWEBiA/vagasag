-- Garantir acesso total de leitura para usuários autenticados na tabela de respostas
DROP POLICY IF EXISTS "Staff can view candidatura_respostas" ON public.candidatura_respostas;
CREATE POLICY "Staff can view candidatura_respostas" 
ON public.candidatura_respostas 
FOR SELECT 
TO authenticated 
USING (true);

-- Garantir acesso total de leitura para usuários autenticados na tabela de perguntas
DROP POLICY IF EXISTS "Public and staff can view vaga_perguntas" ON public.vaga_perguntas;
CREATE POLICY "Public and staff can view vaga_perguntas" 
ON public.vaga_perguntas 
FOR SELECT 
TO authenticated 
USING (true);

-- Política adicional para candidatos anônimos verem as perguntas (necessário para o form público)
CREATE POLICY "Anon can view vaga_perguntas" 
ON public.vaga_perguntas 
FOR SELECT 
TO anon 
USING (true);