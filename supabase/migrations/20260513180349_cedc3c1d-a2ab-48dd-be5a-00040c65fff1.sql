-- Permite que o gatilho log_candidatura_created insira na tabela candidatura_eventos
-- mesmo quando o usuário não está autenticado (anon).
-- O gatilho roda com as permissões do usuário que fez a ação (anon).

CREATE POLICY "Allow anon insertion via trigger" 
ON public.candidatura_eventos 
FOR INSERT 
TO anon
WITH CHECK (true);

-- Também garantindo que o anon possa inserir na candidatura_respostas se necessário
-- (Vimos que a política LIBERADO_TOTAL já cobria isso, mas é bom reforçar se houver dúvida)
-- Já existe: map[cmd:ALL permissive:PERMISSIVE policyname:LIBERADO_TOTAL qual:true roles:{anon,authenticated} schemaname:public tablename:candidatura_respostas with_check:true]
