-- Adiciona coluna slug
ALTER TABLE public.vagas ADD COLUMN slug TEXT UNIQUE;

-- Cria índice para busca por slug
CREATE INDEX idx_vagas_slug ON public.vagas(slug);

-- Atualiza slugs existentes
UPDATE public.vagas 
SET slug = lower(regexp_replace(titulo, '[^a-zA-Z0-9]+', '-', 'g')) 
WHERE slug IS NULL;

-- Garante que o slug não comece ou termine com hífen e não tenha múltiplos hífens
UPDATE public.vagas
SET slug = trim(both '-' from regexp_replace(slug, '-+', '-', 'g'))
WHERE slug IS NOT NULL;

-- Adiciona restrição de não nulo após popular
-- ALTER TABLE public.vagas ALTER COLUMN slug SET NOT NULL; -- Removido para evitar erros se houver falha no update
