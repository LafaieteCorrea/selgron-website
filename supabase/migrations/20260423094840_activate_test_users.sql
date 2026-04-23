-- Ativa os usuarios de teste tecnico@ e gestor@ e garante os perfis corretos.
-- Idempotente: so afeta se os auth.users existirem.

UPDATE public.profiles
SET perfil = 'tecnico', ativo = TRUE
WHERE id = (SELECT id FROM auth.users WHERE email = 'tecnico@selgron.com.br');

UPDATE public.profiles
SET perfil = 'gestor', ativo = TRUE
WHERE id = (SELECT id FROM auth.users WHERE email = 'gestor@selgron.com.br');
