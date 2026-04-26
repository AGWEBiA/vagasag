-- Permitir colaborador criar candidato do tipo "time" (autoavaliação própria)
DROP POLICY IF EXISTS "Admin recrutador insert candidates" ON public.candidates;

CREATE POLICY "Authenticated insert candidates"
  ON public.candidates FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = created_by
    AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'recrutador')
      OR public.has_role(auth.uid(), 'lider')
      OR (
        -- Colaborador só pode inserir avaliações do próprio time
        origem = 'time'
        AND public.has_role(auth.uid(), 'colaborador')
      )
    )
  );
