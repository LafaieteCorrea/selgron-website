-- Cria automaticamente o perfil em public.profiles sempre que um
-- auth.users eh inserido. Usa raw_user_meta_data para popular nome/perfil.
-- Tudo novo usuario comeca com ativo=FALSE (requer ativacao por admin).

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nome   TEXT;
  v_perfil TEXT;
BEGIN
  v_nome   := COALESCE(NULLIF(NEW.raw_user_meta_data->>'nome', ''), split_part(NEW.email, '@', 1));
  v_perfil := COALESCE(NULLIF(NEW.raw_user_meta_data->>'perfil', ''), 'tecnico');

  IF v_perfil NOT IN ('tecnico', 'gestor', 'admin') THEN
    v_perfil := 'tecnico';
  END IF;

  INSERT INTO public.profiles (id, nome, perfil, ativo)
  VALUES (NEW.id, v_nome, v_perfil, FALSE)
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS handle_new_user_trigger ON auth.users;
CREATE TRIGGER handle_new_user_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Backfill: cria profiles para auth.users que ainda nao tenham um
INSERT INTO public.profiles (id, nome, perfil, ativo)
SELECT
  u.id,
  COALESCE(NULLIF(u.raw_user_meta_data->>'nome', ''), split_part(u.email, '@', 1)),
  'tecnico',
  FALSE
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id);
