CREATE TABLE IF NOT EXISTS public.ai_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL UNIQUE,
  api_key text NOT NULL,
  label text,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage ai_credentials"
ON public.ai_credentials
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER ai_credentials_touch
BEFORE UPDATE ON public.ai_credentials
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();