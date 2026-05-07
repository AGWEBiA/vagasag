-- Atribuir admin_master ao usuário principal
DO $$
DECLARE
    v_user_id UUID;
BEGIN
    SELECT id INTO v_user_id FROM auth.users WHERE lower(email) = 'agomes78@gmail.com';
    
    IF v_user_id IS NOT NULL THEN
        INSERT INTO public.user_roles (user_id, role)
        VALUES (v_user_id, 'admin_master')
        ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
END $$;

-- Atualizar trigger de novos usuários para incluir admin_master
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF lower(NEW.email) = 'agomes78@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
    
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin_master')
    ON CONFLICT (user_id, role) DO NOTHING;
    
    RETURN NEW;
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'colaborador')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$function$;