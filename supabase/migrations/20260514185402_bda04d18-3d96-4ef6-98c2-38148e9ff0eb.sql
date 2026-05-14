-- Remover a política restritiva que dependia do status da vaga
DROP POLICY IF EXISTS "Anyone can view vaga_perguntas of open vagas" ON public.vaga_perguntas;

-- Criar uma nova política que permite leitura pública (para candidatos) 
-- e leitura total para usuários autenticados (para o painel admin)
CREATE POLICY "Public and staff can view vaga_perguntas" 
ON public.vaga_perguntas 
FOR SELECT 
USING (true);