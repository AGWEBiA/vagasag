-- 1. Add talent bank fields to candidaturas
ALTER TABLE public.candidaturas
  ADD COLUMN IF NOT EXISTS talent_status text NOT NULL DEFAULT 'candidato',
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS skills text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS notes text;

-- Validation: talent_status allowed values
CREATE OR REPLACE FUNCTION public.validate_talent_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.talent_status NOT IN ('candidato','em_processo','contratado','descartado','colaborador') THEN
    RAISE EXCEPTION 'Invalid talent_status: %', NEW.talent_status;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_talent_status_trg ON public.candidaturas;
CREATE TRIGGER validate_talent_status_trg
BEFORE INSERT OR UPDATE ON public.candidaturas
FOR EACH ROW EXECUTE FUNCTION public.validate_talent_status();

-- Indexes for search/filters
CREATE INDEX IF NOT EXISTS idx_candidaturas_email_lower ON public.candidaturas (lower(email));
CREATE INDEX IF NOT EXISTS idx_candidaturas_talent_status ON public.candidaturas (talent_status);
CREATE INDEX IF NOT EXISTS idx_candidaturas_tags ON public.candidaturas USING gin (tags);
CREATE INDEX IF NOT EXISTS idx_candidaturas_skills ON public.candidaturas USING gin (skills);

-- 2. Auto-detection: when a user becomes 'colaborador', mark matching candidaturas
CREATE OR REPLACE FUNCTION public.sync_candidatura_on_colaborador()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email text;
BEGIN
  IF NEW.role = 'colaborador' THEN
    SELECT email INTO user_email FROM auth.users WHERE id = NEW.user_id;
    IF user_email IS NOT NULL THEN
      UPDATE public.candidaturas
        SET talent_status = 'colaborador'
        WHERE lower(email) = lower(user_email)
          AND talent_status <> 'colaborador';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_candidatura_on_colaborador_trg ON public.user_roles;
CREATE TRIGGER sync_candidatura_on_colaborador_trg
AFTER INSERT ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.sync_candidatura_on_colaborador();

-- Backfill: mark existing collaborators
UPDATE public.candidaturas c
   SET talent_status = 'colaborador'
  FROM public.user_roles ur
  JOIN auth.users u ON u.id = ur.user_id
 WHERE ur.role = 'colaborador'
   AND lower(c.email) = lower(u.email)
   AND c.talent_status <> 'colaborador';