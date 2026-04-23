-- Bloqueia inserção de usuários com email fora do domínio @selgron.com.br.
-- Trigger em auth.users garante que nem signUp client-side nem service_role
-- conseguem contornar a regra.

CREATE OR REPLACE FUNCTION public.enforce_email_domain()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email IS NULL OR NOT (lower(NEW.email) LIKE '%@selgron.com.br') THEN
    RAISE EXCEPTION 'Apenas emails @selgron.com.br sao permitidos.'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_email_domain_trigger ON auth.users;

CREATE TRIGGER enforce_email_domain_trigger
BEFORE INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.enforce_email_domain();
