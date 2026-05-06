CREATE TABLE public.candidatura_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    vaga_id UUID REFERENCES public.vagas(id),
    payload JSONB,
    error TEXT,
    status TEXT NOT NULL, -- 'success', 'error', 'validation_failed'
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.candidatura_logs ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (since applications are public)
CREATE POLICY "Anyone can insert logs" 
ON public.candidatura_logs 
FOR INSERT 
WITH CHECK (true);

-- Allow admins to view logs
CREATE POLICY "Admins can view logs" 
ON public.candidatura_logs 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));
