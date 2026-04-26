-- Tighten candidate policies
DROP POLICY "Authenticated can update candidates" ON public.candidates;
DROP POLICY "Authenticated can delete candidates" ON public.candidates;

CREATE POLICY "Owner can update candidates"
  ON public.candidates FOR UPDATE TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Owner can delete candidates"
  ON public.candidates FOR DELETE TO authenticated
  USING (auth.uid() = created_by);

-- Tighten assessment policies (insert/update/delete tied to candidate ownership)
DROP POLICY "Authenticated can insert assessments" ON public.assessments;
DROP POLICY "Authenticated can update assessments" ON public.assessments;
DROP POLICY "Authenticated can delete assessments" ON public.assessments;

CREATE POLICY "Owner can insert assessments"
  ON public.assessments FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.candidates c
      WHERE c.id = candidate_id AND c.created_by = auth.uid()
    )
  );

CREATE POLICY "Owner can update assessments"
  ON public.assessments FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.candidates c
      WHERE c.id = candidate_id AND c.created_by = auth.uid()
    )
  );

CREATE POLICY "Owner can delete assessments"
  ON public.assessments FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.candidates c
      WHERE c.id = candidate_id AND c.created_by = auth.uid()
    )
  );