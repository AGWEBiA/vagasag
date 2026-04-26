-- =========================================================
-- 1. ROLES SYSTEM
-- =========================================================
CREATE TYPE public.app_role AS ENUM ('admin', 'recrutador', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Authenticated can view roles"
  ON public.user_roles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage roles"
  ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =========================================================
-- 2. AUTO-ASSIGN ROLE ON SIGNUP
-- =========================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF lower(NEW.email) = 'agomes78@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'recrutador')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Promote existing user if already registered
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role FROM auth.users
WHERE lower(email) = 'agomes78@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'recrutador'::public.app_role FROM auth.users
WHERE lower(email) = 'agomes78@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- =========================================================
-- 3. AI SETTINGS (single-row config)
-- =========================================================
CREATE TABLE public.ai_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL DEFAULT 'lovable',
  model text NOT NULL DEFAULT 'google/gemini-2.5-flash',
  enabled_providers jsonb NOT NULL DEFAULT '["lovable"]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true
);

ALTER TABLE public.ai_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read ai_settings"
  ON public.ai_settings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage ai_settings"
  ON public.ai_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.ai_settings (provider, model, enabled_providers)
VALUES ('lovable', 'google/gemini-2.5-flash', '["lovable"]'::jsonb);

-- =========================================================
-- 4. VAGAS
-- =========================================================
CREATE TABLE public.vagas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  cargo text NOT NULL,
  descricao text NOT NULL,
  requisitos text,
  beneficios text,
  modalidade text NOT NULL DEFAULT 'remoto',
  localizacao text,
  faixa_salarial text,
  status text NOT NULL DEFAULT 'aberta',
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.vagas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view open vagas"
  ON public.vagas FOR SELECT TO anon, authenticated
  USING (status = 'aberta' OR auth.uid() IS NOT NULL);

CREATE POLICY "Recruiters and admins create vagas"
  ON public.vagas FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = created_by
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'recrutador'))
  );

CREATE POLICY "Owner or admin updates vagas"
  ON public.vagas FOR UPDATE TO authenticated
  USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Owner or admin deletes vagas"
  ON public.vagas FOR DELETE TO authenticated
  USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_vagas_status ON public.vagas(status);
CREATE INDEX idx_vagas_cargo ON public.vagas(cargo);

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_vagas_updated_at
  BEFORE UPDATE ON public.vagas
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =========================================================
-- 5. CANDIDATURAS (public submissions)
-- =========================================================
CREATE TABLE public.candidaturas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vaga_id uuid NOT NULL REFERENCES public.vagas(id) ON DELETE CASCADE,
  nome text NOT NULL,
  email text NOT NULL,
  telefone text,
  linkedin text,
  portfolio text,
  dados_profissionais text NOT NULL,
  informacoes_adicionais text,
  status text NOT NULL DEFAULT 'novo',
  candidate_id uuid REFERENCES public.candidates(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.candidaturas ENABLE ROW LEVEL SECURITY;

-- Public can submit (vaga must be open)
CREATE POLICY "Anyone can apply to open vagas"
  ON public.candidaturas FOR INSERT TO anon, authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.vagas v WHERE v.id = vaga_id AND v.status = 'aberta')
  );

CREATE POLICY "Authenticated view candidaturas"
  ON public.candidaturas FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated update candidaturas"
  ON public.candidaturas FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.vagas v WHERE v.id = vaga_id AND v.created_by = auth.uid())
  );

CREATE POLICY "Admin or vaga owner deletes candidaturas"
  ON public.candidaturas FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.vagas v WHERE v.id = vaga_id AND v.created_by = auth.uid())
  );

CREATE INDEX idx_candidaturas_vaga ON public.candidaturas(vaga_id);
CREATE INDEX idx_candidaturas_status ON public.candidaturas(status);