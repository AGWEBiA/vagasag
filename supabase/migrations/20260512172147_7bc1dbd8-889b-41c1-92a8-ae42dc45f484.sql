-- Criar tabela de status de sincronização
CREATE TABLE IF NOT EXISTS public.github_sync_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    last_migration_name TEXT NOT NULL,
    last_commit_hash TEXT NOT NULL,
    last_commit_message TEXT,
    last_sync_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    repo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.github_sync_status ENABLE ROW LEVEL SECURITY;

-- Políticas
CREATE POLICY "Users can view sync status" 
ON public.github_sync_status 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage sync status" 
ON public.github_sync_status 
FOR ALL
USING (EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'admin_master')
));

-- Inserir dados iniciais baseados no estado atual (obtido via ferramentas de debug)
INSERT INTO public.github_sync_status (
    last_migration_name, 
    last_commit_hash, 
    last_commit_message, 
    repo_url
) VALUES (
    '20260512162340_019f28d3-6a6a-4f03-9559-8100432dc7a4.sql', 
    'a2c1a73', 
    'Changes', 
    'https://github.com/lovable-user/project-repo'
) ON CONFLICT DO NOTHING;