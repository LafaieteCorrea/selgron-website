-- Promove lafaiete@selgron.com.br a admin ativo para permitir que ele
-- ative outros usuarios pela UI. Idempotente: se o email nao existir
-- em auth.users, nao faz nada.

UPDATE public.profiles
SET perfil = 'admin', ativo = TRUE
WHERE id = (SELECT id FROM auth.users WHERE email = 'lafaiete@selgron.com.br');
