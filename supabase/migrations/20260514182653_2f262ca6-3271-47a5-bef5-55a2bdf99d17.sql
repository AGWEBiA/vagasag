CREATE OR REPLACE FUNCTION public.submit_candidatura_publica(
  p_vaga_id uuid,
  p_nome text,
  p_email text,
  p_telefone text DEFAULT NULL,
  p_linkedin text DEFAULT NULL,
  p_portfolio text DEFAULT NULL,
  p_dados_profissionais text DEFAULT NULL,
  p_informacoes_adicionais text DEFAULT NULL,
  p_respostas jsonb DEFAULT '{}'::jsonb
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
  v_key text;
  v_value jsonb;
  v_texto text;
  v_numero integer;
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

  IF jsonb_typeof(coalesce(p_respostas, '{}'::jsonb)) = 'object' THEN
    FOR v_key, v_value IN SELECT key, value FROM jsonb_each(p_respostas)
    LOOP
      IF EXISTS (
        SELECT 1
        FROM public.vaga_perguntas
        WHERE id = v_key::uuid
          AND vaga_id = p_vaga_id
      ) THEN
        v_texto := nullif(btrim(coalesce(v_value->>'texto', '')), '');
        v_numero := CASE
          WHEN v_value ? 'numero' AND (v_value->>'numero') ~ '^\d+$' THEN (v_value->>'numero')::integer
          ELSE NULL
        END;

        IF v_texto IS NOT NULL OR v_numero IS NOT NULL THEN
          INSERT INTO public.candidatura_respostas (
            candidatura_id,
            vaga_pergunta_id,
            resposta_texto,
            resposta_numero
          ) VALUES (
            v_candidatura_id,
            v_key::uuid,
            v_texto,
            v_numero
          );
        END IF;
      END IF;
    END LOOP;
  END IF;

  RETURN v_candidatura_id;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_candidatura_publica(uuid, text, text, text, text, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_candidatura_publica(uuid, text, text, text, text, text, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_candidatura_publica(uuid, text, text, text, text, text, text, text, jsonb) TO anon, authenticated;

INSERT INTO public.candidatura_respostas (
  candidatura_id,
  vaga_pergunta_id,
  resposta_texto,
  resposta_numero
)
SELECT
  c.id,
  r.key::uuid,
  nullif(btrim(coalesce(r.value->>'texto', '')), ''),
  CASE
    WHEN r.value ? 'numero' AND (r.value->>'numero') ~ '^\d+$' THEN (r.value->>'numero')::integer
    ELSE NULL
  END
FROM public.candidatura_logs l
JOIN public.candidaturas c
  ON c.vaga_id = l.vaga_id
 AND lower(c.email) = lower(l.payload->'form'->>'email')
 AND c.created_at BETWEEN l.created_at - interval '5 minutes' AND l.created_at + interval '5 minutes'
CROSS JOIN LATERAL jsonb_each(l.payload->'respostas') AS r(key, value)
JOIN public.vaga_perguntas vp
  ON vp.id = r.key::uuid
 AND vp.vaga_id = c.vaga_id
WHERE l.status = 'success'
  AND jsonb_typeof(l.payload->'respostas') = 'object'
  AND (nullif(btrim(coalesce(r.value->>'texto', '')), '') IS NOT NULL
    OR (r.value ? 'numero' AND (r.value->>'numero') ~ '^\d+$'))
  AND NOT EXISTS (
    SELECT 1
    FROM public.candidatura_respostas cr
    WHERE cr.candidatura_id = c.id
      AND cr.vaga_pergunta_id = r.key::uuid
  );