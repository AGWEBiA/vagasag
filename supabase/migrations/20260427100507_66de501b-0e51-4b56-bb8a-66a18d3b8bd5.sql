
-- Tabela singleton de branding (white label)
CREATE TABLE IF NOT EXISTS public.branding_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  product_name text NOT NULL DEFAULT 'Oportunidades AG WEBi',
  tagline text DEFAULT 'Talent Intelligence',
  logo_horizontal_url text,
  logo_mark_url text,
  favicon_url text,
  primary_color_hsl text NOT NULL DEFAULT '0 70% 35%',
  primary_foreground_hsl text NOT NULL DEFAULT '0 0% 100%',
  accent_color_hsl text NOT NULL DEFAULT '43 86% 47%',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

INSERT INTO public.branding_settings (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.branding_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read branding" ON public.branding_settings;
CREATE POLICY "Anyone can read branding"
  ON public.branding_settings FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins manage branding" ON public.branding_settings;
CREATE POLICY "Admins manage branding"
  ON public.branding_settings FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER branding_settings_touch_updated_at
  BEFORE UPDATE ON public.branding_settings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Bucket público para logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('branding', 'branding', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Branding public read" ON storage.objects;
CREATE POLICY "Branding public read"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'branding');

DROP POLICY IF EXISTS "Branding admin write" ON storage.objects;
CREATE POLICY "Branding admin write"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'branding' AND public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Branding admin update" ON storage.objects;
CREATE POLICY "Branding admin update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'branding' AND public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Branding admin delete" ON storage.objects;
CREATE POLICY "Branding admin delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'branding' AND public.has_role(auth.uid(), 'admin'::app_role));
