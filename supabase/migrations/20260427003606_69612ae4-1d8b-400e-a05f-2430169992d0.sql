-- Reforça search_path nas funções helpers para silenciar warnings do linter
ALTER FUNCTION public.log_nota_created() SET search_path = public;
ALTER FUNCTION public.log_atribuicao_change() SET search_path = public;

-- Reforça também em funções pgmq antigas que vieram sem search_path explícito
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public, pgmq;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public, pgmq;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public, pgmq;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public, pgmq;