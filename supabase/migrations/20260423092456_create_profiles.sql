-- Tabela de perfis do aplicativo. Cada linha espelha 1:1 auth.users.
-- Guarda nome, papel (tecnico|gestor|admin) e flag de ativacao.

CREATE TABLE IF NOT EXISTS public.profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome       TEXT NOT NULL,
  perfil     TEXT NOT NULL CHECK (perfil IN ('tecnico', 'gestor', 'admin')) DEFAULT 'tecnico',
  ativo      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS profiles_nome_idx ON public.profiles (nome);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Helper: verifica se o caller e admin.
-- SECURITY DEFINER evita recursao em policies que consultam a propria tabela.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND perfil = 'admin' AND ativo = TRUE
  );
$$;

-- SELECT: qualquer usuario autenticado pode ler os perfis
DROP POLICY IF EXISTS profiles_select ON public.profiles;
CREATE POLICY profiles_select ON public.profiles
  FOR SELECT
  TO authenticated
  USING (TRUE);

-- INSERT: usuario pode inserir apenas o proprio perfil (self-signup)
-- e somente com perfil='tecnico' e ativo=false (admin ativa depois)
DROP POLICY IF EXISTS profiles_insert_self ON public.profiles;
CREATE POLICY profiles_insert_self ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    id = auth.uid()
    AND perfil = 'tecnico'
    AND ativo = FALSE
  );

-- UPDATE: admin pode atualizar qualquer perfil
DROP POLICY IF EXISTS profiles_update_admin ON public.profiles;
CREATE POLICY profiles_update_admin ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- DELETE: admin apenas
DROP POLICY IF EXISTS profiles_delete_admin ON public.profiles;
CREATE POLICY profiles_delete_admin ON public.profiles
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- Trigger para manter updated_at sincronizado
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_set_updated_at ON public.profiles;
CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
