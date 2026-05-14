-- 1. Garantir que vaga_perguntas seja legível por todos (Público e Staff) sem travas
DROP POLICY IF EXISTS "Anon can view vaga_perguntas" ON public.vaga_perguntas;
DROP POLICY IF EXISTS "Public and staff can view vaga_perguntas" ON public.vaga_perguntas;

CREATE POLICY "Allow select for everyone" 
ON public.vaga_perguntas 
FOR SELECT 
USING (true);

-- 2. Garantir que candidatura_respostas seja legível por todo Staff
DROP POLICY IF EXISTS "Staff can view candidatura_respostas" ON public.candidatura_respostas;

CREATE POLICY "Staff can view all answers" 
ON public.candidatura_respostas 
FOR SELECT 
TO authenticated
USING (true);

-- 3. Reforçar a visualização de candidaturas para Staff
DROP POLICY IF EXISTS "Staff can view candidaturas" ON public.candidaturas;

CREATE POLICY "Staff can view all applications" 
ON public.candidaturas 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'admin_master', 'recrutador', 'lider')
  )
);
