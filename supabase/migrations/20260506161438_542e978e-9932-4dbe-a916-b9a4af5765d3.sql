-- Update RLS for candidatura_logs to be less permissive
DROP POLICY IF EXISTS "Anyone can insert logs" ON public.candidatura_logs;

CREATE POLICY "Public can insert logs for open vagas" 
ON public.candidatura_logs 
FOR INSERT 
TO anon, authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.vagas 
        WHERE id = vaga_id 
        AND status = 'aberta'
    )
);
