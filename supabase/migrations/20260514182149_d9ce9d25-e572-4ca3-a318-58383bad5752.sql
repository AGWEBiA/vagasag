-- Remover a política anterior que estava sendo restritiva demais ou falhando
DROP POLICY IF EXISTS "Staff can view candidatura_respostas" ON public.candidatura_respostas;

-- Criar uma nova política mais direta para usuários autenticados
CREATE POLICY "Staff can view candidatura_respostas" 
ON public.candidatura_respostas 
FOR SELECT 
TO authenticated
USING (true);