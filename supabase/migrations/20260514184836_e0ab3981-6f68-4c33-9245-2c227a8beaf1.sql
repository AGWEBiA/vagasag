DO $$
DECLARE
    r RECORD;
    v_candidatura_id UUID;
    v_key TEXT;
    v_value JSONB;
    v_texto TEXT;
    v_numero INTEGER;
BEGIN
    FOR r IN 
        SELECT 
            id as log_id,
            payload->'form'->>'email' as email,
            payload->'respostas' as respostas_json,
            vaga_id
        FROM public.candidatura_logs
        WHERE status = 'success'
          AND payload ? 'respostas'
          AND jsonb_typeof(payload->'respostas') = 'object'
          AND (payload->'respostas') != '{}'::jsonb
    LOOP
        -- Encontrar a candidatura correspondente pelo email e vaga
        -- Usamos vaga_id para ser mais preciso
        FOR v_candidatura_id IN 
            SELECT id FROM public.candidaturas 
            WHERE email = r.email 
              AND vaga_id = r.vaga_id 
        LOOP
            -- Iterar sobre as respostas no JSON do log
            FOR v_key, v_value IN SELECT * FROM jsonb_each(r.respostas_json)
            LOOP
                -- Verificar se a pergunta ainda existe (o ID pode ser um UUID válido)
                IF (v_key ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$') AND EXISTS (SELECT 1 FROM public.vaga_perguntas WHERE id = v_key::uuid) THEN
                    -- Verificar se já existe essa resposta para esta candidatura
                    IF NOT EXISTS (
                        SELECT 1 
                        FROM public.candidatura_respostas 
                        WHERE candidatura_id = v_candidatura_id 
                          AND vaga_pergunta_id = v_key::uuid
                    ) THEN
                        v_texto := nullif(btrim(coalesce(v_value->>'texto', '')), '');
                        v_numero := CASE
                            WHEN v_value ? 'numero' AND (v_value->>'numero') ~ '^-?\d+$' THEN (v_value->>'numero')::integer
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
                END IF;
            END LOOP;
        END LOOP;
    END LOOP;
END $$;