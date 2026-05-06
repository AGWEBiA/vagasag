-- Ensure RLS is definitely enabled
ALTER TABLE public.candidaturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidatura_respostas ENABLE ROW LEVEL SECURITY;

-- Drop ALL previous policies to start from a clean state
DROP POLICY IF EXISTS "Public can apply to open vagas" ON public.candidaturas;
DROP POLICY IF EXISTS "Anyone can apply to open vagas" ON public.candidaturas;
DROP POLICY IF EXISTS "Authenticated view candidaturas" ON public.candidaturas;
DROP POLICY IF EXISTS "Authenticated update candidaturas" ON public.candidaturas;
DROP POLICY IF EXISTS "Admin or vaga owner deletes candidaturas" ON public.candidaturas;

-- 1. Definitive INSERT policy for candidaturas (allowing everyone to apply)
CREATE POLICY "candidaturas_insert_public" 
ON public.candidaturas 
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);

-- 2. Internal view policy for team members
CREATE POLICY "candidaturas_select_internal" 
ON public.candidaturas 
FOR SELECT 
TO authenticated
USING (true);

-- 3. Update/Delete policies for admins/owners
CREATE POLICY "candidaturas_modify_admin" 
ON public.candidaturas 
FOR ALL
TO authenticated
USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    EXISTS (SELECT 1 FROM public.vagas v WHERE v.id = vaga_id AND v.created_by = auth.uid())
);


-- REPEAT FOR RESPONSES
DROP POLICY IF EXISTS "Public can insert respostas" ON public.candidatura_respostas;
DROP POLICY IF EXISTS "Anyone can insert respostas when applying" ON public.candidatura_respostas;
DROP POLICY IF EXISTS "Authenticated view respostas" ON public.candidatura_respostas;
DROP POLICY IF EXISTS "Admin or vaga owner updates respostas" ON public.candidatura_respostas;
DROP POLICY IF EXISTS "Admin or vaga owner deletes respostas" ON public.candidatura_respostas;

-- 1. Definitive INSERT policy for answers
CREATE POLICY "respostas_insert_public" 
ON public.candidatura_respostas 
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);

-- 2. Internal view policy for team members
CREATE POLICY "respostas_select_internal" 
ON public.candidatura_respostas 
FOR SELECT 
TO authenticated
USING (true);

-- 3. Modify policy
CREATE POLICY "respostas_modify_admin" 
ON public.candidatura_respostas 
FOR ALL
TO authenticated
USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    EXISTS (
        SELECT 1 FROM public.candidaturas c
        JOIN public.vagas v ON v.id = c.vaga_id
        WHERE c.id = candidatura_id AND v.created_by = auth.uid()
    )
);
