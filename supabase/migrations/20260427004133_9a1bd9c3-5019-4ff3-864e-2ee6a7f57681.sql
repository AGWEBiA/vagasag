
CREATE TABLE public.entrevistas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  candidatura_id UUID NOT NULL REFERENCES public.candidaturas(id) ON DELETE CASCADE,
  vaga_id UUID NOT NULL,
  titulo TEXT NOT NULL DEFAULT 'Entrevista',
  descricao TEXT,
  data_inicio TIMESTAMPTZ NOT NULL,
  data_fim TIMESTAMPTZ NOT NULL,
  fuso_horario TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
  modalidade TEXT NOT NULL DEFAULT 'online',
  local TEXT,
  link_video TEXT,
  entrevistador_id UUID,
  entrevistador_nome TEXT,
  entrevistador_email TEXT,
  status TEXT NOT NULL DEFAULT 'agendada',
  notas_pos_entrevista TEXT,
  ics_uid TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  enviar_email_convite BOOLEAN NOT NULL DEFAULT true,
  enviar_lembrete BOOLEAN NOT NULL DEFAULT false,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_entrevistas_candidatura ON public.entrevistas(candidatura_id);
CREATE INDEX idx_entrevistas_data_inicio ON public.entrevistas(data_inicio);
CREATE INDEX idx_entrevistas_status ON public.entrevistas(status);

ALTER TABLE public.entrevistas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated view entrevistas"
  ON public.entrevistas FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admin or vaga owner inserts entrevistas"
  ON public.entrevistas FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM vagas v
      WHERE v.id = entrevistas.vaga_id AND v.created_by = auth.uid()
    )
  );

CREATE POLICY "Admin or vaga owner updates entrevistas"
  ON public.entrevistas FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM vagas v
      WHERE v.id = entrevistas.vaga_id AND v.created_by = auth.uid()
    )
  );

CREATE POLICY "Admin or vaga owner deletes entrevistas"
  ON public.entrevistas FOR DELETE TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM vagas v
      WHERE v.id = entrevistas.vaga_id AND v.created_by = auth.uid()
    )
  );

CREATE TRIGGER trg_entrevistas_touch_updated_at
  BEFORE UPDATE ON public.entrevistas
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.validate_entrevista()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.modalidade NOT IN ('online','presencial','telefone') THEN
    RAISE EXCEPTION 'Invalid modalidade: %. Must be online, presencial or telefone.', NEW.modalidade;
  END IF;
  IF NEW.status NOT IN ('agendada','realizada','cancelada','remarcada','no_show') THEN
    RAISE EXCEPTION 'Invalid status: %. Must be agendada, realizada, cancelada, remarcada or no_show.', NEW.status;
  END IF;
  IF NEW.data_fim <= NEW.data_inicio THEN
    RAISE EXCEPTION 'data_fim must be after data_inicio';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_entrevistas_validate
  BEFORE INSERT OR UPDATE ON public.entrevistas
  FOR EACH ROW EXECUTE FUNCTION public.validate_entrevista();

CREATE OR REPLACE FUNCTION public.log_entrevista_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tipo TEXT;
  v_desc TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_tipo := 'entrevista_agendada';
    v_desc := 'Entrevista agendada para ' || to_char(NEW.data_inicio AT TIME ZONE NEW.fuso_horario, 'DD/MM/YYYY HH24:MI');
    INSERT INTO public.candidatura_eventos (candidatura_id, tipo, descricao, ator_id, dados)
    VALUES (NEW.candidatura_id, v_tipo, v_desc, NEW.created_by,
      jsonb_build_object('entrevista_id', NEW.id, 'data_inicio', NEW.data_inicio, 'modalidade', NEW.modalidade));
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      v_desc := 'Status: ' || OLD.status || ' → ' || NEW.status;
      INSERT INTO public.candidatura_eventos (candidatura_id, tipo, descricao, ator_id, dados)
      VALUES (NEW.candidatura_id, 'entrevista_status', v_desc, auth.uid(),
        jsonb_build_object('entrevista_id', NEW.id, 'status_novo', NEW.status));
    ELSIF NEW.data_inicio IS DISTINCT FROM OLD.data_inicio THEN
      v_desc := 'Entrevista remarcada para ' || to_char(NEW.data_inicio AT TIME ZONE NEW.fuso_horario, 'DD/MM/YYYY HH24:MI');
      INSERT INTO public.candidatura_eventos (candidatura_id, tipo, descricao, ator_id, dados)
      VALUES (NEW.candidatura_id, 'entrevista_remarcada', v_desc, auth.uid(),
        jsonb_build_object('entrevista_id', NEW.id, 'data_inicio', NEW.data_inicio));
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_entrevistas_log
  AFTER INSERT OR UPDATE ON public.entrevistas
  FOR EACH ROW EXECUTE FUNCTION public.log_entrevista_change();
