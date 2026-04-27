ALTER TABLE public.branding_settings
  ADD COLUMN IF NOT EXISTS autoaval_slug TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS autoaval_titulo TEXT DEFAULT 'Conte sobre sua trajetória',
  ADD COLUMN IF NOT EXISTS autoaval_descricao TEXT DEFAULT 'Suas respostas vão ajudar a liderança a entender seu nível atual e mapear oportunidades de crescimento. Apenas administradores e líderes verão sua avaliação.';

UPDATE public.branding_settings
  SET autoaval_slug = COALESCE(autoaval_slug, 'time-ag-webi')
  WHERE id = 1;