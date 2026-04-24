-- Repromove lafaiete@selgron.com.br a admin ativo. A migration original
-- (20260423094438_promote_lafaiete_admin.sql) foi sobrescrita quando o
-- proprio lafaiete alterou seu perfil pela UI e perdeu o acesso de admin.
-- Idempotente: reaplica sem efeito se ja for admin ativo.

UPDATE public.profiles
SET perfil = 'admin', ativo = TRUE
WHERE id = (SELECT id FROM auth.users WHERE email = 'lafaiete@selgron.com.br');
