-- Desabilita RLS temporariamente para limpar tudo
ALTER TABLE public.candidaturas DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidatura_respostas DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidatura_logs DISABLE ROW LEVEL SECURITY;

-- Remove TODAS as políticas de todas as tabelas envolvidas
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public' AND tablename IN ('candidaturas', 'candidatura_respostas', 'candidatura_logs')) 
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.' || quote_ident(r.tablename);
    END LOOP;
END $$;

-- Cria uma única política "LIBERADO" para cada tabela
-- Isso permite TUDO (Insert, Select, Update, Delete) para QUALQUER UM
CREATE POLICY "LIBERADO_TOTAL" ON public.candidaturas FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "LIBERADO_TOTAL" ON public.candidatura_respostas FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "LIBERADO_TOTAL" ON public.candidatura_logs FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Reabilita RLS (obrigatório pelo Supabase), mas com a política de acesso total acima
ALTER TABLE public.candidaturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidatura_respostas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidatura_logs ENABLE ROW LEVEL SECURITY;

-- Garante que as permissões de banco (GRANT) também estejam OK
GRANT ALL ON public.candidaturas TO anon, authenticated, postgres, service_role;
GRANT ALL ON public.candidatura_respostas TO anon, authenticated, postgres, service_role;
GRANT ALL ON public.candidatura_logs TO anon, authenticated, postgres, service_role;
