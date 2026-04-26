-- 2. Coluna origem em candidates
ALTER TABLE public.candidates
  ADD COLUMN IF NOT EXISTS origem text NOT NULL DEFAULT 'candidato'
    CHECK (origem IN ('time', 'candidato'));

CREATE INDEX IF NOT EXISTS idx_candidates_origem ON public.candidates(origem);

-- 3. Atualizar trigger handle_new_user: novo padrão é "colaborador"
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF lower(NEW.email) = 'agomes78@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
    RETURN NEW;
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'colaborador')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$function$;

-- Garantir que o trigger está conectado ao auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Reescrever RLS de candidates
DROP POLICY IF EXISTS "Authenticated can view candidates" ON public.candidates;
DROP POLICY IF EXISTS "Authenticated can insert candidates" ON public.candidates;
DROP POLICY IF EXISTS "Owner can update candidates" ON public.candidates;
DROP POLICY IF EXISTS "Owner can delete candidates" ON public.candidates;

CREATE POLICY "Admin and lider view all candidates"
  ON public.candidates FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'lider')
    OR auth.uid() = created_by
  );

CREATE POLICY "Admin recrutador insert candidates"
  ON public.candidates FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = created_by
    AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'recrutador')
      OR public.has_role(auth.uid(), 'lider')
    )
  );

CREATE POLICY "Admin or owner updates candidates"
  ON public.candidates FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR auth.uid() = created_by
  );

CREATE POLICY "Admin or owner deletes candidates"
  ON public.candidates FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR auth.uid() = created_by
  );

-- 5. Reescrever RLS de assessments
DROP POLICY IF EXISTS "Authenticated can view assessments" ON public.assessments;
DROP POLICY IF EXISTS "Owner can insert assessments" ON public.assessments;
DROP POLICY IF EXISTS "Owner can update assessments" ON public.assessments;
DROP POLICY IF EXISTS "Owner can delete assessments" ON public.assessments;

CREATE POLICY "Admin and lider view all assessments"
  ON public.assessments FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'lider')
    OR EXISTS (
      SELECT 1 FROM public.candidates c
      WHERE c.id = assessments.candidate_id AND c.created_by = auth.uid()
    )
  );

CREATE POLICY "Owner inserts assessments"
  ON public.assessments FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.candidates c
      WHERE c.id = assessments.candidate_id
        AND (
          c.created_by = auth.uid()
          OR public.has_role(auth.uid(), 'admin')
          OR public.has_role(auth.uid(), 'lider')
        )
    )
  );

CREATE POLICY "Owner updates assessments"
  ON public.assessments FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.candidates c
      WHERE c.id = assessments.candidate_id AND c.created_by = auth.uid()
    )
  );

CREATE POLICY "Owner deletes assessments"
  ON public.assessments FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.candidates c
      WHERE c.id = assessments.candidate_id AND c.created_by = auth.uid()
    )
  );
