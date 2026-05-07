-- Add visualizada column
ALTER TABLE public.candidaturas ADD COLUMN IF NOT EXISTS visualizada BOOLEAN DEFAULT FALSE;

-- Ensure foreign keys have CASCADE for clean deletion
DO $$ 
BEGIN
    -- candidatura_respostas
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'candidatura_respostas_candidatura_id_fkey') THEN
        ALTER TABLE public.candidatura_respostas DROP CONSTRAINT candidatura_respostas_candidatura_id_fkey;
    END IF;
    ALTER TABLE public.candidatura_respostas 
    ADD CONSTRAINT candidatura_respostas_candidatura_id_fkey 
    FOREIGN KEY (candidatura_id) REFERENCES public.candidaturas(id) ON DELETE CASCADE;

    -- candidature_eventos
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'candidatura_eventos_candidatura_id_fkey') THEN
        ALTER TABLE public.candidatura_eventos DROP CONSTRAINT candidatura_eventos_candidatura_id_fkey;
    END IF;
    ALTER TABLE public.candidatura_eventos 
    ADD CONSTRAINT candidatura_eventos_candidatura_id_fkey 
    FOREIGN KEY (candidatura_id) REFERENCES public.candidaturas(id) ON DELETE CASCADE;
END $$;

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "LIBERADO_TOTAL" ON public.candidaturas;

-- Create structured RLS policies for candidaturas
CREATE POLICY "Public can insert candidaturas" 
ON public.candidaturas 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Staff can view candidaturas" 
ON public.candidaturas 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'admin_master', 'recrutador', 'lider')
  )
);

CREATE POLICY "Staff can update candidaturas" 
ON public.candidaturas 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'admin_master', 'recrutador', 'lider')
  )
);

CREATE POLICY "Only admin_master can delete candidaturas" 
ON public.candidaturas 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin_master'
  )
);
