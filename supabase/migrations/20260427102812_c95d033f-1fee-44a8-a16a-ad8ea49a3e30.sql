ALTER TABLE public.branding_settings
  ADD COLUMN IF NOT EXISTS logo_mobile_url TEXT,
  ADD COLUMN IF NOT EXISTS font_heading TEXT NOT NULL DEFAULT 'Plus Jakarta Sans',
  ADD COLUMN IF NOT EXISTS font_body TEXT NOT NULL DEFAULT 'Inter',
  ADD COLUMN IF NOT EXISTS font_heading_weight TEXT NOT NULL DEFAULT '600';