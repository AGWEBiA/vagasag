CREATE OR REPLACE FUNCTION public.submit_candidatura_publica(
  p_vaga_id uuid,
  p_nome text,
  p_email text,
  p_telefone text DEFAULT NULL,
  p_linkedin text DEFAULT NULL,
  p_portfolio text DEFAULT NULL,
  p_dados_profissionais text DEFAULT NULL,
  p_informacoes_adicionais text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_candidatura_id uuid;
  v_nome text := btrim(coalesce(p_nome, ''));
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_dados text := btrim(coalesce(p_dados_profissionais, ''));
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.vagas
    WHERE id = p_vaga_id
      AND status = 'aberta'
  ) THEN
    RAISE EXCEPTION 'Vaga não encontrada ou encerrada.' USING ERRCODE = 'P0001';
  END IF;

  IF char_length(v_nome) < 2 THEN
    RAISE EXCEPTION 'Informe seu nome.' USING ERRCODE = '22023';
  END IF;

  IF v_email !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' THEN
    RAISE EXCEPTION 'E-mail inválido.' USING ERRCODE = '22023';
  END IF;

  IF char_length(v_dados) < 80 THEN
    RAISE EXCEPTION 'Inclua pelo menos 80 caracteres descrevendo sua experiência.' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.candidaturas (
    vaga_id,
    nome,
    email,
    telefone,
    linkedin,
    portfolio,
    dados_profissionais,
    informacoes_adicionais
  ) VALUES (
    p_vaga_id,
    v_nome,
    v_email,
    nullif(btrim(coalesce(p_telefone, '')), ''),
    nullif(btrim(coalesce(p_linkedin, '')), ''),
    nullif(btrim(coalesce(p_portfolio, '')), ''),
    v_dados,
    nullif(btrim(coalesce(p_informacoes_adicionais, '')), '')
  )
  RETURNING id INTO v_candidatura_id;

  RETURN v_candidatura_id;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_candidatura_publica(uuid, text, text, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_candidatura_publica(uuid, text, text, text, text, text, text, text) TO anon, authenticated;