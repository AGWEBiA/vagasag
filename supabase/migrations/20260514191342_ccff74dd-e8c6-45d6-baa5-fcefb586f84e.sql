-- Garantir que Staff autenticado possa ler TUDO de vaga_perguntas sem depender de ser 'anon' ou 'public'
DROP POLICY IF EXISTS "Allow select for everyone" ON public.vaga_perguntas;
DROP POLICY IF EXISTS "Public and staff can view vaga_perguntas" ON public.vaga_perguntas;
DROP POLICY IF EXISTS "Anon can view vaga_perguntas" ON public.vaga_perguntas;

CREATE POLICY "Vaga perguntas are viewable by everyone" 
ON public.vaga_perguntas 
FOR SELECT 
USING (true);

-- Garantir que Staff autenticado possa ler TUDO de candidatura_respostas
DROP POLICY IF EXISTS "Staff can view all answers" ON public.candidatura_respostas;
DROP POLICY IF EXISTS "Staff can view candidatura_respostas" ON public.candidatura_respostas;

CREATE POLICY "Candidatura respostas are viewable by staff" 
ON public.candidatura_respostas 
FOR SELECT 
TO authenticated
USING (true);
