-- Adicionar política de SELECT para candidatura_respostas
CREATE POLICY "Staff can view candidatura_respostas" 
ON public.candidatura_respostas 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role IN ('admin', 'admin_master', 'recrutador', 'lider')
  )
);