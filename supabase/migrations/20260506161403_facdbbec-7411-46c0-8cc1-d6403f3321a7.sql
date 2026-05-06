-- Revise policies for candidaturas
DROP POLICY IF EXISTS "Anyone can apply to open vagas" ON public.candidaturas;

CREATE POLICY "Public can apply to open vagas" 
ON public.candidaturas 
FOR INSERT 
TO anon, authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.vagas 
        WHERE id = vaga_id 
        AND status = 'aberta'
    )
);

-- Revise policies for candidatura_respostas
DROP POLICY IF EXISTS "Anyone can insert respostas when applying" ON public.candidatura_respostas;

CREATE POLICY "Public can insert respostas" 
ON public.candidatura_respostas 
FOR INSERT 
TO anon, authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.candidaturas c
        JOIN public.vagas v ON v.id = c.vaga_id
        WHERE c.id = candidatura_id 
        AND v.status = 'aberta'
    )
);

-- Ensure RLS is active
ALTER TABLE public.candidaturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidatura_respostas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidatura_logs ENABLE ROW LEVEL SECURITY;
