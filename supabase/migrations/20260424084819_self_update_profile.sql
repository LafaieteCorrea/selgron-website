-- Permite que o proprio usuario atualize o seu nome em public.profiles.
-- Nao pode trocar o perfil nem o flag ativo (continua so admin).

DROP POLICY IF EXISTS profiles_update_self ON public.profiles;
CREATE POLICY profiles_update_self ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    -- Impede auto-escalada: perfil e ativo so mudam por admin (outra policy)
    AND perfil = (SELECT perfil FROM public.profiles WHERE id = auth.uid())
    AND ativo  = (SELECT ativo  FROM public.profiles WHERE id = auth.uid())
  );
